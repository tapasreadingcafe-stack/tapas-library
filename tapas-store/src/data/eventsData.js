// Seed data for /events.
//
// Calendar events are anchored to April 2026 (the user's current
// month per the staff-app clock). Each event knows its category so
// the filter pills can drop in/out of the calendar and the upcoming
// list together.

// Pastel chip palette (referenced from eventsStyles + inline styles).
export const CHIP = {
  lavender:   '#E8D9FF',
  sage:       '#D9F2BC',
  pink:       '#FFD6E0',
  peach:      '#FFE4CC',
  softPink:   '#FCCEE0',
};

// Badge palette for the upcoming-event cards.
export const BADGE = {
  weekly:     { label: 'WEEKLY',      bg: CHIP.sage,   fg: '#1a1a1a' },
  prixFixe:   { label: 'PRIX FIXE',   bg: CHIP.peach,  fg: '#1a1a1a' },
  monthly:    { label: 'MONTHLY',     bg: CHIP.lavender, fg: '#1a1a1a' },
  dropIn:     { label: 'DROP IN',     bg: '#fff',      fg: '#1a1a1a', border: '#ececea' },
  guestNight: { label: 'GUEST NIGHT', bg: CHIP.peach,  fg: '#1a1a1a' },
};

// Categories the filter pills expose.
export const EVENT_FILTERS = [
  { key: 'all',            label: 'All events' },
  { key: 'book-club',      label: 'Book clubs' },
  { key: 'poetry-supper',  label: 'Poetry suppers' },
  { key: 'silent-reading', label: 'Silent reading' },
  { key: 'guest-night',    label: 'Guest nights' },
  { key: 'members-only',   label: 'Members only' },
];

// Calendar events — { date: 'YYYY-MM-DD', chip: pastel color, label,
// category }. Anchored to April 2026 to match the seeded
// "Upcoming events" card list below.
export const CALENDAR_EVENTS = [
  { date: '2026-04-03', label: 'Slow Fiction Â· 7p',    chip: 'lavender', category: 'book-club',      targetSlug: null },
  { date: '2026-04-05', label: 'Silent Reading Â· 10a', chip: 'sage',     category: 'silent-reading', targetSlug: null },
  { date: '2026-04-07', label: 'Translators Â· 7:30p',  chip: 'peach',    category: 'guest-night',    targetSlug: null },
  { date: '2026-04-10', label: 'Slow Fiction Â· 7p',    chip: 'lavender', category: 'book-club',      targetSlug: null },
  { date: '2026-04-11', label: 'Poetry Supper Â· 8p',   chip: 'pink',     category: 'poetry-supper',  targetSlug: null },
  { date: '2026-04-12', label: 'Silent Reading Â· 10a', chip: 'sage',     category: 'silent-reading', targetSlug: null },
  { date: '2026-04-17', label: 'Slow Fiction Â· 7p',    chip: 'lavender', category: 'book-club',      targetSlug: null },
  { date: '2026-04-18', label: 'First Draft Â· 7p',     chip: 'softPink', category: 'members-only',   targetSlug: null },
  { date: '2026-04-19', label: 'Silent Reading Â· 10a', chip: 'sage',     category: 'silent-reading', targetSlug: null },
  { date: '2026-04-23', label: 'Slow Fiction Â· 7p',    chip: 'lavender', category: 'book-club',      targetSlug: 'slow-fiction-apr-23' },
  { date: '2026-04-24', label: 'Novella Supper Â· 4p',  chip: 'lavender', category: 'book-club',      targetSlug: 'novella-supper-apr-24' },
  { date: '2026-04-26', label: 'Silent Reading Â· 10a', chip: 'sage',     category: 'silent-reading', targetSlug: 'silent-reading-apr-26' },
  { date: '2026-04-27', label: 'Translators Â· 7:30p',  chip: 'peach',    category: 'guest-night',    targetSlug: 'translators-apr-30' },
  { date: '2026-05-01', label: 'Slow Fiction Â· 7p',    chip: 'lavender', category: 'book-club',      targetSlug: null },
];

// Upcoming events — the stacked cards under the calendar.
export const UPCOMING_EVENTS = [
  {
    slug: 'slow-fiction-apr-23',
    dateMonth: 'APR', dateDay: 23, iso: '2026-04-23',
    title: 'Slow Fiction',
    italic: 'Club',
    description: 'Opening pages of The Magic Mountain. Sherry, olives, long table.',
    time: 'Thu Â· 7:00p',
    seats: '22 of 24 seats',
    badge: 'weekly',
    cta: { label: 'RSVP', action: 'rsvp' },
    category: 'book-club',
  },
  {
    slug: 'novella-supper-apr-24',
    dateMonth: 'APR', dateDay: 24, iso: '2026-04-24',
    title: 'Novella',
    italic: 'Supper',
    description: 'Read a short novel over the afternoon, then dinner and discussion.',
    time: 'Fri Â· 4:00p',
    seats: '6 of 12 seats',
    badge: 'prixFixe',
    cta: { label: 'RSVP', action: 'rsvp' },
    category: 'book-club',
  },
  {
    slug: 'silent-reading-apr-26',
    dateMonth: 'APR', dateDay: 26, iso: '2026-04-26',
    title: 'Saturday',
    italic: 'Silent Reading',
    description: 'Two hours of quiet. Coffee, toast, no phones, no introductions.',
    time: 'Sat Â· 10:00a',
    seats: 'Drop-in Â· no RSVP',
    badge: 'weekly',
    cta: { label: 'Drop in', action: 'drop-in' },
    category: 'silent-reading',
  },
  {
    slug: 'translators-apr-30',
    dateMonth: 'APR', dateDay: 30, iso: '2026-04-30',
    title: 'Translators',
    italic: 'in Conversation',
    description: 'Sophie Hughes and Sean Cotter on what gets lost, what gets found.',
    time: 'Wed Â· 7:30p',
    seats: '14 of 18 seats',
    badge: 'guestNight',
    cta: { label: 'RSVP', action: 'rsvp' },
    category: 'guest-night',
  },
  {
    slug: 'poetry-small-plates-may-8',
    dateMonth: 'MAY', dateDay: 8, iso: '2026-05-08',
    title: 'Poetry on',
    italic: 'Small Plates',
    description: "A six-course menu paired to six poems â Lorca, Szymborska, Berry.",
    time: 'Fri Â· 8:00p',
    seats: 'â¹4,080 / â¹3,060 members',
    badge: 'prixFixe',
    cta: { label: 'Reserve', action: 'reserve' },
    category: 'poetry-supper',
  },
];

// Weekly clubs grid.
export const CLUBS = [
  {
    id: 'slow-fiction',
    schedule: 'Thursdays Â· 7:00p',
    title: 'Slow',
    titleItalic: 'Fiction',
    titleTail: ' Club',
    body: 'One long novel per season; eight meetings to finish it. Currently: The Magic Mountain.',
    seats: 24,
    status: 'Waitlist',
    category: 'book-club',
  },
  {
    id: 'translators',
    schedule: 'Mondays Â· 7:30p',
    title: 'Translators in ',
    titleItalic: 'Translation',
    body: "One book a month, read alongside its original where possible. Bring a dictionary â or donât.",
    seats: 18,
    status: '3 open',
    category: 'guest-night',
  },
  {
    id: 'poetry-small-plates',
    schedule: 'Second Fridays Â· 8:00p',
    title: 'Poetry & ',
    titleItalic: 'Small Plates',
    body: "A tasting menu built around one poetâs body of work. Ends with wine and a recitation.",
    seats: 16,
    status: 'Prix fixe',
    category: 'poetry-supper',
  },
  {
    id: 'first-draft',
    schedule: 'Third Fridays Â· 7:00p',
    title: 'First-Draft ',
    titleItalic: 'Friday',
    body: 'A low-stakes workshop for work-in-progress. Two minutes on the floor, kind notes from the room.',
    seats: null,
    status: 'Members Â· open seat',
    category: 'members-only',
  },
  {
    id: 'silent-reading',
    schedule: 'Saturdays Â· 10:00a',
    title: 'Saturday ',
    titleItalic: 'Silent Reading',
    body: 'Two hours of pure, uninterrupted reading. No discussion, no phones â just a pot of coffee.',
    seats: null,
    status: 'All welcome Â· drop in',
    category: 'silent-reading',
  },
  {
    id: 'novella-supper',
    schedule: 'Monthly Â· Thursdays',
    title: 'The ',
    titleItalic: 'Novella',
    titleTail: ' Supper',
    body: 'Read a short novel in one sitting with the group. Then dine together and discuss it.',
    seats: 12,
    status: 'Waitlist',
    category: 'book-club',
  },
];

// Featured supper — the big dark card near the bottom.
export const FEATURED_SUPPER = {
  kicker: 'May 8 Â· Prix fixe',
  titleLead: 'Poetry on ',
  titleItalic: 'Small Plates.',
  body: "A six-course tasting menu paired to six poems. The kitchen cooks what weâve been reading; the room reads what weâre eating. â¹4,080, â¹3,060 for members, wine pairing â¹2,050.",
  cta: { label: 'Reserve a seat', action: 'reserve' },
  slug: 'poetry-small-plates-may-8',
  menu: [
    { n: '01', dish: 'Pan con tomate',       poem: 'Lorca, \u201CCanci\u00F3n del naranjo seco\u201D' },
    { n: '02', dish: 'Boquerones & lemon',   poem: 'Szymborska, \u201CPossibilities\u201D' },
    { n: '03', dish: 'Almond-saffron soup',  poem: 'Berry, \u201CThe Peace of Wild Things\u201D' },
    { n: '04', dish: 'Braised octopus',      poem: 'Neruda, \u201COde to the Sea\u201D' },
    { n: '05', dish: 'Membrillo & Manchego', poem: 'Plath, \u201CBlackberrying\u201D' },
    { n: '06', dish: 'Orange-olive-oil cake', poem: 'Oliver, \u201CThe Summer Day\u201D' },
  ],
};

// Helpers -------------------------------------------------------------
export function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function actionMessage(action, event) {
  switch (action) {
    case 'rsvp':
      return `Reserved â weâll email you confirmation. See you ${event.time}.`;
    case 'reserve':
      return 'Reserved â confirmation will arrive within 10 minutes.';
    case 'drop-in':
      return 'No RSVP needed â just come. Saturdays, 10a, front door.';
    default:
      return 'Saved. Weâll be in touch.';
  }
}
