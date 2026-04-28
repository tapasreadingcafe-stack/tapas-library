-- ============================================================================
-- 20260428_is_staff_fn_and_books_rls_lockdown.sql
--
-- Two related fixes:
--
-- 1. Define public.is_staff(). All RLS policies in 20260411_ecommerce_rls.sql
--    reference this function, but it was never created. Result: every
--    is_staff()-gated policy returned NULL → effectively false → silent
--    write failures from the staff dashboard.
--
-- 2. Lock down public.books writes. 20260427_books_write_policy.sql worked
--    around the missing is_staff() by granting ALL on books to every
--    authenticated user. After 20260411_ecommerce.sql linked customer
--    auth users to members rows, this means logged-in *customers* on the
--    storefront can update prices, stock, hide books, etc. Replace with
--    a proper staff-only policy now that is_staff() works.
--
-- is_staff() is SECURITY DEFINER and resolves the calling user's email
-- against public.staff.email + is_active. Matches how AuthContext.js
-- already authenticates dashboard users.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────
-- 1. is_staff()
-- ──────────────────────────────────────────────────────────────────
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.staff s
     where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       and coalesce(s.is_active, true) = true
  );
$$;

grant execute on function public.is_staff() to authenticated, anon;

-- ──────────────────────────────────────────────────────────────────
-- 2. Re-lock public.books writes to staff only
--    (replaces the over-permissive policy from
--    20260427_books_write_policy.sql)
-- ──────────────────────────────────────────────────────────────────
drop policy if exists "books_write_authenticated" on public.books;
drop policy if exists books_insert on public.books;
drop policy if exists books_update on public.books;
drop policy if exists books_delete on public.books;

create policy books_insert on public.books
  for insert
  with check (public.is_staff());

create policy books_update on public.books
  for update
  using      (public.is_staff())
  with check (public.is_staff());

create policy books_delete on public.books
  for delete
  using (public.is_staff());

-- The public read policy (status='published') from 20260427_unify_books.sql
-- and the staff-bypass select policy from 20260411_ecommerce_rls.sql remain
-- in place. Storefront anon clients only see published rows; staff see all.
