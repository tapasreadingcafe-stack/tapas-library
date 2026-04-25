# Events Page Spec — Tapas Reading Cafe

Build the Events page at `/events` matching the reference design. Book clubs / events / suppers / silent reading hub.

Prices are in INR (₹), consistent with the Shop page. Guest seat = ₹650; Poetry supper = ₹4,080 / ₹3,060 members; wine pairing ₹2,050.

---

## Page structure

1. **Hero band** — pink-dot kicker `• EVENTS & BOOK CLUBS`, H1 "Six clubs, one room, *all welcome.*" (purple italic last line), right-column lede. Curve transition.
2. **Filter + view toggle row** — 6 category pills (single-select, `All events` default) + lime Calendar/List segmented control.
3. **Calendar view** — month grid with prev/next nav, today's cell has pink-filled date circle, pastel event chips.
4. **List view** — same Upcoming events list, calendar hidden.
5. **Upcoming events** — 5 stacked cards: date block (mono month + big serif day) / title+italic / time+seats / badge pill / RSVP CTA.
6. **Weekly clubs** — 3×2 grid, pink-dot header, italic-accent title, stats row.
7. **Featured Poetry on Small Plates** — dark card with lime menu card (6 numbered courses).
8. **Site footer** — global `SiteFooter`.

---

## Functionality

- Category pills filter calendar + list; `All events` resets.
- Calendar/List toggle with sliding pill indicator.
- Calendar prev/next month nav. Today cell gets pink-filled treatment.
- Clicking a date/chip smooth-scrolls to matching event card.
- RSVP / Reserve / Drop-in buttons trigger `handleEventAction(event, action)` — alert for now, log payload, TODO for real backend.

---

## Seed data

See `tapas-store/src/data/eventsData.js` for:
- 14 calendar events (April 2026)
- 5 stacked upcoming-event cards
- 6 weekly clubs
- 6-course supper menu

---

## Pastel chip tokens

- `--chip-lavender` #E8D9FF (book clubs)
- `--chip-sage`     #D9F2BC (silent reading)
- `--chip-pink`     #FFD6E0 (poetry supper)
- `--chip-peach`    #FFE4CC (translators)
- `--chip-soft-pink` #FCCEE0 (first draft)

---

## Definition of done

- [ ] `/events` renders per design on desktop
- [ ] Nav Events link routes here with active state; footer renders
- [ ] Hero + filter row + calendar + list toggle all present
- [ ] 14 calendar events visible, today circle, prev/next nav works
- [ ] 5 upcoming event cards render with correct CTAs
- [ ] 6 clubs grid + featured supper (dark + lime menu card)
- [ ] CTAs trigger confirmation alerts + console log
- [ ] Responsive per standard breakpoints
- [ ] Committed + pushed
