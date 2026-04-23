# Contact Page Spec — Tapas Reading Cafe

Build the Contact page at `/contact` matching the reference design.

A reference HTML file is attached at `~/Downloads/Contact (1).html` — read it in-place for exact structure, classes, and styling. This spec is the source of truth. Do NOT copy Contact.html into the repo or ship it.

---

## Page structure (top to bottom)

### 1. Hero band (green, inside sticky nav-band)

- Pink-dot kicker: `• VISIT & CONTACT`
- H1: `Come *read with us.*`
  - "Come" in near-black serif bold
  - "read with us." in purple italic (`#8F4FD6`), serif
- Right-column supporting paragraph:
  > 14 Haven Street, right off the square. No reservations for reading — just walk in. For supper events, private bookings, and press, use the form below.
- Curved SVG bottom transitioning green → cream page background

### 2. Hours strip (7-column grid, white card with border)

Single row, 7 equal columns separated by 1px vertical rules, rounded-18px card. Each day:
- Mono 11px uppercase day name (e.g. `MON`, `TUE`, `WED · TODAY`) in muted color
- Serif bold 18px hours value below (e.g. `10a–11p` or `Closed` in pink)

Today's column (detect current day client-side): lime background (`#C9F27F`) with `· TODAY` appended to the day name.

Default hours (edit in one config file):
- Mon — Closed (pink text)
- Tue — 10a–11p
- Wed — 10a–11p
- Thu — 10a–11p
- Fri — 10a–12a
- Sat — 9a–12a
- Sun — 9a–9p

### 3. Map card (lime green illustrated map)

Large rounded-24px card, lime background (`#C9F27F`), height ~380px, `margin-bottom: 60px`.

See reference HTML for exact SVG road paths, Square circle, pin markup.

### 4. Contact layout — 2-column grid (Find us / Write us)

Left: white info card with 8 rows (Address, Phone, Email, Events, Press, Parking, Transit, Accessibility).
Right: dark form card (Name, Email, Subject, Message, Send button).

### 5. FAQ section

6 questions as native `<details>` accordions, 2-column grid, first one open by default.

### 6. Site footer

Uses the global `SiteFooter` component already on every page.

---

## Functionality

- Today highlighting: client-side detect current weekday, apply lime background, append `· Today`.
- Form submit: preventDefault, validate name+email, replace button with `Sent — we'll write back soon`, disable inputs, console.log payload. TODO for real endpoint.
- FAQ: native `<details>`/`<summary>`, CSS-driven `+`/`−` toggle.
- Email rows: `mailto:` links.

---

## Styling tokens

- `--lime`: `#caf27e` (matches the site nav, slightly adjusted from spec's `#C9F27F` after the nav color update)
- `--pink`: `#E0004F`
- `--purple`: `#8F4FD6`
- `--ink`: `#1a1a1a`
- Fonts: Fraunces, Inter, JetBrains Mono

---

## Definition of done

- [ ] `/contact` route renders
- [ ] Sticky navbar + global footer render
- [ ] Hero + hours strip (with today) + map + Find us + Write us + FAQ all present
- [ ] Form placeholder submit + FAQ accordion + mailto links all work
- [ ] Nav "Contact Us" routes to `/contact` with active state
- [ ] Responsive per standard breakpoints
- [ ] Committed + pushed
