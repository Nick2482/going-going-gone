-- Going Going Gone: Buy it now
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. Needs schema.sql and 002-reserve-prices.sql first.
--
-- A seller can add a Buy it now price when listing. Anyone can buy at that price
-- until the first bid is placed; after that it's a normal auction.

alter table public.lots add column if not exists buy_now_pence integer
  check (buy_now_pence is null or buy_now_pence between 1 and 100000000);
alter table public.lots add column if not exists bought_now boolean not null default false;

-- Check the Buy it now price when a lot is listed.
create or replace function public.check_new_buy_now()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.bought_now := false;
  if new.buy_now_pence is not null and new.buy_now_pence <= new.start_price_pence then
    raise exception 'The Buy it now price must be higher than the starting bid.';
  end if;
  return new;
end $$;

drop trigger if exists check_new_buy_now on public.lots;
create trigger check_new_buy_now before insert on public.lots
  for each row execute function public.check_new_buy_now();

-- A reserve can't be higher than the Buy it now price.
create or replace function public.check_reserve()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  l public.lots;
begin
  select * into l from public.lots where id = new.lot_id;
  if new.reserve_pence <= l.start_price_pence then
    raise exception 'The reserve must be higher than the starting bid.';
  end if;
  if l.buy_now_pence is not null and new.reserve_pence > l.buy_now_pence then
    raise exception 'The reserve can''t be higher than the Buy it now price.';
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

-- Buy a lot outright. Ends the auction straight away at the Buy it now price.
create or replace function public.buy_now(p_lot uuid)
returns public.lots
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  l public.lots;
begin
  if me is null then raise exception 'Sign in to buy.'; end if;

  select * into l from public.lots where id = p_lot for update;
  if not found or l.status <> 'live' then raise exception 'This lot is no longer available.'; end if;
  if now() >= l.ends_at then raise exception 'This auction has ended.'; end if;
  if l.seller_id = me then raise exception 'You can''t buy your own lot.'; end if;
  if l.buy_now_pence is null then raise exception 'This lot doesn''t have a Buy it now price.'; end if;
  if l.bid_count > 0 then raise exception 'Someone has already bid, so Buy it now is no longer available.'; end if;

  insert into public.bids (lot_id, bidder_id, amount_pence) values (p_lot, me, l.buy_now_pence);

  update public.lots set
    current_price_pence = l.buy_now_pence,
    high_bidder_id = me,
    bid_count = bid_count + 1,
    bought_now = true,
    ends_at = now(),
    reserve_status = case when reserve_status = 'none' then 'none' else 'met' end
  where id = p_lot
  returning * into l;

  return l;
end $$;

revoke all on function public.buy_now(uuid) from public, anon;
grant execute on function public.buy_now(uuid) to authenticated;
