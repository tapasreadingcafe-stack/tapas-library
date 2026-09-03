-- =====================================================================
-- Event ticket tiers — several named price options per event.
--
-- Until now an event had one `ticket_price`, so anything else had to be
-- written into the payment instruction by hand (the Gracious Ganesha event
-- literally reads "Pay Rs 500 - parent + child"). This makes those options
-- real: each has a label and a price, the register form lets someone pick
-- one, and the registration records which they chose.
--
-- Safety contract:
--   * Idempotent and purely additive — no existing column is altered.
--   * An event with no tiers behaves exactly as it does today, billing at
--     `ticket_price`. Nothing has to be migrated.
-- =====================================================================

-- 1. The options themselves -------------------------------------------
-- Shape: [{"label": "Parent + Child", "price": 500}, ...]
-- Kept as JSONB rather than a child table: this is a short, ordered list
-- that is always read with its event and never queried across events.
alter table public.events
  add column if not exists ticket_tiers jsonb not null default '[]'::jsonb;

comment on column public.events.ticket_tiers is
  'Named price options, e.g. [{"label":"Adult","price":300}]. Empty = single ticket_price.';

-- 2. What the registrant actually chose --------------------------------
alter table public.event_registrations
  add column if not exists ticket_tier       text,
  add column if not exists ticket_unit_price numeric;

comment on column public.event_registrations.ticket_tier is
  'Label of the chosen ticket option. Null for single-price events.';
comment on column public.event_registrations.ticket_unit_price is
  'Price per ticket AT THE TIME OF BOOKING. Stored rather than looked up so
   that editing a tier later cannot silently restate what an old booking owed.';
