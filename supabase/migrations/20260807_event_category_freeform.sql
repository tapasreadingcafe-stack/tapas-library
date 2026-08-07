-- Allow free-form event categories.
--
-- The original `events_category_check` constraint limited category to a fixed
-- set (book-club, poetry-supper, silent-reading, guest-night, members-only).
-- Staff can now add their own categories (e.g. "Board Games", "Workshop"),
-- so drop the constraint. The storefront falls back to a default colour and
-- uses the raw category text as the tag for anything outside the presets.
alter table public.events drop constraint if exists events_category_check;
