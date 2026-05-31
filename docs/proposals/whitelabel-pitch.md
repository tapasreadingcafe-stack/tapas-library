# Run your bookshop + cafe on one system.

**A white-label proposal from Tapas Reading Cafe Software**

---

## The problem, in one paragraph

If you run a bookshop, a reading cafe, or a community library, you're probably stitching together five tools that weren't built for you:

- A POS for cafe billing that doesn't know about books
- A spreadsheet (or worse, a notebook) for library lending
- A WhatsApp group for "is this book available?" queries
- A website built by a freelancer that nobody updates
- A separate inventory tracker for stock and prices

Every tool charges separately, none talk to each other, your staff trains four times, and you still don't know which book is your bestseller. Most "library software" was built for schools; most "cafe POS" was built for chains. Nothing was built for **a bookshop with a cafe attached** — which is what most independent reading spaces actually are in India today.

## What we built

**Tapas Software** is the operating system we built for our own reading cafe, **Tapas Reading Cafe**. We run on it every day. It's not a side project — it's our main business tool. Now we're offering it to other shop owners who want to skip the years of building.

One login. One database. One staff training. Everything connected:

| Module | What it does |
|---|---|
| 📚 **Library** | Add books by scanning ISBN, auto-fill from Open Library, manage copies, lend to members, track returns, overdue, reservations, wishlists |
| 🏷️ **Barcodes** | Auto-generate copy codes per category, print labels in bulk (browser or Zebra direct), scan-to-find any book in seconds |
| ☕ **Cafe POS** | Full till for food and drinks, separate menu management, daily reports |
| 🛒 **Combined Checkout** | Sell books and cafe items in one cart, one bill, one receipt |
| 👥 **Members** | Profiles (including kids), borrow history, membership tiers, due-book reminders |
| 🌐 **Customer Storefront** | Your own e-commerce website at your own domain. Customers browse, wishlist, (soon) buy online |
| 📦 **Inventory** | Stock levels, reorder alerts, vendor tracking |
| 🎉 **Events** | Reading sessions, author meets, book clubs with RSVPs |
| 📊 **Reports** | Bestsellers, popular categories, member growth, cafe vs library mix, CSV export anywhere |
| 📣 **Marketing** | Staff picks, recommendations, featured shelves |
| ⚙️ **Operations** | Staff roles + permissions, activity log, bulk import/export |

## Why this is different

**1. Built for your exact business, not adapted from something else.**
The cafe POS knows the library exists. A member checking out coffee can also borrow a book on the same bill. Their borrow history shows next to their cafe history. We didn't bolt these together — they were built as one product from day one.

**2. ISBN superpowers.**
Type or scan an ISBN. Title, author, cover image, category — all auto-filled in 2 seconds from Open Library + Google Books. No more typing 500 books by hand.

**3. Bulk everything.**
A spreadsheet-style grid for editing 100 books at once. Multi-row barcode scanning. Bulk price updates, bulk category changes, bulk import from CSV. The kind of tools you'd build yourself if you had a year.

**4. Real cover photos.**
Tap a camera button, take a photo of any book cover, it uploads instantly and shows on your website. No more "no image available" placeholders.

**5. Title OCR.**
ISBN missing or wrong? Take a photo of the title, our OCR reads it and fills the field. Works on standard prints; getting better on stylised covers.

**6. Direct label printing.**
We've integrated with the standard Zebra ZD230 label printer. Click "Direct Print" → label comes out silently. No printer dialogs, no PDF round-trips. Or use any printer via your browser if you prefer.

**7. Your brand, your domain.**
This is a white-label product. Your shop name, your colors, your website domain. Customers never see "Tapas".

**8. Built by operators, not generic SaaS.**
We run a reading cafe. Every feature exists because we needed it. We use this software ourselves, every day. When you find a bug, the people fixing it actually understand your business.

## What you get on day 1

- **Staff dashboard** hosted on your own subdomain (e.g. `dashboard.yourshop.com`)
- **Customer storefront** on your main domain (e.g. `yourshop.com`)
- **Private database** (your data stays separate from every other tenant)
- **Pre-loaded barcode label template** for Zebra printers
- **Onboarding** — we sit with your staff for one day, walk through every screen, and import your existing book list from a CSV
- **Training videos** for the core flows: adding books, lending, returns, POS, reports
- **Email + WhatsApp support** for the first 30 days; ongoing support thereafter (see pricing)

## Pricing (placeholder — discuss with each prospect)

We offer two paths:

### Path A — Setup + Monthly (recommended)
- **Setup fee:** ₹X (one-time) — covers white-label config, domain wiring, data import, staff training
- **Monthly:** ₹Y / month — covers hosting, ongoing updates, bug fixes, support
- No commission on your sales, no per-transaction fee
- Cancel anytime; you keep your data (full CSV export)

### Path B — Annual (10–15% discount)
- Setup fee + 12 months upfront → reduced monthly rate

### What's separate
- Your Supabase database hosting (covered under our infra cost; passed through transparently)
- Your domain registration (you own it directly)
- Custom feature work above the standard product → quoted separately

> Pricing intentionally not fixed here — we'd rather understand your shop size, member count, and existing tooling before quoting. The number we land on should make sense for both sides.

## Implementation timeline

| Week | What happens |
|---|---|
| **Week 0** | Discovery call. Show the live software. Agree price + scope. |
| **Week 1** | Domain setup. Brand config (logo, colors, name). Supabase project provisioned. |
| **Week 2** | Data import from your existing list (books, members, prices). Cafe menu setup. Zebra printer install. |
| **Week 3** | Staff training (full day on-site or video calls). Go-live on staff dashboard. |
| **Week 4** | Customer storefront launch. First 30 days of premium support. |

**Total: ~1 month from contract to fully live.**

## What's coming (roadmap visible to you)

The software keeps evolving. Currently in active build / planned:

- 🛒 **Online checkout** — customers buy directly from your storefront (cart → Razorpay → fulfilment workflow)
- 📱 **Mobile app** — React Native version of the staff dashboard for shelf scanning and at-table cafe orders
- 💳 **Membership billing** — automatic recurring subscriptions for member tiers
- 📲 **WhatsApp integration** — automatic borrow reminders, overdue alerts, marketing broadcasts
- 🎯 **Loyalty program** — points for purchases and borrows
- 🗣️ **Multi-language** — Hindi and regional language storefronts

You'll get all of these as included updates — no extra charge for new features within the product line.

## Case study: Tapas Reading Cafe itself

We're not just selling theory. The software is what we run on every day. Some numbers (placeholder — fill in with real metrics):

- **X+ titles** in active catalog
- **Y+ active members**
- **Z+ borrows / month**
- **₹ in monthly cafe + book revenue** through this system
- **N staff** trained on it; **most onboarding under 4 hours**

We can walk you through a live demo of the actual production system, with actual data, during the discovery call.

## What we ask of you to get started

1. **A 30-minute discovery call** — your shop, your current pain, what would actually help
2. **A live demo** of the staff dashboard and customer storefront — you click around, ask anything
3. **Honest answers** on numbers: how many books, members, daily transactions — so we can quote fairly

Then if it feels right, we sign a short agreement and start week 1.

## Contact

**Tapas Reading Cafe Software**
Built by the team at Tapas Reading Cafe.

- **Email:** _add_
- **Phone / WhatsApp:** _add_
- **Live software demo:** [dashboard.tapasreadingcafe.com](https://dashboard.tapasreadingcafe.com) (read-only guest login on request)
- **Customer storefront example:** [tapasreadingcafe.com](https://tapasreadingcafe.com)

---

> _This is a draft — fill in placeholders (₹X, ₹Y, real metrics, contact details) before sending to a prospect. Strip the "soon" labels from any features that have shipped between draft date and send date._
