-- =====================================================================
-- Allow public website visitors to submit the contact form and to
-- subscribe to the newsletter.
--
-- WHY THIS IS NEEDED
--   contact_submissions and newsletter_subscribers already have
--   staff-only RLS (read/write gated behind public.is_staff()). The
--   public storefront (tapasreadingcafe.com) talks to Supabase with the
--   ANON key, which had NO insert policy on these tables — so every
--   submission was rejected with "42501: new row violates row-level
--   security policy" and silently lost. That is why the dashboard
--   Contact Inbox / Newsletter tabs were always empty.
--
-- WHAT THIS DOES
--   Adds an INSERT-only policy for the anon (and authenticated) roles.
--   Insert-only by design: the public can submit a form, but cannot
--   read, update, or delete anyone's data. Only staff (is_staff())
--   can view / manage the inbox, per the existing policies.
--
-- SAFE TO RE-RUN: enabling RLS that's already on is a no-op, and each
-- policy is dropped-if-exists before being recreated.
-- =====================================================================

alter table public.contact_submissions   enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- Contact form -> dashboard "Contact Inbox" (/store/inbox)
drop policy if exists "public_can_submit_contact_form" on public.contact_submissions;
create policy "public_can_submit_contact_form"
  on public.contact_submissions
  for insert
  to anon, authenticated
  with check (true);

-- Newsletter signup -> dashboard "Newsletter" (/store/newsletter)
drop policy if exists "public_can_subscribe_newsletter" on public.newsletter_subscribers;
create policy "public_can_subscribe_newsletter"
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (true);
