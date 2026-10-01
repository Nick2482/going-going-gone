-- Going Going Gone: email alerts
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. Needs schema.sql, 002-reserve-prices.sql and 004-buy-it-now.sql first.
--
-- Emails are sent straight from the database through Resend:
--   * "You've been outbid"         to the previous highest bidder
--   * "Your lot has its first bid" to the seller (once per lot)
--   * "You won"                    to the winner, with the seller's email
--   * "Sold" / "Didn't sell"       to the seller, with the buyer's email if sold
-- People can switch alerts off in My account.
--
-- AFTER running this file, store your Resend API key by running (with your key):
--   select public.set_resend_key('re_your_key_here');

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-------------------------------------------------------------------------------
-- Settings
-------------------------------------------------------------------------------
alter table public.profiles add column if not exists email_alerts boolean not null default true;
alter table public.lots add column if not exists ended_notified_at timestamptz;
alter table public.lots add column if not exists first_bid_notified boolean not null default false;

-- Lots that already ended before alerts existed are treated as already handled.
update public.lots set ended_notified_at = now()
where ended_notified_at is null and ends_at <= now();

create or replace function public.gg_site_url() returns text language sql immutable as $$
  select 'https://www.going-going-gone.uk'
$$;

-- Keep the Resend key in Supabase Vault (encrypted). Only the database owner can call this.
create or replace function public.set_resend_key(p_key text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  existing uuid;
begin
  if p_key is null or p_key not like 're\_%' then
    raise exception 'That does not look like a Resend API key. It should start with re_';
  end if;
  select id into existing from vault.secrets where name = 'resend_api_key';
  if existing is null then
    perform vault.create_secret(p_key, 'resend_api_key', 'Used by Going Going Gone email alerts');
  else
    perform vault.update_secret(existing, p_key);
  end if;
  return 'Saved. Email alerts are on.';
end $$;

revoke all on function public.set_resend_key(text) from public, anon, authenticated;

-------------------------------------------------------------------------------
-- Building and sending emails
-------------------------------------------------------------------------------
create or replace function public.gg_escape(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;')
$$;

create or replace function public.gg_money(p integer) returns text language sql immutable as $$
  select '£' || to_char(p / 100.0, 'FM999,999,990.00')
$$;

-- A simple branded email. body_html must already be escaped.
create or replace function public.gg_email_html(heading text, body_html text, button_text text, button_url text)
returns text language sql immutable as $$
  select
    '<div style="background:#f3f4f1;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#16213a">'
    || '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e5ea">'
    || '<div style="background:#16213a;padding:16px 24px;font-weight:bold;font-size:18px;letter-spacing:1px">'
    || '<span style="color:#7e89a3">GOING</span> <span style="color:#c3cadb">GOING</span> <span style="color:#e3a649">GONE</span></div>'
    || '<div style="padding:24px">'
    || '<h1 style="font-size:22px;margin:0 0 12px">' || public.gg_escape(heading) || '</h1>'
    || '<div style="font-size:15px;line-height:1.55;color:#3a4560">' || body_html || '</div>'
    || '<p style="margin:24px 0 8px"><a href="' || button_url || '" style="display:inline-block;background:#9e5f0d;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">'
    || public.gg_escape(button_text) || '</a></p>'
    || '</div>'
    || '<div style="padding:14px 24px;border-top:1px solid #e2e5ea;font-size:12px;color:#667085">'
    || 'Local auctions in Market Bosworth. Don''t want these emails? Turn off alerts in '
    || '<a href="' || public.gg_site_url() || '/account" style="color:#667085">My account</a>.</div>'
    || '</div></div>'
$$;

-- Queue one email through Resend. Sent when the surrounding transaction commits.
-- Does nothing if the person has switched alerts off or no key is stored yet.
create or replace function public.gg_send(p_user uuid, p_subject text, p_html text, p_reply_to text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  api_key text;
  to_email text;
  wants boolean;
  payload jsonb;
begin
  select u.email, coalesce(p.email_alerts, true) into to_email, wants
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = p_user;
  if to_email is null or not wants then return; end if;

  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key';
  if api_key is null then return; end if;

  payload := jsonb_build_object(
    'from', 'Going Going Gone <alerts@going-going-gone.uk>',
    'to', jsonb_build_array(to_email),
    'subject', p_subject,
    'html', p_html
  );
  if p_reply_to is not null then payload := payload || jsonb_build_object('reply_to', p_reply_to); end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
    timeout_milliseconds := 5000
  );
end $$;

revoke all on function public.gg_send(uuid, text, text, text) from public, anon, authenticated;

-------------------------------------------------------------------------------
-- When a bid is placed: outbid alert + seller's first-bid alert
-------------------------------------------------------------------------------
create or replace function public.gg_on_bid()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  l public.lots;
  link text;
begin
  -- place_bid inserts the bid before updating the lot, so l still shows the previous leader.
  select * into l from public.lots where id = new.lot_id;
  link := public.gg_site_url() || '/lot/' || l.id;

  if l.high_bidder_id is not null and l.high_bidder_id <> new.bidder_id then
    perform public.gg_send(
      l.high_bidder_id,
      'You''ve been outbid: ' || l.title,
      public.gg_email_html(
        'You''ve been outbid',
        '<p>Someone has bid <strong>' || public.gg_money(new.amount_pence) || '</strong> on <strong>'
          || public.gg_escape(l.title) || '</strong>. Your bid was ' || public.gg_money(l.current_price_pence) || '.</p>'
          || '<p>Bidding closes ' || to_char(l.ends_at at time zone 'Europe/London', 'FMDay DD Mon "at" HH24:MI') || '.</p>',
        'Bid again', link));
  end if;

  -- Skip the first-bid email for a Buy it now purchase; the "sold" email follows within a minute.
  if not l.first_bid_notified
     and not (l.bid_count = 0 and l.buy_now_pence is not null and new.amount_pence = l.buy_now_pence) then
    update public.lots set first_bid_notified = true where id = l.id;
    perform public.gg_send(
      l.seller_id,
      'First bid on ' || l.title,
      public.gg_email_html(
        'Your lot has its first bid',
        '<p><strong>' || public.gg_escape(l.title) || '</strong> has a bid of <strong>' || public.gg_money(new.amount_pence) || '</strong>.</p>'
          || '<p>We''ll email you again when the auction ends.</p>',
        'View your lot', link));
  end if;
  return new;
end $$;

drop trigger if exists gg_on_bid on public.bids;
create trigger gg_on_bid after insert on public.bids
  for each row execute function public.gg_on_bid();

-------------------------------------------------------------------------------
-- Every minute: tell winners and sellers about auctions that have just ended
-------------------------------------------------------------------------------
create or replace function public.gg_notify_ended_lots()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  l public.lots;
  link text;
  seller_email text;
  buyer_email text;
  buyer_name text;
  seller_name text;
  n integer := 0;
begin
  for l in
    update public.lots set ended_notified_at = now()
    where ended_notified_at is null and ends_at <= now() and status = 'live'
    returning *
  loop
    n := n + 1;
    link := public.gg_site_url() || '/lot/' || l.id;
    select email into seller_email from auth.users where id = l.seller_id;
    select display_name into seller_name from public.profiles where id = l.seller_id;

    if l.bid_count > 0 and l.high_bidder_id is not null and l.reserve_status <> 'not_met' then
      select email into buyer_email from auth.users where id = l.high_bidder_id;
      select display_name into buyer_name from public.profiles where id = l.high_bidder_id;

      perform public.gg_send(
        l.high_bidder_id,
        (case when l.bought_now then 'You bought ' else 'You won ' end) || l.title,
        public.gg_email_html(
          case when l.bought_now then 'It''s yours!' else 'Going, going, gone. You won!' end,
          '<p>You ' || case when l.bought_now then 'bought' else 'won' end || ' <strong>' || public.gg_escape(l.title) || '</strong> for <strong>' || public.gg_money(l.current_price_pence) || '</strong>.</p>'
            || '<p>Get in touch with the seller, <strong>' || public.gg_escape(seller_name) || '</strong>, to arrange payment and collection: '
            || '<a href="mailto:' || public.gg_escape(seller_email) || '">' || public.gg_escape(seller_email) || '</a>. You can also just reply to this email.</p>'
            || '<p style="font-size:13px;color:#667085">Meet somewhere public, check the item before paying, and never pay by bank transfer to someone you haven''t met.</p>',
          'View the lot', link),
        seller_email);

      perform public.gg_send(
        l.seller_id,
        'Sold: ' || l.title,
        public.gg_email_html(
          'Your item sold',
          '<p><strong>' || public.gg_escape(l.title) || '</strong> sold for <strong>' || public.gg_money(l.current_price_pence) || '</strong>.</p>'
            || '<p>The buyer is <strong>' || public.gg_escape(buyer_name) || '</strong>. Contact them to arrange payment and collection: '
            || '<a href="mailto:' || public.gg_escape(buyer_email) || '">' || public.gg_escape(buyer_email) || '</a>. You can also just reply to this email.</p>',
          'View the lot', link),
        buyer_email);

    elsif l.bid_count > 0 then
      perform public.gg_send(
        l.seller_id,
        'Reserve not met: ' || l.title,
        public.gg_email_html(
          'Your item didn''t reach its reserve',
          '<p>Bidding on <strong>' || public.gg_escape(l.title) || '</strong> ended at <strong>' || public.gg_money(l.current_price_pence)
            || '</strong>, below your reserve, so it didn''t sell.</p><p>You could list it again with a lower reserve.</p>',
          'List something', public.gg_site_url() || '/sell'));

    else
      perform public.gg_send(
        l.seller_id,
        'No bids: ' || l.title,
        public.gg_email_html(
          'Your auction ended without bids',
          '<p><strong>' || public.gg_escape(l.title) || '</strong> closed without any bids.</p>'
            || '<p>Relisting with a lower starting price or clearer photos often helps.</p>',
          'List it again', public.gg_site_url() || '/sell'));
    end if;
  end loop;
  return n;
end $$;

revoke all on function public.gg_notify_ended_lots() from public, anon, authenticated;

select cron.schedule('gg-ended-lot-emails', '* * * * *', $$select public.gg_notify_ended_lots()$$);
