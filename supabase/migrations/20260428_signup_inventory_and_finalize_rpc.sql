-- ============================================================================
-- 20260428_signup_inventory_and_finalize_rpc.sql
--
-- Three small additions:
--
-- 1. handle_new_customer_user() now reads name + phone from
--    auth.users.raw_user_meta_data so the storefront sign-up form's
--    captured fields (full name, phone, preferred club) land in the
--    members row instead of being dropped on the floor. Falls back to
--    the email's local part when the metadata is absent (preserves
--    existing seeded users + any signups that go through other paths).
--
-- 2. cafe_inventory table — referenced by src/pages/CafePOS.js for
--    per-item stock deduction but never created in any migration. The
--    POS page now surfaces missing-table errors via toast (see
--    20260428_is_staff_fn_and_books_rls_lockdown commit), so failures
--    are visible, but the table itself still needs to exist.
--
-- 3. finalize_order_extras() RPC — wraps the three writes that the
--    edge function `_shared/order-extras.ts` does after marking an
--    order paid (promo redemption insert, points debit, cart snapshot
--    completion). Doing them in one SECURITY DEFINER function makes
--    the whole step atomic per-call (a single failed step rolls back
--    the rest), so an order can't end up paid with discounts logged
--    but points not debited (or vice versa).
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────
-- 1. handle_new_customer_user — read raw_user_meta_data
-- ──────────────────────────────────────────────────────────────────
create or replace function public.handle_new_customer_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_existing_id uuid;
    v_name        text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
    v_phone       text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
begin
    select id into v_existing_id
      from public.members
     where lower(email) = lower(new.email)
       and auth_user_id is null
     limit 1;

    if v_existing_id is not null then
        update public.members
           set auth_user_id = new.id,
               name  = coalesce(v_name, name),
               phone = coalesce(v_phone, phone)
         where id = v_existing_id;
    else
        insert into public.members (
            auth_user_id, email, name, phone, customer_type, status
        ) values (
            new.id,
            new.email,
            coalesce(v_name, split_part(new.email, '@', 1)),
            v_phone,
            'online',
            'active'
        )
        on conflict (auth_user_id) do nothing;
    end if;

    return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────────
-- 2. cafe_inventory table
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.cafe_inventory (
    id              uuid        primary key default gen_random_uuid(),
    item_name       text        not null,
    unit            text        default 'units',
    current_stock   numeric(10,2) not null default 0,
    min_stock_level numeric(10,2) not null default 0,
    cost_per_unit   numeric(10,2),
    last_restocked  timestamptz,
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Case-insensitive uniqueness so the POS lookup-by-name (`ilike`) maps
-- 1:1 to a single inventory row.
create unique index if not exists idx_cafe_inventory_item_name_ci
    on public.cafe_inventory (lower(item_name));

create index if not exists idx_cafe_inventory_low_stock
    on public.cafe_inventory (current_stock)
    where current_stock <= min_stock_level;

alter table public.cafe_inventory enable row level security;

drop policy if exists cafe_inventory_staff_only on public.cafe_inventory;
create policy cafe_inventory_staff_only on public.cafe_inventory
    for all
    using      (public.is_staff())
    with check (public.is_staff());

-- ──────────────────────────────────────────────────────────────────
-- 3. finalize_order_extras() — atomic post-payment finalization
-- ──────────────────────────────────────────────────────────────────
-- Replaces the three sequential writes in _shared/order-extras.ts with
-- a single SECURITY DEFINER function. Either everything lands or
-- nothing does (transactional unit per RPC call).
--
-- Inputs mirror the existing finalizeExtrasForOrder() args; the
-- promo discount amount is derived (applied.discount - points) so
-- callers don't have to recompute it.
create or replace function public.finalize_order_extras(
    p_order_id        uuid,
    p_member_id       uuid,
    p_promo_code_id   uuid,
    p_promo_discount  numeric,
    p_points_redeemed int,
    p_snapshot_id     uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if p_promo_code_id is not null then
        insert into public.store_promo_redemptions (
            promo_code_id, order_id, member_id, discount_amount
        ) values (
            p_promo_code_id, p_order_id, p_member_id, coalesce(p_promo_discount, 0)
        )
        on conflict (order_id) do nothing;
    end if;

    if coalesce(p_points_redeemed, 0) > 0 then
        -- grant_loyalty_points already debits the balance + writes a
        -- transactions row; we just call it with a negative amount.
        perform public.grant_loyalty_points(
            p_member_id     := p_member_id,
            p_points        := -p_points_redeemed,
            p_reason        := 'Redeemed at checkout',
            p_order_id      := p_order_id,
            p_kind          := 'redeem',
            p_referral_id   := null
        );
    end if;

    if p_snapshot_id is not null then
        update public.cart_snapshots
           set completed_order_id = p_order_id
         where id = p_snapshot_id;
    end if;
end;
$$;

grant execute on function public.finalize_order_extras(uuid, uuid, uuid, numeric, int, uuid) to authenticated, service_role;
