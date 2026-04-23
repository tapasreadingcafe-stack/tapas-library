# About Us Page Spec — Tapas Reading Cafe

Static editorial page at `/about`. Manifesto, history, team, stats, press quotes.

---

## Sections

1. **Hero** — pink-dot kicker + "A small room *for big books.*" H1 + right-column lede + curve.
2. **Manifesto** — 2-col. Left: purple kicker + "We built the *cafe we wanted* to read in." H2. Right: three prose paragraphs with pink serif drop-caps (T, M, W).
3. **Stats strip** — full-width lime card with 4 stats (2,412 books, 318 members, 1,040 club meetings, 64 translators) inside a subdivided bordered container.
4. **A brief history** — full-width dark card with lime kicker + "How *the room* got here." H2 + 4-col timeline (2021, 2022, 2023, current year) with lime serif year heads.
5. **Three compromises** — 3-col card grid; lime 01, white 02 w/ pink number, orange 03 w/ lime italic accent.
6. **Team** — 4-col cards, each with an initials color block + name + role + "Reading:" line.
7. **Press** — 4-col cards with italic purple source, curly-quoted blurb, mono footer.
8. **Site footer** — global `SiteFooter`.

---

## Content

All content driven from `tapas-store/src/data/aboutContent.js`. Edit that file to change copy, stats, team, timeline, compromises, or press.

---

## Wiring

- Route `/about` already exists; About component replaced.
- Nav "About Us" already routes here — active state via `useLocation`.

---

## Definition of done

- [ ] `/about` renders per design
- [ ] Nav + footer both render
- [ ] Drop caps (T / M / W) render pink on the three manifesto paragraphs
- [ ] Stats strip + brief history + compromises + team + press all present with correct color treatments
- [ ] Responsive per standard breakpoints
- [ ] Committed + pushed
