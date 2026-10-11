-- Stationery inventory
-- =====================================================================
-- Pens, notebooks and the like sold at the library counter. Until now they
-- were two fixed POS buttons ("Stationery ₹10", "Notebook ₹40") with no stock.
--
--   stationery_items        — what we sell, its price, and how many are left
--   stationery_stock_moves  — every change to that count: restock, sale,
--                             correction — so the number can always be explained
--   stationery_move()       — the one way stock changes: updates the count and
--                             writes the history row in a single step, so two
--                             tills selling at once can't lose a sale
--
-- Staff-only like the other inventory tables. Safe to run more than once.

create table if not exists public.stationery_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  emoji         text default '🖊️',
  category      text default 'Other',
  price         numeric(10,2) not null default 0 check (price >= 0),
  cost_price    numeric(10,2) check (cost_price >= 0),
  stock         integer not null default 0,
  low_stock_at  integer not null default 5,
  barcode       text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.stationery_stock_moves (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.stationery_items(id) on delete cascade,
  change      integer not null,          -- +restock, -sale, ± correction
  stock_after integer not null,
  reason      text not null check (reason in ('opening', 'restock', 'sale', 'correction', 'return')),
  unit_cost   numeric(10,2),
  bill_id     uuid references public.pos_transactions(id) on delete set null,
  note        text,
  staff_id    uuid references public.staff(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists stationery_moves_item_idx on public.stationery_stock_moves (item_id, created_at desc);

alter table public.stationery_items       enable row level security;
alter table public.stationery_stock_moves enable row level security;

drop policy if exists staff_all on public.stationery_items;
create policy staff_all on public.stationery_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_all on public.stationery_stock_moves;
create policy staff_all on public.stationery_stock_moves
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Change stock and record why, atomically. Returns the new count.
create or replace function public.stationery_move(
  p_item_id   uuid,
  p_change    integer,
  p_reason    text,
  p_bill_id   uuid default null,
  p_note      text default null,
  p_unit_cost numeric default null
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_after integer;
  v_staff uuid;
begin
  update public.stationery_items
  set    stock = stock + p_change, updated_at = now()
  where  id = p_item_id
  returning stock into v_after;
  if v_after is null then
    raise exception 'Stationery item not found';
  end if;

  select id into v_staff from public.staff where email = auth.email() limit 1;

  insert into public.stationery_stock_moves (item_id, change, stock_after, reason, unit_cost, bill_id, note, staff_id)
  values (p_item_id, p_change, v_after, p_reason, p_unit_cost, p_bill_id, p_note, v_staff);

  if p_reason = 'restock' and p_unit_cost is not null then
    update public.stationery_items set cost_price = p_unit_cost where id = p_item_id;
  end if;

  return v_after;
end;
$$;

grant execute on function public.stationery_move(uuid, integer, text, uuid, text, numeric) to authenticated;

-- Check: both tables exist and are empty.
select (select count(*) from public.stationery_items) as items,
       (select count(*) from public.stationery_stock_moves) as moves;
