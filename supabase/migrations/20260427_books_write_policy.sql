-- ============================================================================
-- 20260427_books_write_policy.sql
--
-- Restores dashboard write access on the `books` table after
-- 20260427_unify_books.sql enabled RLS but only added a public READ
-- policy (silent INSERT/UPDATE/DELETE denial → dashboard edits looked
-- like no-ops in the UI).
--
-- The dashboard authenticates staff via Supabase Auth, so logged-in
-- sessions arrive on the `authenticated` role. Granting full ALL access
-- to that role mirrors how the dashboard wrote to books before RLS
-- existed on the table.
-- ============================================================================

drop policy if exists "books_write_authenticated" on public.books;
create policy "books_write_authenticated"
  on public.books for all
  to authenticated
  using (true)
  with check (true);
