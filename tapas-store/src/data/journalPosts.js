// Seed data for /blog (The Journal). One featured, two sidebar, nine
// archive articles. Titles use the {text, em} split so components
// can render italic accents without parsing HTML.

export const JOURNAL_FEATURED = {
  slug: 'on-reading-very-slowly',
  kicker: 'Featured',
  publishedAt: '2026-04-18',
  title: [
    { t: 'On reading ' },
    { t: 'very slowly', em: 'lime' },
    { t: ' â three months inside ' },
    { t: 'The Magic Mountain.', em: 'white' },
  ],
  author: { name: 'Marisol Reyes', initial: 'M', role: 'Slow Fiction Club host' },
  readMinutes: 14,
};

export const JOURNAL_SIDEBAR = [
  {
    slug: 'minor-detail-staff-pick',
    kicker: 'Staff Pick',
    kickerColor: 'pink',
    title: [
      { t: 'Why weâre pressing ' },
      { t: 'Minor Detail', em: 'purple' },
      { t: ' into every hand this month.' },
    ],
    excerpt: "Shibliâs sentences sit so quietly on the page they make the room itself feel like itâs listening.",
    author: { name: 'Ava Park', initial: 'A' },
    readMinutes: 6,
  },
  {
    slug: 'jull-costa-interview',
    kicker: 'Conversation',
    kickerColor: 'purple',
    title: [
      { t: 'Margaret Jull Costa on the word that broke her heart for a week.' },
    ],
    excerpt: 'A translatorâs notebook: what to do when a sentence is faithful, legal, and still wrong.',
    author: { name: 'Julien', initial: 'J' },
    readMinutes: 9,
  },
];

export const JOURNAL_CATEGORIES = [
  'All',
  'Essays',
  'Interviews',
  'Marginalia',
  'Club Notes',
  'Translator Diaries',
  'Recipes',
];

// Display label on the pill overlay inside each card banner.
export const CATEGORY_PILL = {
  Essay: 'ESSAY',
  Interview: 'INTERVIEW',
  Marginalia: 'MARGINALIA',
  'Club Notes': 'CLUB NOTES',
  Recipe: 'RECIPE',
  'Translator Diary': 'TRANSLATOR DIARY',
};

// Map singular card category to plural filter-pill label (so clicking
// "Essays" matches articles tagged "Essay", etc).
export const FILTER_TO_CATEGORY = {
  Essays: 'Essay',
  Interviews: 'Interview',
  Marginalia: 'Marginalia',
  'Club Notes': 'Club Notes',
  'Translator Diaries': 'Translator Diary',
  Recipes: 'Recipe',
};

export const JOURNAL_ARCHIVE = [
  {
    slug: 'case-for-the-very-long-book',
    category: 'Essay',
    color: 'purple',
    title: [
      { t: 'The case for ' },
      { t: 'the very long book.', em: true },
    ],
    excerpt: 'There is a particular kind of reader formed only by books you live inside for two seasons. Notes from a year of doorstoppers.',
    author: { name: 'Marisol', initial: 'M' },
    readMinutes: 14,
    publishedAt: '2026-04-12',
  },
  {
    slug: 'sophie-hughes-lost-found',
    category: 'Interview',
    color: 'orange',
    title: [
      { t: 'Sophie Hughes on ' },
      { t: 'what gets lost, what gets found.', em: true },
    ],
    excerpt: 'The translator of Fernanda Melchor visits the cafe for a long afternoon of coffee and two very exact questions.',
    author: { name: 'Julien', initial: 'J' },
    readMinutes: 9,
    publishedAt: '2026-04-06',
  },
  {
    slug: 'pencil-notes-used-austerlitz',
    category: 'Marginalia',
    color: 'ink',
    title: [
      { t: 'Pencil notes from ' },
      { t: 'a used Austerlitz.', em: true },
    ],
    excerpt: 'A previous reader left twenty-seven pencil stars in our copy of Sebald. We tried to understand what they meant.',
    author: { name: 'Ava', initial: 'A' },
    readMinutes: 7,
    publishedAt: '2026-03-30',
  },
  {
    slug: 'twelve-things-room-said-ernaux',
    category: 'Club Notes',
    color: 'pink',
    title: [
      { t: 'Twelve things ' },
      { t: 'the room said', em: true },
      { t: ' about Ernaux.' },
    ],
    excerpt: "Transcripts from our Slow Fiction Clubâs March meeting â what a first-time reader noticed that the rest of us had stopped seeing.",
    author: { name: 'Marisol', initial: 'M' },
    readMinutes: 8,
    publishedAt: '2026-03-24',
  },
  {
    slug: 'almond-saffron-soup-neruda',
    category: 'Recipe',
    color: 'lime',
    title: [
      { t: 'Almond-saffron soup, ' },
      { t: 'as read by Neruda.', em: true },
    ],
    excerpt: 'The house soup, named after the ode. Recipe in a paragraph, serves four, tastes like someone read it to you.',
    author: { name: 'Rafa', initial: 'R' },
    readMinutes: 5,
    publishedAt: '2026-03-18',
  },
  {
    slug: 'quiet-hour-whats-in-it',
    category: 'Essay',
    color: 'taupe',
    title: [
      { t: 'The quiet hour, ' },
      { t: 'and whatâs in it.', em: true },
    ],
    excerpt: 'After 8pm the lights drop and the laptops close. What actually happens in that hour, from someone who sits through all of them.',
    author: { name: 'Ava', initial: 'A' },
    readMinutes: 11,
    publishedAt: '2026-03-12',
  },
  {
    slug: 'week-inside-a-single-paragraph',
    category: 'Translator Diary',
    color: 'orange',
    title: [
      { t: 'A week inside ' },
      { t: 'a single paragraph.', em: true },
    ],
    excerpt: "Guest diarist Sean Cotter on C\u0103rt\u0103rescuâs Solenoid â and the week he lost to three consecutive subordinate clauses.",
    author: { name: 'Sean', initial: 'S' },
    readMinutes: 13,
    publishedAt: '2026-03-06',
  },
  {
    slug: 'poetry-small-plates-origin',
    category: 'Club Notes',
    color: 'purple',
    title: [
      { t: 'Why ' },
      { t: 'Poetry & Small Plates', em: true },
      { t: ' nearly didnât happen.' },
    ],
    excerpt: 'The origin story of our strangest supper: a chef, six poets, and an overbooked Friday night.',
    author: { name: 'Rafa', initial: 'R' },
    readMinutes: 8,
    publishedAt: '2026-02-28',
  },
  {
    slug: 'jennifer-croft-invisible-translator',
    category: 'Interview',
    color: 'pink',
    title: [
      { t: 'Jennifer Croft on ' },
      { t: 'the invisible translator.', em: true },
    ],
    excerpt: 'A long conversation about names on covers, authorship, and what a reader actually owes the second writer of a book.',
    author: { name: 'Julien', initial: 'J' },
    readMinutes: 12,
    publishedAt: '2026-02-22',
  },
];

// Flatten title spans into a single string for search matching.
export function titleText(title) {
  if (typeof title === 'string') return title;
  if (!Array.isArray(title)) return '';
  return title.map((s) => s?.t || '').join('');
}

export function formatPublished(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function isValidEmail(s) {
  if (typeof s !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
