-- =====================================================================
-- Event payments — QR code, payment link, and payment-proof uploads.
--
-- Lets staff attach a UPI QR image (and optionally a payment link) to a
-- paid event, and optionally invite the registrant to upload a screenshot
-- of the payment they made.
--
-- Safety contract:
--   * Idempotent — every statement is IF NOT EXISTS / ON CONFLICT, so
--     re-running is a no-op.
--   * Purely additive. No existing column, policy, or row is altered.
--   * Section 3 (the bucket) is OPTIONAL. Skip it and everything still
--     works — the "let registrants upload proof" toggle simply stays
--     unavailable. Sections 1 and 2 are what the feature needs.
-- =====================================================================

-- 1. Event payment settings ------------------------------------------
alter table public.events
  add column if not exists payment_qr_url        text,
  add column if not exists payment_link          text,
  add column if not exists payment_note          text,
  add column if not exists payment_proof_enabled boolean not null default false;

comment on column public.events.payment_qr_url is
  'Public URL of the UPI/payment QR image shown to registrants of a paid event.';
comment on column public.events.payment_link is
  'Optional payment URL (UPI deep link, Razorpay page, etc.) shown alongside the QR.';
comment on column public.events.payment_note is
  'Optional free-text instruction shown with the QR, e.g. "Add your name in the UPI note".';
comment on column public.events.payment_proof_enabled is
  'When true, the storefront register form invites a payment screenshot upload.';

-- 2. Where the registrant''s proof is recorded -------------------------
alter table public.event_registrations
  add column if not exists payment_proof_url text,
  add column if not exists payment_reference text;

comment on column public.event_registrations.payment_proof_url is
  'Storage path of the screenshot the registrant uploaded, if any.';
comment on column public.event_registrations.payment_reference is
  'UPI / bank reference number the registrant typed, if any.';

-- 3. OPTIONAL — bucket for registrant-uploaded screenshots ------------
--
-- This is the one place the storefront is allowed to write. The
-- editor-assets bucket deliberately refuses anonymous writes; rather than
-- weaken that, proofs get their own bucket, scoped as tightly as the
-- feature allows:
--
--   * PRIVATE (public = false). A payment screenshot can expose a phone
--     number, a bank balance, or a UPI handle — it must not be readable
--     by URL guess. Staff view them through short-lived signed URLs.
--   * Anonymous INSERT only. A visitor can drop a file in; they cannot
--     list, read, overwrite, or delete anything, including their own.
--   * 5 MB cap and images/PDF only.
--
-- Residual risk, stated plainly: anyone who can reach the storefront can
-- push files into this bucket. Storage has no per-IP rate limit, so the
-- realistic abuse is junk uploads consuming quota, not data exposure.
-- Skip this section if you would rather collect a UPI reference number
-- instead — section 2 stores that too.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,                                  -- private: signed URLs only
  5 * 1024 * 1024,                        -- 5 MB per file
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Insert: anyone, including the anonymous storefront visitor. This is the
-- deliberate exception, and it is insert-only.
drop policy if exists "payment_proofs_insert_anyone" on storage.objects;
create policy "payment_proofs_insert_anyone"
  on storage.objects for insert
  with check (bucket_id = 'payment-proofs');

-- Read: signed-in staff only. No anonymous select, so a leaked path is
-- not a leaked screenshot.
drop policy if exists "payment_proofs_read_staff" on storage.objects;
create policy "payment_proofs_read_staff"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and auth.role() in ('authenticated', 'service_role')
  );

-- Update / delete: staff only. Visitors cannot overwrite or remove a
-- proof once submitted, including their own.
drop policy if exists "payment_proofs_write_staff" on storage.objects;
create policy "payment_proofs_write_staff"
  on storage.objects for update
  using (
    bucket_id = 'payment-proofs'
    and auth.role() in ('authenticated', 'service_role')
  );

drop policy if exists "payment_proofs_delete_staff" on storage.objects;
create policy "payment_proofs_delete_staff"
  on storage.objects for delete
  using (
    bucket_id = 'payment-proofs'
    and auth.role() in ('authenticated', 'service_role')
  );
