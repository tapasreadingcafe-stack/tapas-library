# Library Page Spec — Tapas Reading Cafe

Build the Library page at `/library` matching the reference design. This is a LENDING library (free to borrow), NOT a shop — no prices, no cart, no purchase actions. Users can see what's available and reserve/borrow.

---

## Key difference from Shop page

- No prices anywhere
- No "Add to cart" buttons
- Each book shows **availability status** instead: "Available" (green dot) OR "Out · back MM/DD" (pink dot)
- Books are grouped into **shelves** (themed collections), not an endless filterable grid
- Has stats, featured shelf card, category pills, and house rules

---

## Page structure (top to bottom)

### 1. Hero band (green, inside sticky nav-band)

- Pink-dot kicker: `• THE LENDING LIBRARY`
- H1 headline, large serif, tight letter-spacing:
  > Over *2,400 books*, free to borrow.
  - "2,400 books" in purple italic serif (`#8F4FD6`)
  - Rest in near-black
- Right-column supporting paragraph:
  > Take two home at a time. Keep them for three weeks. Return them to the drop-box by the door. No late fees — we trust you. Donations always welcome on the orange shelf.
- Curved SVG bottom transitioning green → cream page background

### 2. Stats row (4 cards, full-width grid)

Four cards side-by-side. The **first card is filled with lime green** (`#C9F27F`), the other three are white with 1px border.

Each card has:
- Large serif number (bold, ~48px)
- Mono uppercase label below (12px, letter-spaced 0.14em, muted)

Cards:
1. **2,412** — BOOKS ON SHELF *(lime background)*
2. **312** — ACTIVE BORROWERS
3. **18** — LANGUAGES
4. **47** — NEW THIS MONTH

These numbers should be driven by a simple config — make it easy to change.

### 3. Filter row

Single horizontal row, not a sidebar:

**Left side — category pills:**
- `All` (active/dark by default)
- `Fiction`
- `Poetry`
- `In Translation`
- `Essays`
- `Memoir`
- `Spanish`
- `Members' Picks`

Pills: white bg with 1px border when inactive, dark bg white text when active. Single-select (clicking one deselects others).

**Right side — search input:**
- Rounded full-width-ish input, placeholder `Title, author, shelf…`
- Filters across all shelves (case-insensitive match on title or author)

Clicking a category pill filters all three shelves below to show only matching books. If a shelf has zero matches after filter, hide that shelf entirely.

### 4. Featured Shelf card (dark)

Large rounded card (`rounded-28px`), dark background (`#1a1a1a`), padding 56px, 2-column grid.

**Left column:**
- Lime green mono kicker: `FEATURED SHELF · APRIL`
- H2 (white serif, with italic lime-green accent):
  > Books in translation, *chosen by translators.*
  - "chosen by translators." is in lime italic (`#C9F27F`)
- Paragraph (white-ish):
  > Fourteen titles picked by the translators who'd kill for them. Margaret Jull Costa, Sean Cotter, Sophie Hughes, and Jennifer Croft each pulled three.
- CTA link: `Browse the shelf` in white + a lime-green circle with an arrow `→`
  - Links to `/library#shelf-translation` (scroll to shelf 02)

**Right column:**
- Stylized illustration of book spines (colorful vertical bars) — just use 12 colored divs in a row at different heights to simulate book spines. Colors: purple, dark, orange, pink, taupe, orange, lime, dark, pink, lime, taupe, purple. Varying heights for visual interest.

### 5. Shelves (3 shelves, each in its own rounded card)

Each shelf card is white/cream bg, 1px border, `rounded-24px`, padding 32px. Contains:

**Shelf header (flex row, space-between, bottom border):**
- Left: serif H3 — `Shelf 01 · *Slow Fiction*` (shelf number in dark, name in purple italic)
- Right: mono muted text — `142 titles · 8 out on loan`

**Book row below header:** 6-column grid of book cards, `gap: 16px`.

Book card for Library (different from Shop card):
- Gradient colored cover only — 3:4 aspect, `rounded-16px`, padding 20px, flex column space-between
  - Top: book title in serif bold 19px, line-height 1.08, white text (dark on lime/cream)
  - Bottom: author surname in 11px uppercase letter-spaced 0.08em, e.g. "T. MANN"
- Below cover: small availability indicator row
  - Green dot + `Available` in mono 12px
  - OR pink dot + `Out · back 5/2` in mono 12px
- No price, no "+" button, no heart

Clicking a card opens a reservation modal (phase 2 — for now just `alert('Reserve ' + title)` or log to console).

### 6. Shelf data — exact books

#### Shelf 01 · Slow Fiction (142 titles · 8 out on loan)

| Title | Author | Cover | Status |
|-------|--------|-------|--------|
| The Magic Mountain | T. Mann | purple | Available |
| Austerlitz | W.G. Sebald | ink | Available |
| Middlemarch | G. Eliot | orange | Out · back 5/2 |
| War & Peace | L. Tolstoy | pink | Available |
| The Waves | V. Woolf | lime | Available |
| In Search of Lost Time | Proust | taupe | Out · back 5/14 |

#### Shelf 02 · In Translation (287 titles · 14 out on loan)

| Title | Author | Cover | Status |
|-------|--------|-------|--------|
| Solenoid | Cărtărescu | ink | Available |
| The Years | A. Ernaux | orange | Available |
| Minor Detail | A. Shibli | purple | Available |
| Flights | O. Tokarczuk | pink | Out · back 4/30 |
| Kitchen | B. Yoshimoto | lime | Available |
| The Employees | O. Ravn | taupe | Available |

#### Shelf 03 · Poetry & Essays (176 titles · 3 out on loan)

| Title | Author | Cover | Status |
|-------|--------|-------|--------|
| Bluets | M. Nelson | pink | Available |
| A Room of One's Own | V. Woolf | lime | Available |
| Citizen | C. Rankine | purple | Available |
| Devotions | M. Oliver | orange | Out · back 4/26 |
| The Argonauts | M. Nelson | ink | Available |
| Upstream | M. Oliver | taupe | Available |

### 7. House Rules section (green card)

Rounded-28px lime green card (`#C9F27F`), padding 56px, 2-column grid.

**Left column:**
- Purple mono kicker: `HOUSE RULES`
- Serif H2: `How the lending works.`
- Paragraph: "No library card, no paperwork. Just a signature in the ledger by the door and a promise to bring them back."

**Right column — numbered rules list (4 items):**
Each item is a row: big serif number (e.g. "01") + rule text in serif.
1. **01** — Borrow two at a time. *(subtitle: Write your name, book, and date in the ledger.)*
2. **02** — Keep them three weeks. *(subtitle: If you need longer, pencil in an extension.)*
3. **03** — Return to the drop-box. *(subtitle: Right by the door. No waiting, no staff needed.)*
4. **04** — Donate if you can. *(subtitle: Orange shelf in the back. We sort weekly.)*

---

## Cover gradient colors (same as Shop — 155deg linear)

```css
.c-purple { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
.c-orange { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
.c-ink    { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
.c-pink   { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
.c-lime   { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); color: dark-ink; }
.c-taupe  { background: linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%); }
```

## Status indicator styling

- **Available:** small green dot (`#22c55e` or similar) + `Available` in mono 12px muted text
- **Out:** small pink dot (`#E0004F`) + `Out · back {date}` in mono 12px muted text

---

## Typography (same as rest of site)

- Display serif: Fraunces (500, 700, 800; italic 500)
- UI sans: Inter (400, 500, 600, 700)
- Mono: JetBrains Mono (400, 500)

---

## Functionality

### Filtering

- Category pill click → updates `activeCategory` state → filters books across all shelves
- Search input (debounce 200ms) → case-insensitive title/author match → filters books across all shelves
- If a shelf has zero visible books after filtering, hide that shelf entirely
- Show a "no results" message if ALL shelves are empty

Each book in the seed data needs a `categories: string[]` field so filtering works. Use the category taxonomy from the pills: Fiction, Poetry, In Translation, Essays, Memoir, Spanish, Members' Picks. "All" = show everything.

### Reserve action (placeholder)

Clicking a book card calls `handleReserve(book)` which for now just shows a toast/alert: "Reserved *{title}* — pick up at the cafe within 48 hours."

### Scroll-to-shelf

The "Browse the shelf" CTA on the featured card should smooth-scroll to `#shelf-translation` (Shelf 02's id).

---

## Responsive

- **Desktop (≥1024px):** 6-column book grid within each shelf, 4-column stats, 2-column featured + house rules
- **Tablet (768–1023px):** 3-column book grid, 2-column stats, single-column featured + house rules
- **Mobile (<768px):** 2-column book grid, 1-column stats, single-column featured + house rules; category pills horizontally scrollable

---

## File organization

```
app/library/page.tsx
app/library/components/
  LibraryHero.tsx
  StatsRow.tsx
  CategoryFilter.tsx
  FeaturedShelf.tsx
  Shelf.tsx
  LibraryBookCard.tsx
  HouseRules.tsx
lib/library-books.ts       # seed data with categories + availability
```

Reuse cover color utilities from the Shop page if already created.

---

## Definition of done

- [ ] `/library` route renders and matches the reference design visually
- [ ] Sticky navbar continues to work on this page
- [ ] All 18 books across 3 shelves render with correct covers, authors, availability
- [ ] Category pills filter books across all shelves; active pill state works
- [ ] Search input filters books (debounced); empty shelves hide
- [ ] Featured shelf "Browse the shelf" smooth-scrolls to Shelf 02
- [ ] Clicking any book shows reserve placeholder (alert/toast)
- [ ] House Rules section renders with 4 numbered rules
- [ ] Stats cards render with lime first card, others white
- [ ] Fully responsive per breakpoints above
- [ ] Committed and pushed to GitHub; Vercel build passes
