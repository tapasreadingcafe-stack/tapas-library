-- =====================================================================
-- Expense verticals — which side of the business a cost belongs to.
--
-- Revenue already splits into cafe and library per bill line. Expenses could
-- not: the single expense table (named cafe_expenses, but it is the ledger for
-- every cost) carried no field saying whether the milk or the book stock was
-- being paid for. Without that, a separate cafe P&L and library P&L are not
-- possible — revenue splits, profit doesn't.
--
--   cafe     — only the cafe uses it (ingredients, coffee machine service)
--   library  — only the library uses it (book stock, barcode labels)
--   shared   — both use it (rent, electricity, internet, most salaries);
--              divided by the split percentage set on the P&L page
--
-- Safety contract: idempotent, purely additive. Existing rows become 'shared',
-- which is the one value that never misattributes a cost to the wrong side.
-- The split percentage itself lives in app_settings under 'accounts_split' and
-- needs no schema change.
-- =====================================================================

alter table public.cafe_expenses
  add column if not exists vertical text not null default 'shared';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cafe_expenses_vertical_check'
  ) then
    alter table public.cafe_expenses
      add constraint cafe_expenses_vertical_check
      check (vertical in ('cafe', 'library', 'shared'));
  end if;
end $$;

comment on column public.cafe_expenses.vertical is
  'cafe | library | shared. Shared costs are divided by app_settings.accounts_split.cafe_pct.';
