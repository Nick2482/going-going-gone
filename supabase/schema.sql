-- Going Going Gone: database schema
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to re-run on an empty project. Money is stored in pence.

-------------------------------------------------------------------------------
-- Profiles: one per signed-in person. Only the display name is public.
-------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  area text check (area is null or char_length(area) <= 60),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);

drop policy if exists "People edit their own profile" on public.profiles;
create policy "People edit their own profile" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  wanted text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  -- Never derive the public name from the email address.
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(wanted, 'Bidder ' || left(md5(new.id::text), 4)), 40))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-------------------------------------------------------------------------------
-- Lots
-------------------------------------------------------------------------------
create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  lot_no bigint generated always as identity,
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 3000),
  category text not null,
  location text check (location is null or char_length(location) <= 60),
  start_price_pence integer not null check (start_price_pence between 1 and 100000000),
  current_price_pence integer not null default 0,
  bid_count integer not null default 0,
  high_bidder_id uuid references public.profiles (id) on delete set null,
  cover_path text,
  status text not null default 'live' check (status in ('live', 'removed')),
  created_at timestamptz not null default now(),
  ends_at timestamptz not null
);

create index if not exists lots_ends_at_idx on public.lots (ends_at);
create index if not exists lots_seller_idx on public.lots (seller_id);

alter table public.lots enable row level security;

drop policy if exists "Lots are public" on public.lots;
create policy "Lots are public" on public.lots for select using (status = 'live' or seller_id = auth.uid());

drop policy if exists "Signed-in people list items" on public.lots;
create policy "Signed-in people list items" on public.lots for insert to authenticated
  with check (seller_id = auth.uid());

drop policy if exists "Sellers edit their own lots" on public.lots;
create policy "Sellers edit their own lots" on public.lots for update to authenticated
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());

-- Sellers may only change these columns directly. Prices, bids and end times
-- change only through the functions below.
revoke update on public.lots from anon, authenticated;
grant update (title, description, location, cover_path) on public.lots to authenticated;

-- New lots always start clean, whatever the browser sends.
create or replace function public.prepare_new_lot()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.seller_id := auth.uid();
  new.current_price_pence := new.start_price_pence;
  new.bid_count := 0;
  new.high_bidder_id := null;
  new.status := 'live';
  new.created_at := now();
  if new.ends_at < now() + interval '1 hour' or new.ends_at > now() + interval '14 days' then
    raise exception 'Auctions must run between 1 hour and 14 days.';
  end if;
  if new.category not in ('Antiques','Art','Baby & Kids','Books','Clothing','Collectables','Electronics',
      'Furniture','Garden & DIY','Home','Music','Sport & Leisure','Toys & Games','Vehicles & Parts','Other') then
    new.category := 'Other';
  end if;
  return new;
end $$;

drop trigger if exists prepare_new_lot on public.lots;
create trigger prepare_new_lot before insert on public.lots
  for each row execute function public.prepare_new_lot();

-------------------------------------------------------------------------------
-- Bids: readable by everyone, written only through place_bid().
-------------------------------------------------------------------------------
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  amount_pence integer not null,
  created_at timestamptz not null default now()
);

create index if not exists bids_lot_idx on public.bids (lot_id, amount_pence desc);
create index if not exists bids_bidder_idx on public.bids (bidder_id);

alter table public.bids enable row level security;

drop policy if exists "Bids are public" on public.bids;
create policy "Bids are public" on public.bids for select using (true);
-- No insert/update/delete policies: nobody writes bids directly.

-- Bid steps. Must match increment() in lib/format.js.
create or replace function public.bid_increment(p integer)
returns integer language sql immutable as $$
  select case
    when p < 2000 then 50
    when p < 10000 then 100
    when p < 50000 then 500
    when p < 100000 then 1000
    when p < 500000 then 2500
    else 5000 end
$$;

-- Place a bid. Checks everything on the server, one bid at a time per lot.
-- A bid in the last 2 minutes extends the auction to 2 minutes from now,
-- so nobody can win by sniping in the final second.
create or replace function public.place_bid(p_lot uuid, p_amount integer)
returns public.lots
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  l public.lots;
  minimum integer;
begin
  if me is null then raise exception 'Sign in to bid.'; end if;

  select * into l from public.lots where id = p_lot for update;
  if not found or l.status <> 'live' then raise exception 'This lot is no longer available.'; end if;
  if now() >= l.ends_at then raise exception 'This auction has ended.'; end if;
  if l.seller_id = me then raise exception 'You can''t bid on your own lot.'; end if;

  minimum := case when l.bid_count = 0 then l.start_price_pence
                  else l.current_price_pence + public.bid_increment(l.current_price_pence) end;
  if p_amount is null or p_amount < minimum then
    raise exception 'Your bid needs to be at least £%.', to_char(minimum / 100.0, 'FM999999990.00');
  end if;
  if p_amount > 100000000 then raise exception 'That bid is too high.'; end if;

  insert into public.bids (lot_id, bidder_id, amount_pence) values (p_lot, me, p_amount);

  update public.lots set
    current_price_pence = p_amount,
    high_bidder_id = me,
    bid_count = bid_count + 1,
    ends_at = greatest(ends_at, now() + interval '2 minutes')
  where id = p_lot
  returning * into l;

  return l;
end $$;

revoke all on function public.place_bid(uuid, integer) from public, anon;
grant execute on function public.place_bid(uuid, integer) to authenticated;

-- Seller ends their auction now. The current highest bidder wins.
create or replace function public.end_lot_now(p_lot uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.lots set ends_at = now()
  where id = p_lot and seller_id = auth.uid() and status = 'live' and ends_at > now();
  if not found then raise exception 'You can only end your own running auctions.'; end if;
end $$;

revoke all on function public.end_lot_now(uuid) from public, anon;
grant execute on function public.end_lot_now(uuid) to authenticated;

-- Seller withdraws a lot. Only allowed before anyone has bid.
create or replace function public.remove_lot(p_lot uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.lots set status = 'removed'
  where id = p_lot and seller_id = auth.uid() and bid_count = 0 and status = 'live';
  if not found then raise exception 'Lots can only be removed by their seller before anyone bids.'; end if;
end $$;

revoke all on function public.remove_lot(uuid) from public, anon;
grant execute on function public.remove_lot(uuid) to authenticated;

-- After an auction ends, the seller and the winner can see each other's email
-- so they can arrange payment and collection. Nobody else can.
create or replace function public.sale_contact(p_lot uuid)
returns table (role text, display_name text, email text)
language plpgsql security definer set search_path = '' as $$
declare
  l public.lots;
  me uuid := auth.uid();
  other uuid;
begin
  select * into l from public.lots where id = p_lot;
  if not found or me is null or l.ends_at > now() or l.high_bidder_id is null then return; end if;
  if me = l.seller_id then other := l.high_bidder_id;
  elsif me = l.high_bidder_id then other := l.seller_id;
  else return; end if;

  return query
    select case when other = l.seller_id then 'seller' else 'buyer' end,
           p.display_name, u.email::text
    from public.profiles p join auth.users u on u.id = p.id
    where p.id = other;
end $$;

revoke all on function public.sale_contact(uuid) from public, anon;
grant execute on function public.sale_contact(uuid) to authenticated;

-------------------------------------------------------------------------------
-- Photos
-------------------------------------------------------------------------------
create table if not exists public.lot_photos (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete cascade,
  path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lot_photos_lot_idx on public.lot_photos (lot_id, position);

alter table public.lot_photos enable row level security;

drop policy if exists "Photos are public" on public.lot_photos;
create policy "Photos are public" on public.lot_photos for select using (true);

drop policy if exists "Sellers add photos to their lots" on public.lot_photos;
create policy "Sellers add photos to their lots" on public.lot_photos for insert to authenticated
  with check (
    exists (select 1 from public.lots l where l.id = lot_id and l.seller_id = auth.uid())
    and path like auth.uid()::text || '/%'
    and (select count(*) from public.lot_photos p where p.lot_id = lot_photos.lot_id) < 6
  );

drop policy if exists "Sellers remove photos from their lots" on public.lot_photos;
create policy "Sellers remove photos from their lots" on public.lot_photos for delete to authenticated
  using (exists (select 1 from public.lots l where l.id = lot_id and l.seller_id = auth.uid()));

-- Storage bucket for photo files. Files go in a folder named after the uploader's id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lot-photos', 'lot-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "People upload into their own photo folder" on storage.objects;
create policy "People upload into their own photo folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'lot-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "People delete their own photo files" on storage.objects;
create policy "People delete their own photo files" on storage.objects for delete to authenticated
  using (bucket_id = 'lot-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-------------------------------------------------------------------------------
-- Reports: anyone signed in can flag a lot. Read them in the Table Editor.
-------------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default now(),
  unique (lot_id, reporter_id)
);

alter table public.reports enable row level security;

drop policy if exists "Signed-in people report lots" on public.reports;
create policy "Signed-in people report lots" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
-- No select policy: only you (the project owner) can read reports, in the dashboard.

-------------------------------------------------------------------------------
-- Live updates: pages hear new bids and price changes instantly.
-------------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.lots; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.bids; exception when duplicate_object then null; end;
end $$;
