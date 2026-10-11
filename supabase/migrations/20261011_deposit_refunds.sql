-- deposit_refunds — paying back a refundable deposit
-- =====================================================================
-- Deposits (₹1000 member, ₹500 casual) are taken on POS bills as lines whose
-- name contains "Deposit". Until now there was nowhere to record giving one
-- back. Each row here is one refund against one deposit line; a deposit can be
-- refunded in part (e.g. keeping back a damage charge).
-- Staff-only, like the rest of the money tables. Safe to run more than once.

create table if not exists public.deposit_refunds (
  id               uuid primary key default gen_random_uuid(),
  deposit_item_id  uuid not null references public.pos_transaction_items(id) on delete cascade,
  transaction_id   uuid references public.pos_transactions(id) on delete set null,
  member_id        uuid references public.members(id) on delete set null,
  amount           numeric(10,2) not null check (amount > 0),
  method           text not null default 'cash',
  note             text,
  refunded_at      timestamptz not null default now(),
  refunded_by      uuid references public.staff(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists deposit_refunds_item_idx   on public.deposit_refunds (deposit_item_id);
create index if not exists deposit_refunds_member_idx on public.deposit_refunds (member_id);

alter table public.deposit_refunds enable row level security;

drop policy if exists staff_all on public.deposit_refunds;
create policy staff_all on public.deposit_refunds
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Check: should return 0 rows and no error.
select count(*) as refunds_recorded from public.deposit_refunds;
