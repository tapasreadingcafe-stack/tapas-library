# Contact-form email notifications — setup

Emails the cafe every time someone submits the website contact form.
The form (`tapas-store/src/pages/contact/ContactGetInTouch.js`) saves to
Supabase **and** fire-and-forget calls the `notify-contact-email` Edge
Function, which sends the email via **Resend**. All credentials live in
Supabase secrets — nothing sensitive is exposed to visitors.

One-time setup (~10 min):

## 1. Get a Resend API key
1. Sign up (free) at **https://resend.com** using the email you want
   alerts sent to (e.g. tapasreadingcafe@gmail.com or a personal inbox).
   Verify your email when prompted.
2. Go to **API Keys** → **Create API Key** → name it `Tapas website` →
   copy the key (starts with `re_...`).

> Free tier note: with no domain verified you can send **from**
> `onboarding@resend.dev` **to the email you signed up with**. That's all
> we need for owner alerts. To send from your own domain or to other
> addresses, verify tapasreadingcafe.com in Resend → Domains, then set
> the `NOTIFY_FROM` secret to something like
> `Tapas Reading Cafe <hello@tapasreadingcafe.com>`.

## 2. Add secrets in Supabase
Dashboard → your project (`poqjkkutnnfvypiridzl`) → **Edge Functions →
Secrets** (or **Project Settings → Edge Functions**). Add:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | the `re_...` key from step 1 |
| `NOTIFY_TO` | the email that should receive alerts (your Resend sign-up email) |
| `NOTIFY_FROM` | *(optional)* leave unset to use `onboarding@resend.dev` |

Type the names exactly — capitals matter.

## 3. Deploy the function
**Dashboard:** Edge Functions → **Deploy a new function** → **Via Editor**
→ name it exactly `notify-contact-email` → paste `index.ts` from this
folder → **Deploy**.

**CLI:**
```bash
supabase link --project-ref poqjkkutnnfvypiridzl
supabase functions deploy notify-contact-email
```

## 4. Test
1. Make sure the latest storefront build is promoted (so the live form is
   wired), or test on a preview.
2. Submit the Contact form on the site → an email should arrive at
   `NOTIFY_TO` within seconds.
3. If it doesn't: Supabase → Edge Functions → `notify-contact-email` →
   **Logs**. Common causes: a mistyped secret name, an unverified
   `NOTIFY_TO` on the free tier, or an expired API key.

## Switching channels later
The function is channel-agnostic on the form side. To use Gmail SMTP,
Slack, WhatsApp, etc., only this function changes — the form keeps calling
`notify-contact-email`. (A Gmail-SMTP version is in this file's git
history at the commit before the Resend switch.)
