# Tapas Reading Cafe Software — Universe

> Banner image suggestion: Tapas brand color (#667eea purple) with the books-and-coffee mark. Place a small Tapas logo as the page icon.

---

**Tapas Reading Cafe Software** — India's first all-in-one operating system for the **bookshop + cafe** combo. Library lending, retail POS, member management, e-commerce storefront, barcode workflow, and back-office reporting in one product. Built originally for Tapas Reading Cafe; now offered as a white-label platform to other independent bookshops, reading cafes, and library businesses.

**Staff dashboard:** [dashboard.tapasreadingcafe.com](https://dashboard.tapasreadingcafe.com) · **Customer store:** [tapasreadingcafe.com](https://tapasreadingcafe.com) · **Backend:** Supabase · **Hosting:** Vercel · **Repo:** github.com/tapasreadingcafe-stack/tapas-library

---

## Column 1 — Product, Design, Tech

- 🛍️ **Product — Modules** _(features broken down by module: Library, POS, Cafe, Members, Storefront, Inventory, Marketing, Reports)_
- 🖼️ **Product — Screens** _(annotated screenshots of every major page)_
- 🎨 **Design — System** _(brand colors, fonts, component library, dark/light themes)_
- 🛠️ **Tech — Stack** _(React 18 · Supabase · Vercel · AG Grid · OCR.space · Open Library API · jsQR · Tesseract.js fallback · imgbb · Zebra ZPL bridge)_
- 📂 **Tech — Repo & file map** _(staff app at root, customer storefront under `tapas-store/`, Python printer bridge under `printer_bridge/`)_
- 🗄️ **Tech — Backend** _(Supabase tables: books, book_copies, members, borrows, transactions, library_shelves, app_settings, activity_log, etc.)_
- 🔧 **Tech — Admin panel** _(internal admin URLs, Supabase dashboard, Vercel project)_
- 📚 **Content — Database** _(ISBN auto-lookup → Open Library / Google Books · category mapping · preset categories)_
- ✍️ **Content — To author** _(any content that needs writing: about page copy, terms, store descriptions)_
- 🔑 **Tech — Env vars & secrets** _(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY, REACT_APP_IMGBB_API_KEY, REACT_APP_OCR_SPACE_KEY)_

---

## Column 2 — Status, Roadmap, Tasks, Releases, Bugs

- 🚀 **Status — This week** _(active threads, what's shipping, what's in-flight)_
- 🗺️ **Roadmap — Quarters** _(Q1: cart+checkout · Q2: white-label config · Q3: mobile app · Q4: franchise mode)_
- 📋 **Tasks — Pending** _(see "Needs Finishing" section below)_
- 🚢 **Releases — Ship log** _(commit-by-commit milestones; recent: bulk edit grid, multi-scan barcode workflow, per-copy price toggle, OCR.space title scan, camera cover capture)_
- 🐛 **Bugs — Known issues** _(any open production bugs)_
- 📊 **Metrics — Usage analytics** _(books added, transactions, borrow flow, member growth)_
- 💬 **Feedback — User input** _(staff complaints, customer requests)_
- 🧪 **Testing — How to test** _(manual QA checklist for major flows)_

---

## Column 3 — Business, Sales, Operations

- 💼 **Business — Pitch one-liner** _("All-in-one operating system for bookshop + cafe businesses. Lend, sell, manage, market — in one app.")_
- 💰 **Business — Model & pricing** _(SaaS tiers, white-label setup fee, onboarding fee, support retainer)_
- 📈 **Business — Market & opportunity** _(independent bookshops in India, reading cafes, library franchises)_
- 🤝 **Sales — Pipeline** _(prospect list, conversations, signed customers)_
- 📄 **Sales — Proposal deck** _(see `docs/proposals/whitelabel-pitch.md`)_
- 👥 **Team — Roles & roster** _(founders, staff, advisors)_
- 📞 **Contacts — Vendors & advisors** _(Supabase support, Vercel support, ISBN data providers, printer suppliers)_
- 🔗 **Links — Useful** _(Open Library docs, Supabase docs, Zebra ZPL spec, AG Grid docs)_
- ✅ **Onboarding — White-label checklist** _(steps to onboard a new bookshop: brand setup → Supabase project → data import → barcode template → staff training → launch)_
- 🎉 **Wins — Milestones** _(launches, contracts signed, books sold, members onboarded)_
- ⚖️ **Decisions — Decision log** _(architectural + product decisions with rationale)_

---

## Needs Finishing (paste into "Tasks — Pending")

- [ ] Customer storefront: cart + checkout flow (browse/wishlist live; purchase flow pending)
- [ ] White-label brand config: extract "Tapas Reading Cafe" / colors / logo from hardcoded values into a runtime config table so a new store can rebrand without code edits
- [ ] Multi-tenant data isolation: per-store Supabase row-level security so one white-label install can't see another's data
- [ ] Mobile-app version (React Native shell wrapping the dashboard)
- [ ] Razorpay or Cashfree payment gateway integration for storefront checkout
- [ ] Subscription / membership billing automation
- [ ] Direct Print bridge: macOS install script + launchd plist so it auto-starts (manual setup works; auto-start is a doc-only pass)
- [ ] OCR accuracy: train a custom OCR pass on decorative cover fonts (currently uses OCR.space with longest-line heuristic; works on plain titles, hit-or-miss on stylised fonts)
- [ ] Manual cover crop UI: optional adjust corners step after photo (currently auto-uploads raw)
- [ ] WhatsApp notifications for borrow reminders / overdue alerts
- [ ] Email marketing module (currently has Marketing section, needs actual campaign tooling)
- [ ] Loyalty / points program
- [ ] Multi-language (Hindi, regional languages on storefront)
- [ ] Advanced reports: cohort retention, member LTV, category profitability
- [ ] Custom domain setup automation per white-label tenant

---

## Module summary (paste into "Product — Modules")

**📚 Library**
- Add Book: ISBN scan or manual entry → auto-fills title, author, category, cover from Open Library + Google Books
- Cover photo: native camera capture + cloud upload (imgbb)
- Title OCR: take photo of title text → OCR.space reads it → auto-fills field
- Bulk Edit grid: spreadsheet-style edit for all books at once (AG Grid)
- Multi-row bulk operations: set category, condition, prices, status across many books in one shot
- Copy management: live count of barcoded copies per title; detects orphaned/excess copies and cleans them
- Storefront sync per copy: "Show on website" / "Not for sale" toggle
- Borrow / return: member checkout flow with due dates, overdue alerts, availability check
- Reservations + wishlist + reviews
- Categories, conditions, ISBN dedup

**🏷️ Barcodes**
- Auto-generated copy codes (B-FIC-0001 format, per-category sequences)
- Browser print (preview) + Direct Print to Zebra via local Python ZPL bridge
- Custom label templates (editor included)
- Multi-scan workflow: continuous camera scan, select 10+ books in one session
- Per-copy "show / hide price on label" toggle (bulk + individual)
- Status tracking: available / issued / sold / lost / damaged

**☕ Cafe**
- POS: separate till for food/drinks
- Menu management
- Orders + reports
- Combined customer profile (books + cafe purchases)

**👥 Members**
- Profiles + child profiles
- Borrow history, due books, fines
- Member tiers (memory note: tier work in progress on customer storefront)
- Activity log
- Bulk import from CSV

**🛒 Storefront (Customer-facing)**
- React app at tapasreadingcafe.com
- Browse books with cover photos
- Wishlist (auth required)
- Membership tiers display
- Landing page CMS
- (Pending) Cart + checkout

**📦 Inventory**
- Stock tracking
- Reorder alerts
- Vendor management

**🎉 Events**
- Event creation + RSVP
- Reading sessions, author meets, book clubs

**📊 Reports**
- Sales, borrows, member growth, popular titles, category breakdown
- CSV export everywhere

**📣 Marketing**
- Recommendations engine
- Staff picks
- Featured books

**📝 Tasks & Notes**
- Internal staff todo list
- Activity log feed

**⚙️ Settings**
- Staff management + permissions (read-only / write roles)
- Theme: dark/light
- Dev mode: custom labels, debug tools

---

## Tech stack at a glance (paste into "Tech — Stack")

| Layer | Technology |
|---|---|
| Frontend (staff dashboard) | React 18 + react-scripts, AG Grid Community, react-router-dom |
| Frontend (customer storefront) | Separate React app under `tapas-store/` |
| Backend | Supabase (Postgres + Auth + Storage + Row-Level Security) |
| Hosting | Vercel (both apps, separate projects) |
| Image hosting | imgbb (book covers) |
| ISBN data | Open Library + Google Books APIs (fallback chain) |
| Title OCR | OCR.space cloud API (25k free/month) |
| Cover scanner | jsQR + native BarcodeDetector (Chrome/Safari) |
| Label printer | Zebra ZD230 via Python Flask bridge on localhost:5050 |
| Sentry / monitoring | _to add_ |
| Payments | _to add — Razorpay/Cashfree planned_ |

---

## Repo & file map (paste into "Tech — Repo & file map")

```
tapas-library/                       ← Staff dashboard (root)
├── src/
│   ├── pages/                       ← One file per route
│   │   ├── Books.js                 ← Library catalog + Add/Edit
│   │   ├── BooksBulkEdit.js         ← Spreadsheet bulk edit (AG Grid)
│   │   ├── BarcodeManager.js        ← Barcodes, scan, print
│   │   ├── Borrow.js, OverdueBooks.js, Reservations.js
│   │   ├── Members.js, MemberProfile.js, ChildProfile.js
│   │   ├── POS.js, CafePOS.js, CafeMenu.js
│   │   ├── InventoryLibrary.js, Statistics.js, Reports.js
│   │   ├── Marketing.js, Events.js, Reviews.js, Wishlist.js
│   │   └── StaffManagement.js
│   ├── components/
│   │   └── (Toast, ConfirmModal, ThemeProvider, FilterBar, etc.)
│   ├── utils/
│   │   ├── supabase.js, exportCSV.js, bookCopies.js
│   │   ├── ocr.js                   ← OCR.space client
│   │   └── barcodeUtils.js          ← Code-128 SVG / ZPL gen
│   ├── BarcodeScanner.js            ← Camera barcode reader
│   ├── BulkImport.js                ← CSV importer
│   ├── App.js                       ← Routes + shell
│   └── index.js                     ← Mount
├── tapas-store/                     ← Customer-facing site (separate npm app)
│   └── src/...
├── printer_bridge/                  ← Local Python service for Zebra direct print
│   ├── print_bridge.py
│   ├── requirements.txt
│   └── README.md
├── migrations/                      ← SQL change scripts for Supabase
└── docs/
    ├── notion/                      ← Universe page + module docs
    └── proposals/                   ← Sales materials
```

---

## Pitch one-liner (paste into "Business — Pitch one-liner")

> **Tapas Software** is the missing operating system for the bookshop + cafe combo. One app to manage your library catalog, lend books to members, run a cafe till, sell on your own e-commerce site, generate barcodes, and report on it all. White-labelled for your brand. Built by people who actually run a reading cafe, not a generic SaaS vendor.
