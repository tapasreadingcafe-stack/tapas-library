# Blog Page Spec — Tapas Reading Cafe

Build the Blog page at `/blog` matching the reference design. Branded as "The Journal" — a slow-publishing editorial page with essays, interviews, marginalia, club notes, translator diaries, and recipes.

---

## Page structure (top to bottom)

### 1. Hero band (green, inside sticky nav-band)

- Pink-dot kicker: `• THE JOURNAL`
- H1 headline, large serif, tight letter-spacing:
  > Notes from the *reading room.*
  - "Notes from the" in near-black serif bold
  - "reading room." in purple italic serif (`#8F4FD6`)
- Right-column supporting paragraph:
  > Essays, marginalia, and conversations with writers, translators, and cooks. Posted slowly, always from somewhere inside the cafe.

### 2. Featured + sidebar row (2fr / 1fr)

Left: dark featured card with lime kicker, huge serif headline (with lime-italic + white-italic spans), author row with orange avatar, decorative purple blob bottom-right. Right: two stacked cards — "Staff Pick" (pink kicker) and "Conversation" (purple kicker).

### 3. Archive

- Heading row: `THE ARCHIVE` kicker, `More from *the room.*` H2, right-side lede.
- Single-select category pills + debounced search input.
- 9-article 3-column grid. Each card: colored banner + excerpt + author row.
- Clicking any card routes to `/blog/:slug`.

### 4. The Dispatch newsletter

Full-width lime card, 2-column: kicker + title + lede on the left; inline pill form (email input + pink Subscribe button) on the right. Validates, shows success state, logs payload with TODO for wiring.

### 5. Site footer

Uses global `SiteFooter`.

---

## Archive articles (seed data)

See `tapas-store/src/data/journalPosts.js` for the 9 articles + featured + 2 sidebar.

---

## Definition of done

- [ ] `/blog` renders per design; nav + footer render
- [ ] Featured + 2 sidebar cards, 9 archive cards, dispatch newsletter all present
- [ ] Category pills single-select, `All` resets, search debounced, combined AND filter, empty state renders
- [ ] Cards route to `/blog/:slug` stub
- [ ] Newsletter form validates + shows success + logs payload
- [ ] Responsive per standard breakpoints
- [ ] Committed + pushed
