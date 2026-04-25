// Seed data for the /library page — 18 books across 3 shelves.
// Each book carries the category tags the filter row exposes.
// `status` is either { kind: 'available' } or
// { kind: 'out', returnDate: 'M/D' }.

export const LIBRARY_CATEGORIES = [
  'All',
  'Fiction',
  'Poetry',
  'In Translation',
  'Essays',
  'Memoir',
  'Spanish',
  "Members' Picks",
];

export const LIBRARY_STATS = [
  { value: '2,412', label: 'Books on shelf',   accent: true  },
  { value: '312',   label: 'Active borrowers', accent: false },
  { value: '18',    label: 'Languages',        accent: false },
  { value: '47',    label: 'New this month',   accent: false },
];

export const LIBRARY_FEATURED = {
  kicker: 'Featured shelf · April',
  headline: 'Books in translation,',
  accent: 'chosen by translators.',
  body: "Fourteen titles picked by the translators who’d kill for them. Margaret Jull Costa, Sean Cotter, Sophie Hughes, and Jennifer Croft each pulled three.",
  ctaLabel: 'Browse the shelf',
  ctaTarget: 'shelf-translation',
  // Spines for the illustration. Each entry is [coverVariant, heightPct].
  spines: [
    ['purple', 96], ['ink', 82],  ['orange', 70], ['pink', 88],
    ['taupe', 76],  ['orange', 92], ['lime', 80],  ['ink', 68],
    ['pink', 94],   ['lime', 72], ['taupe', 86], ['purple', 78],
  ],
};

const available = () => ({ kind: 'available' });
const out = (returnDate) => ({ kind: 'out', returnDate });

export const LIBRARY_SHELVES = [
  {
    id: 'shelf-slow-fiction',
    number: '01',
    name: 'Slow Fiction',
    totals: { titles: 142, outOnLoan: 8 },
    books: [
      { id: 'magic-mountain',       title: 'The Magic Mountain',     author: 'T. Mann',       cover: 'purple', status: available(),  categories: ['Fiction', 'In Translation'] },
      { id: 'austerlitz',           title: 'Austerlitz',             author: 'W.G. Sebald',   cover: 'ink',    status: available(),  categories: ['Fiction', 'In Translation'] },
      { id: 'middlemarch',          title: 'Middlemarch',            author: 'G. Eliot',      cover: 'orange', status: out('5/2'),   categories: ['Fiction'] },
      { id: 'war-and-peace',        title: 'War & Peace',            author: 'L. Tolstoy',    cover: 'pink',   status: available(),  categories: ['Fiction', 'In Translation'] },
      { id: 'the-waves',            title: 'The Waves',              author: 'V. Woolf',      cover: 'lime',   status: available(),  categories: ['Fiction', "Members' Picks"] },
      { id: 'in-search-of-lost-time', title: 'In Search of Lost Time', author: 'Proust',      cover: 'taupe',  status: out('5/14'),  categories: ['Fiction', 'In Translation'] },
    ],
  },
  {
    id: 'shelf-translation',
    number: '02',
    name: 'In Translation',
    totals: { titles: 287, outOnLoan: 14 },
    books: [
      { id: 'solenoid',       title: 'Solenoid',         author: 'C\u0103rt\u0103rescu', cover: 'ink',    status: available(), categories: ['Fiction', 'In Translation', "Members' Picks"] },
      { id: 'the-years',      title: 'The Years',        author: 'A. Ernaux',            cover: 'orange', status: available(), categories: ['Memoir', 'In Translation'] },
      { id: 'minor-detail',   title: 'Minor Detail',     author: 'A. Shibli',            cover: 'purple', status: available(), categories: ['Fiction', 'In Translation'] },
      { id: 'flights',        title: 'Flights',          author: 'O. Tokarczuk',         cover: 'pink',   status: out('4/30'), categories: ['Fiction', 'In Translation'] },
      { id: 'kitchen',        title: 'Kitchen',          author: 'B. Yoshimoto',         cover: 'lime',   status: available(), categories: ['Fiction', 'In Translation'] },
      { id: 'the-employees',  title: 'The Employees',    author: 'O. Ravn',              cover: 'taupe',  status: available(), categories: ['Fiction', 'In Translation'] },
    ],
  },
  {
    id: 'shelf-poetry-essays',
    number: '03',
    name: 'Poetry & Essays',
    totals: { titles: 176, outOnLoan: 3 },
    books: [
      { id: 'bluets',              title: 'Bluets',             author: 'M. Nelson',   cover: 'pink',   status: available(),  categories: ['Essays', 'Poetry', "Members' Picks"] },
      { id: 'a-room-of-ones-own',  title: "A Room of One’s Own", author: 'V. Woolf',  cover: 'lime',  status: available(),  categories: ['Essays', "Members' Picks"] },
      { id: 'citizen',             title: 'Citizen',            author: 'C. Rankine',  cover: 'purple', status: available(),  categories: ['Poetry', 'Essays', "Members' Picks"] },
      { id: 'devotions',           title: 'Devotions',          author: 'M. Oliver',   cover: 'orange', status: out('4/26'),  categories: ['Poetry'] },
      { id: 'the-argonauts',       title: 'The Argonauts',      author: 'M. Nelson',   cover: 'ink',    status: available(),  categories: ['Essays', 'Memoir'] },
      { id: 'upstream',            title: 'Upstream',           author: 'M. Oliver',   cover: 'taupe',  status: available(),  categories: ['Essays', 'Poetry'] },
    ],
  },
];

export const LIBRARY_HOUSE_RULES = [
  { n: '01', title: 'Borrow two at a time.',  body: 'Write your name, book, and date in the ledger.' },
  { n: '02', title: 'Keep them three weeks.', body: 'If you need longer, pencil in an extension.' },
  { n: '03', title: 'Return to the drop-box.', body: 'Right by the door. No waiting, no staff needed.' },
  { n: '04', title: 'Donate if you can.',     body: 'Orange shelf in the back. We sort weekly.' },
];

export function matchesBook(book, { category, query }) {
  if (category && category !== 'All' && !book.categories.includes(category)) return false;
  if (query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
  }
  return true;
}
