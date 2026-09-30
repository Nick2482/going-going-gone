-- Going Going Gone: reserve prices
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. Needs schema.sql to have been run first.
--
-- The reserve amount lives in its own table that only the seller can read.
-- Everyone else only sees lots.reserve_status: 'none', 'not_met' or 'met'.

alter table public.lots
  add column if not exists reserve_status text not null default 'none'
  check (reserve_status in ('none', 'not_met', 'met'));

create table if not exists public.lot_reserves (
  lot_id uuid primary key references public.lots (id) on delete cascade,
  reserve_pence integer not null check (reserve_pence between 1 and 100000000)
);

alter table public.lot_reserves enable row level security;

drop policy if exists "Sellers see their own reserves" on public.lot_reserves;
create policy "Sellers see their own reserves" on public.lot_reserves for select to authenticated
  using (exists (select 1 from public.lots l where l.id = lot_id and l.seller_id = auth.uid()));

drop policy if exists "Sellers set a reserve before bidding starts" on public.lot_reserves;
create policy "Sellers set a reserve before bidding starts" on public.lot_reserves for insert to authenticated
  with check (exists (select 1 from public.lots l
    where l.id = lot_id and l.seller_id = auth.uid() and l.bid_count = 0 and l.status = 'live' and l.ends_at > now()));

drop policy if exists "Sellers change their own reserves" on public.lot_reserves;
create policy "Sellers change their own reserves" on public.lot_reserves for update to authenticated
  using (exists (select 1 from public.lots l where l.id = lot_id and l.seller_id = auth.uid() and l.status = 'live' and l.ends_at > now()))
  with check (exists (select 1 from public.lots l where l.id = lot_id and l.seller_id = auth.uid()));

drop policy if exists "Sellers remove their own reserves" on public.lot_reserves;
create policy "Sellers remove their own reserves" on public.lot_reserves for delete to authenticated
  using (exists (select 1 from public.lots l where l.id = lot_id and l.seller_id = auth.uid() and l.status = 'live' and l.ends_at > now()));

-- Rules for reserves, and keep lots.reserve_status in step.
create or replace function public.check_reserve()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  l public.lots;
begin
  select * into l from public.lots where id = new.lot_id;
  if new.reserve_pence <= l.start_price_pence then
    raise exception 'The reserve must be higher than the starting bid.';
  end if;
  -- Once bidding has started a reserve can only be lowered, never raised.
  if tg_op = 'UPDATE' and l.bid_count > 0 and new.reserve_pence > old.reserve_pence then
    raise exception 'Once bidding has started, you can only lower the reserve.';
  end if;
  update public.lots set reserve_status =
    case when l.bid_count > 0 and l.current_price_pence >= new.reserve_pence then 'met' else 'not_met' end
  where id = new.lot_id;
  return new;
end $$;

drop trigger if exists check_reserve on public.lot_reserves;
create trigger check_reserve before insert or update on public.lot_reserves
  for each row execute function public.check_reserve();

create or replace function public.reserve_removed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.lots set reserve_status = 'none' where id = old.lot_id;
  return old;
end $$;

drop trigger if exists reserve_removed on public.lot_reserves;
create trigger reserve_removed after delete on public.lot_reserves
  for each row execute function public.reserve_removed();

-- New lots always start with no reserve; the seller adds one straight after.
create or replace function public.prepare_new_lot()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.seller_id := auth.uid();
  new.current_price_pence := new.start_price_pence;
  new.bid_count := 0;
  new.high_bidder_id := null;
  new.status := 'live';
  new.reserve_status := 'none';
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

-- Placing a bid now also updates whether the reserve is met.
create or replace function public.place_bid(p_lot uuid, p_amount integer)
returns public.lots
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  l public.lots;
  minimum integer;
  reserve integer;
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

  select reserve_pence into reserve from public.lot_reserves where lot_id = p_lot;

  insert into public.bids (lot_id, bidder_id, amount_pence) values (p_lot, me, p_amount);

  update public.lots set
    current_price_pence = p_amount,
    high_bidder_id = me,
    bid_count = bid_count + 1,
    ends_at = greatest(ends_at, now() + interval '2 minutes'),
    reserve_status = case when reserve is null then 'none'
                          when p_amount >= reserve then 'met' else 'not_met' end
  where id = p_lot
  returning * into l;

  return l;
end $$;

revoke all on function public.place_bid(uuid, integer) from public, anon;
grant execute on function public.place_bid(uuid, integer) to authenticated;

-- Contact details are only shared when the lot actually sold (reserve met or no reserve).
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
  if l.reserve_status = 'not_met' then return; end if;
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
