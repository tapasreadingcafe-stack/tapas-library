// Sign-up page config + defaults. Edit here to add a tier, change a
// club, or adjust the perks list without touching component code.

export const MEMBERSHIP_PERKS = [
  'Priority seats at all six weekly clubs',
  'A quarterly book, chosen by Ava for you',
  '10% off every book; 20% on member picks',
  'Early access & discount on prix-fixe suppers',
  'A named seat at the long walnut table',
];

export const PRICING_TIERS = [
  {
    key: 'shopper',
    kicker: 'Free',
    name: 'Shopper',
    price: 0,
    suffix: 'just shop',
    paymentLabel: 'Free',
  },
  {
    key: 'monthly',
    kicker: 'Most popular',
    name: 'Monthly',
    price: 467,
    suffix: '/ month',
    paymentLabel: '₹467 / month',
    highlight: true,
  },
  {
    key: 'annual',
    kicker: 'Best value · save ₹2,000',
    name: 'Annual',
    price: 3600,
    suffix: '/ year',
    paymentLabel: '₹3,600 / year',
  },
];

// Membership tiers that actually require payment. Keys not in this set
// (e.g. "shopper") skip the Payment step on signup.
export const PAID_TIER_KEYS = new Set(['monthly', 'annual']);

export const PREFERRED_CLUBS = [
  'Saturday Silent Reading · drop-in',
  'Slow Fiction Club · Thursdays 7p',
  'Translators in Translation · Mondays 7:30p',
  'Poetry & Small Plates · 2nd Fridays 8p',
  'First-Draft Friday · 3rd Fridays 7p',
  'The Novella Supper · Monthly Thursdays',
  'Not sure yet',
];

export const READING_CHIPS = [
  'Literary fiction',
  'In translation',
  'Poetry',
  'Essays',
  'Memoir',
  'Short stories',
  'Experimental',
  'Books in Spanish',
  'Nothing in particular',
];

export const PACE_OPTIONS = ['Slow', 'Medium', "Fast (can’t help it)"];
export const ATTENTION_OPTIONS = ['One book at a time', 'Two at a time', 'Several always open'];
export const FORMAT_OPTIONS = ['Paperback', 'Hardcover', 'Either', 'E-reader sometimes'];
export const REREAD_OPTIONS = ['I re-read a lot', 'I re-read rarely', 'I never re-read'];

export const SPOILER_CHIPS = [
  'Prose rhythm',
  'A believable narrator',
  'A strong translation',
  'Structure',
  'An ending that earns itself',
  'A single perfect sentence',
];

// Hard-coded preview of the first 3 possible nights for a new
// member. Keep in sync with Events page seed data.
export const THIS_WEEK = [
  {
    when: 'Thu Apr 23 · 7:00p',
    titleItalic: 'The Magic Mountain',
    tail: ' — Slow Fiction Club opens',
  },
  {
    when: 'Sat Apr 25 · 10:00a',
    titleItalic: 'Saturday Silent Reading',
    tail: ', drop in',
  },
  {
    when: 'Mon Apr 27 · 7:30p',
    titleItalic: 'Margaret Jull Costa',
    tail: ' in conversation',
  },
];

export const DEFAULT_SIGNUP_STATE = {
  tier: 'shopper',
  step: 1,
  aboutYou: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    preferredClub: PREFERRED_CLUBS[0],
    readingTags: ['Literary fiction', 'In translation'],
    currentlyReading: '',
  },
  yourReading: {
    pace: '',
    attention: '',
    format: '',
    reread: '',
    spoilers: [],
    mostRecommendedBook: '',
  },
  payment: {
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    postal: '',
    billingEmail: '',
    authorized: false,
  },
  consent: true,
  errors: {},
};

export const STEP_LABELS = ['About you', 'Payment'];

export function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function tierByKey(key) {
  return PRICING_TIERS.find((t) => t.key === key) || PRICING_TIERS[1];
}
