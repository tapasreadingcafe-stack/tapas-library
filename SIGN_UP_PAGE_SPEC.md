# Sign Up / Membership Page Spec

3-step onboarding at `/sign-up`. Nav hidden (via `HIDE_NAV_ROUTES` in App.js); footer renders.

## Layout

Outer `1.1fr / 1fr` grid.

- **Left**: heading + pricing tiers (Pass / Monthly / Annual, Monthly selected by default) + stepper (About you \u2192 Your reading \u2192 Payment) + step form + consent row + submit.
- **Right**: MemberCard illustration (5 perks + Starts today / No contract footer), lime "This week" card (3 upcoming events), "What you won\u2019t get" + "Rather not decide online?" info cards.

## Tiers (INR)

| Tier | Kicker | Price |
|------|--------|-------|
| Pass | OCCASIONAL | \u20B9250 / visit |
| Monthly | MOST POPULAR | \u20B9467 / month |
| Annual | BEST VALUE \u00b7 SAVE \u20B92,000 | \u20B93,600 / year |

## Steps

**Step 1** requires first/last name, valid email, password >= 8 chars. Other fields optional (phone, preferred club, reading chips, "what are you reading" textarea). "In translation" + "Literary fiction" chips default-on.

**Step 2** all optional: pace / attention span / format / re-reading / "spoils your week" chips / most-recommended book.

**Step 3** requires cardholder name, card number (13\u201319 digits, auto-space every 4, brand icon on the right), expiry MM/YY, CVC (3\u20134), consent + authorize checkboxes. Display only \u2014 no real charge. TODO for Razorpay/Stripe + Supabase user creation.

## Submit

Logs the full form state, redirects to `/welcome`.

## Stubs

- `/welcome`, `/code-of-the-room`, `/privacy` \u2014 all centered \u201Ccoming soon\u201D pages with back links.

## Sync with /sign-in

Perks list + \u20B9467/month price are shared via a single `MemberCard` component consumed by both pages.

## Definition of done

- [ ] `/sign-up` renders per design; nav hidden; footer renders
- [ ] Pricing tiers + stepper + 3 steps + validation all work
- [ ] Card-number auto-spacing + brand detection
- [ ] Submit redirects to `/welcome`; sign-in gets the matching perk list + \u20B9467 price
- [ ] Stubs exist at `/welcome`, `/code-of-the-room`, `/privacy`
- [ ] Responsive per standard breakpoints
- [ ] Committed + pushed
