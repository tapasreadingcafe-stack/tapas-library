-- =====================================================================
-- GST billing — foundation.
--
-- Three things a tax invoice needs that this system did not have:
--   1. Who is supplying (GSTIN, legal name, registered address).
--   2. A serial number that is unique, consecutive, and PERMANENT.
--   3. The tax itself, stored per line so returns can be filed per slab.
--
-- Safety contract:
--   * Idempotent and purely additive. Nothing existing is altered or dropped.
--   * Every tax column defaults to 0/NULL, so bills written before GST is
--     switched on stay exactly as they are.
--   * `enabled` defaults to OFF. Running this changes no bill until you turn
--     GST on in Accounts → GST Settings AND save a valid GSTIN.
--   * Section 0 repairs a pre-existing trigger fault that made the first run of
--     this script fail with: record "new" has no field "updated_at".
--   * Section 3 backfills invoice numbers for existing bills using the SAME
--     date-wise sequence already shown on screen (INV-YYYYMMDD-NNN), so no
--     number visible today changes.
-- =====================================================================

-- 0. Repair the updated_at trigger ------------------------------------------
-- 20260628_professional_hardening.sql attached touch_updated_at() — which
-- sets NEW.updated_at — to five tables without checking each one HAD that
-- column. pos_transactions and pos_transaction_items don't, so ANY update to a
-- bill fails with `record "new" has no field "updated_at"`. The invoice-number
-- backfill in section 3 is an update, which is how this surfaced; it also
-- broke storing an invoice number at checkout.
--
-- Add the column wherever the trigger needs it. Each table is checked first,
-- so one that doesn't exist here can't abort the rest of the script, and
-- `if not exists` makes it a no-op on tables that already have it.
do $$
declare t text;
begin
  foreach t in array array[
    'pos_transactions', 'pos_transaction_items', 'book_copies', 'circulation', 'reservations'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);
    end if;
  end loop;
end $$;

-- 1. Business identity + GST settings -------------------------------------
-- One row. Kept in the database, not localStorage: rates in a browser are
-- per-device, so two tills could bill at different rates and neither would
-- match the return.
create table if not exists public.gst_settings (
  id                smallint primary key default 1 check (id = 1),
  enabled           boolean not null default false,   -- master switch
  legal_name        text,
  trade_name        text,
  gstin             text,
  address_line1     text,
  address_line2     text,
  city              text,
  state             text,
  state_code        text,                              -- e.g. '29' Karnataka
  pincode           text,
  place_of_supply   text,
  invoice_prefix    text not null default 'INV',
  -- Per stream: whether GST is charged at all, the rate, the HSN/SAC code, and
  -- whether prices already include the tax (inclusive) or have it added at the
  -- till (exclusive). Keys match revenueStreams.js. Defaults charge only the
  -- cafe, exclusively — so switching GST on changes cafe bills and nothing else
  -- until each other stream is deliberately turned on.
  rates             jsonb not null default
    '{"cafe":      {"enabled":true,  "rate":5,  "inclusive":false, "hsn":"996331"},
      "library":   {"enabled":false, "rate":0,  "inclusive":true,  "hsn":"4901"},
      "membership":{"enabled":false, "rate":18, "inclusive":true,  "hsn":"999723"},
      "fines":     {"enabled":false, "rate":18, "inclusive":true,  "hsn":"999799"},
      "events":    {"enabled":false, "rate":18, "inclusive":true,  "hsn":"999293"}}'::jsonb,
  updated_at        timestamptz not null default now()
);

insert into public.gst_settings (id) values (1) on conflict (id) do nothing;

alter table public.gst_settings enable row level security;
drop policy if exists "gst_settings_read" on public.gst_settings;
create policy "gst_settings_read" on public.gst_settings
  for select using (true);            -- the storefront needs the rates to quote
drop policy if exists "gst_settings_write_staff" on public.gst_settings;
create policy "gst_settings_write_staff" on public.gst_settings
  for all using (auth.role() in ('authenticated','service_role'))
  with check (auth.role() in ('authenticated','service_role'));

comment on table public.gst_settings is
  'Single-row GST configuration. `enabled` off means bills print as plain receipts.';

-- 2. Tax on the bill ------------------------------------------------------
alter table public.pos_transactions
  add column if not exists invoice_no     text,
  add column if not exists taxable_value  numeric not null default 0,
  add column if not exists cgst_amount    numeric not null default 0,
  add column if not exists sgst_amount    numeric not null default 0,
  add column if not exists igst_amount    numeric not null default 0,
  add column if not exists exempt_value   numeric not null default 0,
  add column if not exists round_off      numeric not null default 0,
  add column if not exists place_of_supply text,
  add column if not exists customer_gstin text;

alter table public.pos_transaction_items
  add column if not exists hsn_code      text,
  add column if not exists gst_rate      numeric,
  add column if not exists taxable_value numeric,
  add column if not exists cgst_amount   numeric,
  add column if not exists sgst_amount   numeric,
  add column if not exists igst_amount   numeric,
  add column if not exists is_exempt     boolean not null default false;

alter table public.event_registrations
  add column if not exists invoice_no    text,
  add column if not exists gst_rate      numeric,
  add column if not exists taxable_value numeric,
  add column if not exists cgst_amount   numeric,
  add column if not exists sgst_amount   numeric;

comment on column public.pos_transactions.invoice_no is
  'Permanent serial (Rule 46). Assigned once at checkout and never recomputed.';
comment on column public.pos_transactions.total_amount is
  'What the customer paid, INCLUDING any GST and round-off. Revenue figures must subtract cgst/sgst/igst_amount and round_off.';

-- 3. Invoice numbers: permanent, and matching what is already on screen ----
-- Today the number is DERIVED from a bill's position within its day, so
-- deleting a same-day bill silently renumbers the ones after it. Rule 46 wants
-- a serial that cannot change once issued. The backfill below reproduces the
-- exact numbers currently displayed, so nothing appears to move.
update public.pos_transactions t
set invoice_no = s.no
from (
  select id,
         'INV-' || to_char(created_at at time zone 'Asia/Kolkata', 'YYYYMMDD') || '-' ||
         lpad(row_number() over (
           partition by (created_at at time zone 'Asia/Kolkata')::date
           order by created_at, id
         )::text, 3, '0') as no
  from public.pos_transactions
) s
where t.id = s.id and t.invoice_no is null;

-- Unique from here on, so two tills can never issue the same serial. Partial,
-- so rows that somehow lack one do not block the index.
create unique index if not exists pos_transactions_invoice_no_key
  on public.pos_transactions (invoice_no) where invoice_no is not null;
