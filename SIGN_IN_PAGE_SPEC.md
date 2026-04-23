# Sign In Page Spec — Tapas Reading Cafe

Split-screen auth page at `/sign-in`. Form on the left, lime-illustrated member-benefits panel on the right. Sticky navbar is hidden on auth routes (`/sign-in`, `/sign-up`, `/forgot-password`); global footer still renders.

---

## Left side — sign-in form

- Purple mono kicker `MEMBERS \u00b7 SIGN IN` + "Welcome *back.*" H1 (purple italic) + muted lede
- Email + password inputs (rounded, 1px border, mono uppercase label)
- Options row: pink-accented "Keep me signed in" checkbox (default on) + pink "Forgot password?" link
- Dark rounded-full submit button with lime arrow circle (turns pink on hover)
- "OR CONTINUE WITH" divider
- 2-column Google / Apple OAuth buttons
- Footer: "Don\u2019t have an account? Become a member \u2192" link to `/sign-up`

## Right side — lime illustrated panel

- Lime bg with decorative pink circle (top-right) + orange circle (bottom-left)
- Dark "Member Card" with header, "The *perks,* all of them." H3, 5 pink-bulleted benefit lines, price row
- Bottom-right white testimonial card from Helena N.

## Functionality

- `handleSignIn`: validate, fake 800ms processing, alert + console log, TODO for Supabase auth
- `handleOAuth(provider)`: alert + console log, TODO for Supabase OAuth
- Forgot Password + Sign Up routes both render centered "coming soon" stubs

## Routes wired

- `/sign-in` (this page), `/sign-up` (stub), `/forgot-password` (stub)
- Nav's Sign In + Sign Up buttons point here
- `HIDE_NAV_ROUTES` in App.js suppresses the nav on all three auth paths

## Definition of done

- [ ] `/sign-in` renders per design; nav hidden; footer renders
- [ ] All form fields + OAuth buttons fire placeholder handlers
- [ ] Stub routes exist at `/sign-up` and `/forgot-password`
- [ ] Responsive: mobile drops the lime panel and shows only the form
- [ ] Committed + pushed
