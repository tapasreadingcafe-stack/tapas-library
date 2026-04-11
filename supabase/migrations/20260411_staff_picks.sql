-- =====================================================================
-- 20260411_staff_picks.sql
--
-- Adds two columns to books so staff can explicitly flag books for the
-- "Handpicked by our librarians" section on the storefront home page
-- and write a short editorial blurb for each pick.
--
-- Safe to run multiple times — both columns are guarded with IF NOT EXISTS.
-- Run in Supabase SQL Editor.
-- =====================================================================

ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS is_staff_pick boolean NOT NULL DEFAULT false;

ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS staff_pick_blurb text;

CREATE INDEX IF NOT EXISTS idx_books_is_staff_pick
    ON public.books (is_staff_pick) WHERE is_staff_pick = true;

COMMENT ON COLUMN public.books.is_staff_pick IS
    'Staff toggle — when true, the book appears in the Home page "Handpicked by our librarians" section.';
COMMENT ON COLUMN public.books.staff_pick_blurb IS
    'Short editorial blurb shown under the book cover in the staff picks section. 1–3 sentences, no quotes.';

-- =====================================================================
-- END 20260411_staff_picks.sql
-- =====================================================================
