# Tapas Reading Cafe — Monorepo

This repository contains the two web apps that power Tapas Reading Cafe.

| App | Folder | Framework | Domain |
|---|---|---|---|
| **Staff dashboard** | `src/` (repo root) | React 18 · RR 6 · CRA | https://dashboard.tapasreadingcafe.com |
| **Customer store** | `tapas-store/` | React 19 · RR 7 · CRA | https://www.tapasreadingcafe.com |

Both apps share **one Supabase project** via the same env vars:

```
REACT_APP_SUPABASE_URL=<project url>
REACT_APP_SUPABASE_ANON_KEY=<anon key>
```

The customer store also needs:

```
REACT_APP_RAZORPAY_KEY_ID=<razorpay public key>
```

## Repository layout

```
tapas-library/
├── src/                            staff dashboard (React 18)
├── tapas-store/                    customer e-commerce (React 19)
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.js      customer auth + member linking
│   │   │   └── CartContext.js      localStorage cart
│   │   └── pages/                  Home, Catalog, BookDetail, Profile,
│   │                               Cart, Checkout, OrderSuccess, ...
│   └── package.json
├── supabase/
│   ├── migrations/
│   │   ├── 20260411_ecommerce.sql      schema additions (SAFE TO RUN)
│   │   └── 20260411_ecommerce_rls.sql  RLS policies (TEST ON BRANCH FIRST)
│   └── functions/
│       ├── create-razorpay-order/      edge fn — creates Razorpay order
│       ├── verify-razorpay-payment/    edge fn — HMAC verifies signature
│       └── razorpay-webhook/           edge fn — async reconciliation
├── vercel.json                     staff app Vercel config (root)
└── tapas-store/vercel.json         store SPA rewrite config
```

## Running locally

```sh
# staff dashboard (port 3000 by default)
npm install
npm start

# customer store (in a separate shell, runs on whichever port CRA picks)
cd tapas-store
npm install
npm start
```

Both apps read `.env` / `.env.local` from their own folders.

## Supabase setup

### 1. Apply the ecommerce schema

Open the Supabase SQL editor and run `supabase/migrations/20260411_ecommerce.sql`. It is additive and idempotent — safe to re-run. It adds:

- `is_staff()` + `current_member_id()` helpers
- `members.auth_user_id` (links Supabase Auth users to member rows, with automatic backfill by email)
- `members.shipping_address` (for future delivery)
- `books.store_visible`, `books.is_borrowable`
- `customer_orders`, `customer_order_items`, `customer_order_status_history`
- `reserve_book_copy()` / `release_book_copy()` atomic stock RPCs
- Trigger on `auth.users` → auto-creates a linked members row
- Trigger on `customer_orders` → logs status changes to history

### 2. Row-Level Security (gated rollout)

**Do NOT run `20260411_ecommerce_rls.sql` directly on production.** It locks down every shared table and a single missing policy will break the staff dashboard.

Recommended flow:

1. Create a **Supabase branch** from the main project in the Supabase dashboard.
2. Apply both migrations against the branch.
3. Point the staff dashboard at the branch (override `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` in a `.env.local`).
4. Click through every page: Dashboard, Books, Borrow, POS, CafePOS, Accounts Overview, Members, Reservations, Fines, Wishlist, Reviews, Activity Log, etc. Nothing should 401 or return empty.
5. On the same branch, register a fresh customer on `tapas-store`, place a test order, and verify it appears in the staff dashboard at `/store/orders` while being invisible to a second customer.
6. **Only then** merge the branch into production.

**Emergency rollback:** `ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;`

### 3. Edge functions

```sh
supabase link --project-ref <ref>

supabase secrets set \
  RAZORPAY_KEY_ID=<public key id> \
  RAZORPAY_KEY_SECRET=<secret> \
  RAZORPAY_WEBHOOK_SECRET=<webhook secret>

supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook
```

Once deployed, configure Razorpay to POST `payment.captured`, `order.paid`, and `payment.failed` webhooks to the `razorpay-webhook` function URL.

## Deployment — two Vercel projects, one repo

### Staff dashboard — `dashboard.tapasreadingcafe.com`
Already live. No change needed to the existing Vercel project:

- Root directory: `.`
- Framework preset: Create React App
- Env vars: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`

### Customer store — `www.tapasreadingcafe.com`
Create a **second Vercel project** pointing at the same GitHub repo:

1. Import `github.com/tapasreadingcafe-stack/tapas-library`
2. **Root directory**: `tapas-store`
3. Framework preset: Create React App
4. Build command: `npm run build`, Output directory: `build`
5. Env vars:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_RAZORPAY_KEY_ID`
6. Custom domains: `www.tapasreadingcafe.com` (primary), `tapasreadingcafe.com` (apex → www redirect)
7. **Ignored Build Step** (Settings → Git): so the store doesn't rebuild when only `src/` changes
   ```sh
   git diff HEAD^ HEAD --quiet ./
   ```

### Archive the old tapas-store repo
Once `www.tapasreadingcafe.com` is live and serving from the new Vercel project, archive `github.com/tapasreadingcafe-stack/tapas-store` (Settings → Archive this repository). The history is preserved but nobody can push.

## Before launching customer signup — one-time checks

These two checks matter because the staff dashboard and the customer store share one Supabase Auth instance.

### 1. Every legitimate staff user is in the `staff` table

Run in Supabase SQL Editor:

```sql
SELECT id, email, name, role, is_active FROM staff ORDER BY created_at;
```

Cross-check the list against people who currently log into `dashboard.tapasreadingcafe.com`. Add anyone missing.

### 2. Harden `src/context/AuthContext.js`

Before customers are allowed to sign up on the store, remove the permissive fallback in `loadStaffProfile` at `src/context/AuthContext.js:57-63`. Replace the `_no_record` path with an active `await supabase.auth.signOut()` + a "Not a staff account" message. Currently this is deferred so the dashboard behaves exactly as it does today. The fix must land in the same commit that enables customer signup — otherwise a customer who signs up on `www` can log into `dashboard` with the same credentials.

### 3. Email confirmation

Verify **Authentication → Providers → Email → Confirm email** is **ON** in the Supabase dashboard. Otherwise customers can sign up with typos and lock the real owner of that email out of the store.

## Zero-regression guarantees for the dashboard

As of commit `dbd6e6c`, everything under `src/` in the root app:

- Uses the **same React / React Router / react-scripts versions** as before
- Still makes its Supabase calls through `src/utils/supabase.js` with no extra config
- Has RLS `allow_all` / absent — Phase 2 RLS is gated on a Supabase branch
- Gets two new **additive** pieces in Phase 4:
  - new page `src/pages/CustomerOrders.js` at `/store/orders` (opt-in)
  - two new checkboxes in `src/pages/Books.js` defaulted to the "off for storefront, on for borrow" state so existing books are unaffected
  - a cosmetic 🌐 Online badge next to members who registered on the store

## Verification checklist

After every deploy, run the end-to-end verification from the plan:

1. Log into `dashboard.tapasreadingcafe.com` and click through every page. Nothing should error.
2. Sign up a fresh customer on `www.tapasreadingcafe.com`, confirm a `members` row is created with `auth_user_id` set.
3. In the dashboard, flip a book's `store_visible` to ON. Refresh the store catalog — it appears.
4. Add the book to cart, checkout with Razorpay test card `4111 1111 1111 1111`, OTP `1234`.
5. The order appears at `dashboard.tapasreadingcafe.com/store/orders` with status `paid`.
6. Click "Mark Ready for Pickup", then "Mark Fulfilled". Status updates propagate to the customer's `/profile?tab=orders`.

## Phase 6 — fast-follow work

Known gaps that MVP ships without:

- Soft stock reservation with `reserved_until` + `pg_cron` cleanup
- Razorpay webhook actively reconciling orders left in `pending`
- Membership purchase trigger that updates `members.subscription_end`
- POS.js and Borrow.js switching to `reserve_book_copy` RPC
- GST invoice integration with `AccountsInvoices.js`
- Home delivery (`fulfillment_type='delivery'` path)
- Password reset UI on the customer store
- Cart DB sync so cart follows users across devices

## Security notes

- The GitHub remote URL in this repo's local `.git/config` currently embeds a **Personal Access Token** (`https://ghp_…@github.com/…`). **Rotate that token** and switch to SSH (`git@github.com:tapasreadingcafe-stack/tapas-library.git`) or a credential helper (`gh auth setup-git`) — tokens in git configs leak through screen shares, backups, and shared machines.
- `RAZORPAY_KEY_SECRET` must live **only** in Supabase Edge Function secrets, never in a React `.env` file. The public `REACT_APP_RAZORPAY_KEY_ID` is safe to ship in the frontend bundle — that's the designed split.
- RLS must be fully enabled before customer signup opens. See "Before launching customer signup" above.
