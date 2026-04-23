# Shop Page Spec — Tapas Reading Cafe

Build the Shop page at `/shop` matching the reference design. Shop.html at ~/Downloads/Shop.html is a visual reference only — this spec is the source of truth. Do not copy Shop.html into the repo.

## Currency

All prices are in INR (₹) using clean Indian retail pricing (₹499, ₹799, ₹999, ₹1,299, etc.) — NOT a straight USD conversion. Use the exact prices in the Book List below.

Shipping threshold: Free shipping over ₹999, or pick up at the cafe.

## Page structure

### 1. Hero band (inside sticky green nav-band)

- Pink-dot kicker: • THE SHOP
- H1 headline, large serif, near-black, tight letter-spacing:
  "Books we keep *pressing* into people's hands."
  - The word "pressing" is in purple (#8F4FD6), italic, serif
- Right-column supporting paragraph:
  "A small, considered shelf — new releases, small presses, and staff favorites. Every title here has a paragraph from one of us explaining why. Free shipping over ₹999, or pick up at the cafe."
- Curved SVG at the bottom transitioning green → cream page background

### 2. Featured "Book of the Month" card

- Orange block (#FF934A), rounded 28px, padding 56px, 2-column grid
- Left column:
  - Mono kicker: BOOK OF THE MONTH
  - H2: "Solenoid · *Mircea Cărtărescu*" (em italic)
  - Paragraph: "A diary-novel the size of a cathedral. Translator Sean Cotter pulls off a small miracle. Our Slow Fiction Club is reading it through June."
  - CTA: dark rounded pill button "Add to cart · ₹1,299" with a lime-green circle containing an arrow →
  - Clicking the CTA adds Solenoid to the cart
- Right column:
  - Purple gradient book cover card (3:4 aspect, rounded-16px, drop shadow)
  - Large serif "Solenoid" at top, "Mircea Cărtărescu" at bottom

### 3. Shop layout (grid-template-columns: 260px 1fr; gap: 48px)

#### Left sidebar — filters

Each group separated by a 1px top border, 18px vertical padding. Group headers are 12px uppercase mono with 0.14em letter-spacing.

- SEARCH — full-width rounded input, placeholder "Title, author, ISBN…"
- CATEGORY — checkboxes with right-aligned count badges:
  - Fiction (142) — checked by default
  - Poetry (48)
  - Translation (67) — checked by default
  - Essays (34)
  - Memoir (29)
  - Small Press (81)
  - Checkboxes use pink accent color
- FORMAT — pill chips: Paperback (active/dark), Hardcover, Used
- PRICE — range slider ₹199 – ₹1,999, purple accent, with min/max displayed on either side
- FROM THE CLUBS — pill chips: Slow Fiction (active), Translators, Poetry, Novella
- ON THE SHELF — checkboxes: In stock only, Signed copies, Member discount (checked by default)

Chip styling: 12px, padding 6px 12px, border-radius 999px, white bg with 1px border; active state = dark bg, white text.

#### Right side — results

Toolbar:
- Left: mono/muted text "242 titles · 32 new this week"
- Right: "Sort by [Recommended ▾]" — rounded select with options:
  - Recommended
  - New arrivals
  - Price: low to high
  - Author: A–Z

Grid: 4-column grid, gap 22px. Responsive: 4 → 2 → 1 columns.

Book card:
- Cream/card background, 1px rule border, rounded-20px, padding 16px
- flex-direction: column; gap: 12px
- Hover: translateY(-4px)
- Favorite heart ♡ button: absolute top-right (top:26px, right:26px), 32×32 white-ish circle, pink heart, z-index 2. Toggles filled state on click.
- Cover: 3:4 aspect, rounded-12px, gradient bg, padding 18px 16px, flex column space-between
  - Top: book title in serif bold 19px, line-height 1.08
  - Bottom: author in 11px uppercase letter-spaced 0.06em
  - For c-lime and c-cream covers, text color is dark-ink instead of white
- Name row: title in serif bold 17px + author in 13px muted
- Price row: padding-top 10px, border-top 1px dashed
  - Left: price in serif bold 18px
  - Right: dark round 34×34 "+" button; turns pink on card hover
  - Clicking "+" adds the book to the cart

Pagination: centered row, 38×38 round buttons, states: ‹ 1(active) 2 3 4 … 21 ›

## Cover gradient colors (all 155deg linear gradients)

.c-purple { background: linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%); }
.c-orange { background: linear-gradient(155deg, #FF934A 0%, #c65a1e 100%); }
.c-ink    { background: linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 100%); }
.c-pink   { background: linear-gradient(155deg, #E0004F 0%, #8a002f 100%); }
.c-lime   { background: linear-gradient(155deg, #C9F27F 0%, #8ac13a 100%); color: dark-ink; }
.c-taupe  { background: linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%); }
.c-cream  { background: linear-gradient(155deg, #e8dfcb 0%, #bfb29a 100%); color: dark-ink; }

## Book list (exact data — use for seed / initial state)

| # | Title | Author | Cover | Price | Category | Format | In stock | Signed |
|---|-------|--------|-------|-------|----------|--------|----------|--------|
| 1 | The Magic Mountain | Thomas Mann | purple | ₹1,299 | Fiction, Translation | Paperback | yes | no |
| 2 | The Years | Annie Ernaux | orange | ₹999 | Memoir, Translation | Paperback | yes | no |
| 3 | Solenoid | Mircea Cărtărescu | ink | ₹1,299 | Fiction, Translation | Paperback | yes | yes |
| 4 | Bluets | Maggie Nelson | pink | ₹799 | Essays, Poetry | Paperback | yes | no |
| 5 | A Room of One's Own | Virginia Woolf | lime | ₹499 | Essays | Paperback | yes | no |
| 6 | The Waves | Virginia Woolf | taupe | ₹899 | Fiction | Hardcover | yes | no |
| 7 | Minor Detail | Adania Shibli | orange | ₹899 | Fiction, Translation | Paperback | no | no |
| 8 | Checkout 19 | Claire-Louise Bennett | purple | ₹999 | Fiction, Small Press | Paperback | yes | yes |
| 9 | The Thief's Journal | Jean Genet | cream (show "Nightboat" label on cover) | ₹999 | Fiction, Translation | Paperback | yes | no |
| 10 | Austerlitz | W. G. Sebald | ink | ₹1,199 | Fiction, Translation | Hardcover | yes | no |
| 11 | Dept. of Speculation | Jenny Offill | pink | ₹799 | Fiction | Paperback | yes | no |
| 12 | Citizen | Claudia Rankine | lime | ₹1,099 | Poetry, Essays | Paperback | yes | no |

## Typography

- Display serif: Fraunces (weights 500, 700, 800; italic 500)
- UI sans: Inter (400, 500, 600, 700)
- Mono: JetBrains Mono (400, 500)

Load via Google Fonts.

## Functionality — MUST BE FULLY WIRED UP

### Cart state (global, persisted)

Create a cart context (CartProvider) wrapping the app if one doesn't exist, using React Context + useReducer. Persist to localStorage so cart survives reloads. Expose a useCart() hook returning:

- items: CartItem[]  (id, title, author, cover, price, qty)
- addItem(book)
- removeItem(id)
- updateQty(id, qty)
- clear()
- subtotal (computed)
- itemCount (computed, total qty across items)

Clicking any + button on a book card calls addItem(book) — if already in cart, increment qty; otherwise add with qty=1. The featured "Add to cart · ₹1,299" button also calls addItem. The cart icon in the sticky navbar shows a badge with itemCount when > 0.

### Favorites state (per-user, local)

useFavorites() hook backed by localStorage. Exposes isFavorite(id), toggleFavorite(id). The ♡ button renders filled (♥, pink) when favorited.

### Filters + search + sort (client-side)

All filter controls must actually filter the visible book list:

- Search input — case-insensitive match on title or author (debounce 200ms)
- Category checkboxes — show books whose category array includes any checked category (OR logic)
- Format chips — single-select; filter by format
- Price range slider — filter by price within range
- From the clubs chips — single-select; add a clubs: [] field to each book, or skip filtering if empty
- On the shelf checkboxes — AND logic: In stock only (inStock=true), Signed copies (signed=true), Member discount (apply a 10% display discount — show original price struck through)

Show the real filtered count in the toolbar.

### Sort

- Recommended — default order
- New arrivals — reverse order
- Price: low to high — ascending price
- Author: A–Z — alphabetical by last name

### Pagination

12 books per page. Compute total pages from filtered results. Clicking a page number updates state and scrolls to the top of the results grid. The … button is non-interactive.

## Responsive behavior

- Desktop (≥1024px): 4-column book grid, sidebar visible
- Tablet (768–1023px): 2-column book grid, sidebar collapses to a Filters button that opens a slide-in drawer
- Mobile (<768px): 1-column book grid, same drawer pattern, featured card goes single-column

## File organization

app/shop/page.tsx
app/shop/components/HeroBand.tsx
app/shop/components/FeaturedBook.tsx
app/shop/components/FilterSidebar.tsx
app/shop/components/BookGrid.tsx
app/shop/components/BookCard.tsx
app/shop/components/Toolbar.tsx
app/shop/components/Pagination.tsx
app/shop/components/FilterDrawer.tsx
lib/cart-context.tsx
lib/favorites.ts
lib/books.ts

Adjust paths to match existing project conventions.

## Definition of done

- /shop route renders and matches the reference design visually on desktop
- Sticky navbar still works on this page
- All 12 books render with correct covers, titles, authors, prices
- Cart context is global, persists to localStorage, navbar badge updates
- Clicking any + or Add to cart button adds to cart
- Favorites persist to localStorage and heart icon toggles filled state
- Search, category, format, price, clubs, and on-shelf filters all actually filter results
- Sort dropdown actually re-orders results
- Pagination works and shows correct page
- Mobile: filter drawer opens/closes, grid collapses correctly
- Committed and pushed to GitHub; Vercel build passes
