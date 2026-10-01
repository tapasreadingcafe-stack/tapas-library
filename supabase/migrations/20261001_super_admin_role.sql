-- Super Admin role
-- =====================================================================
-- Adds a third staff role above admin:
--   super_admin — everything, plus Staff & roles, Settings & Devices,
--                 Accounts, Reports, deleting records and back-dating.
--   admin       — day-to-day pages; a super_admin can switch pages off
--                 per admin from the Staff page.
--   staff       — unchanged.
--
-- Run this BEFORE deploying the dashboard change: once deployed, only a
-- super_admin can open Staff / Settings, so someone must already be one.
-- Safe to run more than once.

-- ── 1. Allow 'super_admin' in staff.role ─────────────────────────────────
-- The original CHECK was unnamed, so drop whatever check constraint
-- currently mentions the role column, then add a named one.
do $$
declare c record;
begin
  for c in
    select con.conname
    from   pg_constraint con
    join   pg_class rel on rel.oid = con.conrelid
    join   pg_namespace ns on ns.oid = rel.relnamespace
    where  ns.nspname = 'public'
    and    rel.relname = 'staff'
    and    con.contype = 'c'
    and    pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table public.staff drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.staff
  add constraint staff_role_check
  check (role in ('super_admin', 'admin', 'staff'));


-- ── 2. is_super_admin() helper ───────────────────────────────────────────
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from   public.staff s
    where  s.email     = auth.email()
    and    s.is_active = true
    and    s.role      = 'super_admin'
  );
$$;

grant execute on function public.is_super_admin() to authenticated;


-- ── 3. Only a super_admin can hand out or take away admin powers ─────────
-- The staff table's RLS lets any signed-in staff member write to it, so
-- without this an admin could promote themselves through the API. Calls
-- with no signed-in user (SQL editor, service role) are allowed through.
create or replace function public.guard_staff_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.email() is null or public.is_super_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' and new.role in ('admin', 'super_admin') then
    raise exception 'Only a Super Admin can create an admin account';
  end if;

  if tg_op = 'UPDATE' and (
       new.role is distinct from old.role
       or new.permissions is distinct from old.permissions
       or (old.role = 'super_admin' and new.is_active is distinct from old.is_active)
     ) then
    raise exception 'Only a Super Admin can change roles or permissions';
  end if;

  return new;
end;
$$;

drop trigger if exists staff_role_guard on public.staff;
create trigger staff_role_guard
  before insert or update on public.staff
  for each row execute function public.guard_staff_role_change();


-- ── 4. Make sunitadas@gmail.com the Super Admin ──────────────────────────
update public.staff
set    role = 'super_admin', is_active = true
where  lower(email) = 'sunitadas@gmail.com';

-- Check: this should return one row with role = super_admin. If it returns
-- nothing, there is no staff row for that email yet — add her from the
-- Staff page first, then run step 4 again.
select name, email, role, is_active
from   public.staff
where  lower(email) = 'sunitadas@gmail.com';
