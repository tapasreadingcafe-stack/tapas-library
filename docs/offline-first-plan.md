# Offline-First Dashboard — Design & Build Plan

**Goal:** Turn the Tapas staff dashboard (`dashboard.tapasreadingcafe.com`) into an
**installable browser app** (a PWA) — starting on the **Mac**, with **no native build needed** —
that keeps working when the internet or Supabase drops. Staff can bill, add books, and use every page **offline**; when the network
returns, changes **sync automatically** to Supabase. The full history also lives on-device, so it
**doubles as a backup**.

The public site (`tapasreadingcafe.com`) is **out of scope** and stays exactly as it is.

---

## Decisions locked in

| Question | Answer | Consequence |
|---|---|---|
| Devices offline at once | **One counter only** | Dashboard is the sole writer → sync = **replay a queue in order**. No multi-device merge — the whole thing stays simple. |
| Counter device | **Mac laptop first** (Android later) | Ship as an **installable browser PWA** on the Mac — **no native build.** Same code wraps into an Android app later if wanted, nothing wasted. |
| Data kept offline | **All-time** (also acts as a **backup**) | Full history in local SQLite + a periodic exported backup file. |
| Sync engine | **Build our own, open-source, free, simple** | No PowerSync/paid service. A small hand-written **outbox sync** — safe precisely because there's one writer. |
| Receipt / ID numbers | **Prefixed local sequence** (`C1-0012`) | One device = the `C1` prefix guarantees no clashes. No server round-trip needed. |

### Browser PWA on the Mac — and why it's safe enough here
Earlier I flagged that a plain browser app can have the OS **evict** its storage (a risk for queued
bills). For **one trusted Mac running Chrome**, that risk is small and easily mitigated:
- **Install the dashboard as an app** (Chrome → *Install*). Installed PWAs get their own window and
  Chrome grants **persistent storage** (`navigator.storage.persist()`), which is **not** evicted.
- Store data in **IndexedDB via Dexie**, kept durable by the persistent-storage grant above.
- Keep the **exported backup file** (you wanted this anyway) as a safety net.
- Residual risk: someone manually doing *Clear browsing data → this site* wipes unsynced local data.
  Habit: sync before closing; the backup export covers the rest.

So: **no Electron/Capacitor build for now.** We write one web app and install it as a PWA on the
Mac. Wrapping it into a real Android/desktop app stays available later with the *same* code.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Staff app (React) — one codebase everywhere        │
│                                                     │
│   UI reads/writes  ─────►  LOCAL SQLite (all-time)  │  ← always instant, always available
│                                │                    │
│                     ┌──────────┴──────────┐         │
│                     │  Our sync module     │         │
│                     │  • outbox (push)     │         │
│                     │  • pull-since         │         │
│                     └──────────┬──────────┘         │
└────────────────────────────────┼────────────────────┘
                                  │  when online
                                  ▼
                        Supabase Postgres  ← source of truth (also its own backup)
                                  │
                                  ▼
                     Exported SQLite file  ← on-device / cloud-folder backup
```

**Principle: local-first.** The UI never calls Supabase directly anymore — it reads/writes the
**local SQLite** database, so it's instant and works with no network. Our small **sync module**
moves changes both ways in the background.

### Stack (all open-source, no paid service)

| Piece | Choice | Why |
|---|---|---|
| App shell | **PWA** — manifest + **service worker** | Makes the app load with **no network**, and installable on the Mac. *(Not present yet — the app is plain CRA today, so this is step 1.)* |
| Local DB | **Dexie (IndexedDB)** | One import — no WASM/worker/header setup. Durable + low-maintenance (matches "simple to manage"). Reports become JS aggregations; exports to a JSON backup. |
| Sync | **Our own module** (outbox + pull-since) | ~a few hundred lines. No service, no cost, we own it. Stays simple because there's one writer. |
| Install | **Chrome → Install app** on the Mac | Own window, works offline — feels like software, no packaging/build. Android/native deferred. |
| Backup | **Exported JSON file** (Dexie export) to a cloud folder | The all-time local DB dumped out periodically = a real off-device backup. |
| Connectivity | Auto-detect + status light | App flips to offline by itself; manual toggle is only an override/indicator. |

**Bonus:** with reports running against local SQLite, the slow Financial Overview (34 queries)
becomes **instant** — the current slowness partly solves itself.

---

## How our own sync works (single-writer outbox)

Because **one device is the only writer**, we don't need conflict-resolution machinery. The whole
engine is four simple rules:

1. **Every local write also appends to an `outbox` table** — `(id, table, row_uuid, op, payload,
   created_at, synced)`. `op` is insert / update / delete.
2. **Push:** when online, read unsynced outbox rows **in order** and replay them to Supabase
   (`upsert` keyed by the row's UUID). Mark each `synced` on success. If offline, they just wait.
3. **Pull:** on reconnect and every few minutes, fetch rows from Supabase changed since
   `last_pulled_at` using each table's **`updated_at`** column, and merge into local SQLite. (Mostly
   the online store's data and any manual DB edits — the counter itself is the only other writer.)
4. **Conflict (rare):** if a row changed **both** locally-unsynced and remotely since the last pull,
   **flag it for staff** — never silently overwrite money data. With one writer this almost never
   happens.

That's it. No third party, nothing to pay for, and small enough to fully understand and maintain.

### Schema prep this needs (ties into your recent DB work)
The pull step needs to know *what changed* and *what was deleted*:
- **`updated_at`** on every synced table (auto-updated by trigger). You've already added it to
  `book_copies`, `circulation`, `reservations` — extend to `sales`, `pos_transactions`, `members`,
  `cafe_orders`, `cafe_expenses`, `events`, etc.
- **`deleted_at`** (soft-delete tombstone) on synced tables — a pull can't fetch rows that no longer
  exist, so deletes are represented as a flag, then hard-purged later.
- **UUID key** on every synced table (in addition to the human `C1-0012` code), so offline-created
  rows have a stable identity before they reach Supabase.

---

## IDs & receipt numbers (locked: prefixed local sequence)

- **True key = UUID**, generated on-device. Never collides, no server needed.
- **Human-readable code = `C1-####`** from a local counter (`C1` = this counter). Because there's
  one device, the prefix + local sequence can never clash. Applies to receipts, invoices, and book
  codes. No "assign on sync" complexity required.
- A **unique check at sync time** catches any freak duplicate rather than silently saving it.

---

## All-time data + backup

- Local IndexedDB holds the **entire history**, so every page (including reports) works fully offline.
- For a single cafe this stays small — realistically tens of thousands of rows over years, which
  IndexedDB handles easily on a phone or laptop.
- **Backup:** periodically export the database as a **JSON file** to a cloud folder (Google Drive /
  iCloud). If a device dies, the data is recoverable. Note the layers: **Supabase is the primary source of truth**
  (and is itself backed up); the all-time local copy + exported file is a **second, independent
  backup** you control.

---

## Offline UX

- **Status light** in the top bar: 🟢 Online / synced · 🟡 Offline (N changes queued) · 🔵 Syncing…
- **Auto-switch:** detect dropped network / failed requests and go offline automatically.
- **Manual override** toggle for testing or a flaky connection.
- **Sync confidence:** "Last synced 2 min ago" + a count of unsynced items, so staff always know the
  state of their money data.
- **Never lose a bill:** a queued bill stays in durable SQLite until Supabase confirms it.

---

## Build order (staged — reaches "whole dashboard" without a big-bang rewrite)

Money is involved, so we prove each layer before spreading it everywhere.

**Phase 0 — Spike / proof.** Add the PWA shell + local SQLite + the outbox sync for **one module:
POS/billing**, running in Chrome on the Mac. Success = wifi off → make a bill → wifi on → it syncs
with **zero data loss**. Decision gate before going further.

**Phase 0.5 — Schema prep.** Add `updated_at` + `deleted_at` + UUID keys across the synced tables
(migration). One-time groundwork the sync depends on.

**Phase 1 — Billing hardened.** Full POS offline: receipts, `C1-####` numbering, printer bridge
working offline, edge cases (app killed mid-bill, low storage). Highest value, highest risk — make
it bulletproof first.

**Phase 2 — Books & inventory offline.** Adding/editing books, copies, barcodes offline with the
UUID + `C1` code strategy.

**Phase 3 — Members, circulation, cafe, expenses offline.** Roll the same local-first pattern across
daily-operations pages.

**Phase 4 — Reports & the rest.** Point Financial Overview / P&L / stats at local SQLite (instant).
Wire up the all-time sync + backup export.

**Phase 5 — Install & pilot.** Install the PWA on the Mac (Chrome → Install), run it at the real
counter for a week alongside the current setup before switching over. *(A native Android app is an
optional later step — the same code wraps in.)*

Each phase ships something usable; "whole dashboard offline" is reached by end of Phase 4.

---

## Risks & honest costs

- **Effort:** a **re-architecture, not a feature** — realistically **multiple weeks**. Most of it is
  moving the app's data layer from direct-Supabase to local-first.
- **We maintain the sync code:** building our own means no bills and full control, but *we* own the
  bugs. Single-writer keeps it small, and the staged rollout keeps it testable.
- **Two states to test:** every page verified both online and offline.
- **Data integrity is sacred:** billing/inventory bugs cost real money — hence prove-first ordering
  and "flag, don't overwrite" on conflicts.
- **Device loss before sync:** mitigated by durable SQLite + visible unsynced count + the exported
  backup file.
- **Release discipline:** schema changes now need a matching local migration each time.

---

## Remaining small choices (not blockers)

1. **Service worker setup:** hand-written vs **Workbox** (`workbox-window`). Default: a small Workbox
   setup — standard and low-maintenance.
2. **Backup destination:** Google Drive vs iCloud vs a plugged-in drive for the exported `.sqlite`.
3. **Sync interval when online:** how often to pull (e.g. every 2–5 min) — tunable, not structural.

---

## Recommendation

Proceed with **Phase 0 as a small, throwaway-friendly spike** first. It answers the only question
that matters — *does our own local-first billing sync reliably on this stack?* — for a fraction of
the total effort, before committing to the full rollout. If the spike holds up, execute Phases
0.5 → 5 in order.
