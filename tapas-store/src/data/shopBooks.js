// Seed data for the Shop page. These are the 12 books pinned in
// SHOP_PAGE_SPEC.md — exact titles, authors, covers, and prices.
// Prices are in INR (₹). When we later pull the catalogue from
// Supabase, match this shape so the Shop components don't change.

export const SHOP_BOOKS = [
  {
    id: 'magic-mountain',
    title: 'The Magic Mountain',
    author: 'Thomas Mann',
    coverLabel: 'The Magic Mountain',
    coverVariant: 'purple',
    price: 1299,
    categories: ['Fiction', 'Translation'],
    format: 'Paperback',
    clubs: ['Slow Fiction'],
    inStock: true,
    signed: false,
    newThisWeek: false,
  },
  {
    id: 'the-years',
    title: 'The Years',
    author: 'Annie Ernaux',
    coverLabel: 'The Years',
    coverVariant: 'orange',
    price: 999,
    categories: ['Memoir', 'Translation'],
    format: 'Paperback',
    clubs: ['Translators'],
    inStock: true,
    signed: false,
    newThisWeek: true,
  },
  {
    id: 'solenoid',
    title: 'Solenoid',
    author: 'Mircea Cărtărescu',
    coverLabel: 'Solenoid',
    coverVariant: 'ink',
    price: 1299,
    categories: ['Fiction', 'Translation'],
    format: 'Paperback',
    clubs: ['Slow Fiction', 'Translators'],
    inStock: true,
    signed: true,
    newThisWeek: true,
  },
  {
    id: 'bluets',
    title: 'Bluets',
    author: 'Maggie Nelson',
    coverLabel: 'Bluets',
    coverVariant: 'pink',
    price: 799,
    categories: ['Essays', 'Poetry'],
    format: 'Paperback',
    clubs: ['Poetry'],
    inStock: true,
    signed: false,
    newThisWeek: false,
  },
  {
    id: 'a-room-of-ones-own',
    title: 'A Room of One\u2019s Own',
    author: 'Virginia Woolf',
    coverLabel: 'A Room of One\u2019s Own',
    coverVariant: 'lime',
    price: 499,
    categories: ['Essays'],
    format: 'Paperback',
    clubs: [],
    inStock: true,
    signed: false,
    newThisWeek: false,
  },
  {
    id: 'the-waves',
    title: 'The Waves',
    author: 'Virginia Woolf',
    coverLabel: 'The Waves',
    coverVariant: 'taupe',
    price: 899,
    categories: ['Fiction'],
    format: 'Hardcover',
    clubs: ['Slow Fiction'],
    inStock: true,
    signed: false,
    newThisWeek: false,
  },
  {
    id: 'minor-detail',
    title: 'Minor Detail',
    author: 'Adania Shibli',
    coverLabel: 'Minor Detail',
    coverVariant: 'orange',
    price: 899,
    categories: ['Fiction', 'Translation'],
    format: 'Paperback',
    clubs: ['Novella', 'Translators'],
    inStock: false,
    signed: false,
    newThisWeek: false,
  },
  {
    id: 'checkout-19',
    title: 'Checkout 19',
    author: 'Claire-Louise Bennett',
    coverLabel: 'Checkout 19',
    coverVariant: 'purple',
    price: 999,
    categories: ['Fiction', 'Small Press'],
    format: 'Paperback',
    clubs: ['Slow Fiction'],
    inStock: true,
    signed: true,
    newThisWeek: true,
  },
  {
    id: 'the-thiefs-journal',
    title: 'The Thief\u2019s Journal',
    author: 'Jean Genet',
    // The spec asks the cover to display "Nightboat" (the imprint)
    // while the card below keeps the real title and author.
    coverLabel: 'Nightboat',
    coverVariant: 'cream',
    price: 999,
    categories: ['Fiction', 'Translation'],
    format: 'Paperback',
    clubs: ['Translators'],
    inStock: true,
    signed: false,
    newThisWeek: false,
  },
  {
    id: 'austerlitz',
    title: 'Austerlitz',
    author: 'W. G. Sebald',
    coverLabel: 'Austerlitz',
    coverVariant: 'ink',
    price: 1199,
    categories: ['Fiction', 'Translation'],
    format: 'Hardcover',
    clubs: ['Slow Fiction', 'Translators'],
    inStock: true,
    signed: false,
    newThisWeek: false,
  },
  {
    id: 'dept-of-speculation',
    title: 'Dept. of Speculation',
    author: 'Jenny Offill',
    coverLabel: 'Dept. of Speculation',
    coverVariant: 'pink',
    price: 799,
    categories: ['Fiction'],
    format: 'Paperback',
    clubs: ['Novella'],
    inStock: true,
    signed: false,
    newThisWeek: true,
  },
  {
    id: 'citizen',
    title: 'Citizen',
    author: 'Claudia Rankine',
    coverLabel: 'Citizen',
    coverVariant: 'lime',
    price: 1099,
    categories: ['Poetry', 'Essays'],
    format: 'Paperback',
    clubs: ['Poetry'],
    inStock: true,
    signed: false,
    newThisWeek: false,
  },
];

// Category display list (with inflated count badges per spec).
export const SHOP_CATEGORIES = [
  { key: 'Fiction',      label: 'Fiction',      count: 142 },
  { key: 'Poetry',       label: 'Poetry',       count: 48  },
  { key: 'Translation',  label: 'Translation',  count: 67  },
  { key: 'Essays',       label: 'Essays',       count: 34  },
  { key: 'Memoir',       label: 'Memoir',       count: 29  },
  { key: 'Small Press',  label: 'Small Press',  count: 81  },
];

export const SHOP_FORMATS = ['Paperback', 'Hardcover', 'Used'];
export const SHOP_CLUBS   = ['Slow Fiction', 'Translators', 'Poetry', 'Novella'];

export const SHOP_PRICE_MIN = 199;
export const SHOP_PRICE_MAX = 1999;

export const MEMBER_DISCOUNT_RATE = 0.10;

export const FEATURED_BOOK_ID = 'solenoid';

// Human-readable INR.
export function formatInr(n) {
  const v = Math.round(Number(n) || 0);
  return `\u20B9${v.toLocaleString('en-IN')}`;
}
