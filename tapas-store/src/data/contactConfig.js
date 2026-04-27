// Config for the /contact page — edit this one file to tweak hours,
// emails, copy, or FAQ content without touching component code.

export const CONTACT_HOURS = [
  // dayIndex matches JS's getDay() (0 = Sun, 1 = Mon, ...).
  { key: 'mon', dayIndex: 1, short: 'Mon', hours: 'Closed', closed: true  },
  { key: 'tue', dayIndex: 2, short: 'Tue', hours: '10am–11pm' },
  { key: 'wed', dayIndex: 3, short: 'Wed', hours: '10am–11pm' },
  { key: 'thu', dayIndex: 4, short: 'Thu', hours: '10am–11pm' },
  { key: 'fri', dayIndex: 5, short: 'Fri', hours: '10am–12am' },
  { key: 'sat', dayIndex: 6, short: 'Sat', hours: '9am–12am' },
  { key: 'sun', dayIndex: 0, short: 'Sun', hours: '9am–9pm' },
];

export const CONTACT_INFO = {
  address: { bold: '14 Haven Street', line: 'Reading, MA 01867' },
  phone: '(781) 555-0184',
  email:  'hello@tapasreadingcafe.com',
  events: 'events@tapasreadingcafe.com',
  press:  'press@tapasreadingcafe.com',
  parking: 'Free on-street after 6p; garage on Sanborn St, 2 min walk',
  transit: 'Reading Depot · MBTA Commuter Rail, 4 min walk',
  accessibility: 'Step-free entrance via Haven; accessible restroom on ground floor',
};

export const CONTACT_SUBJECTS = [
  'Book club membership',
  'Private event or group booking',
  'Supper / prix-fixe reservation',
  'Press & interviews',
  'Something else',
];

export const CONTACT_FAQS = [
  {
    q: 'Do I need to be a member to come in?',
    a: 'Not at all. Walk in any time we’re open — read, borrow a book, order a plate. Membership just unlocks the book clubs, supper priority, and a quarterly book on us.',
  },
  {
    q: 'Can I work here on my laptop?',
    a: 'Before 5pm, absolutely — Wi-Fi is free, outlets at every other table. After 5, we dim the lights and ask laptops to close so the room can breathe.',
  },
  {
    q: 'Do you host private events?',
    a: 'Yes — we buy out the room for book launches, small weddings, birthday suppers, and translation parties. Email events@ and we’ll send a one-pager.',
  },
  {
    q: 'Is the menu vegetarian-friendly?',
    a: 'Roughly 70% of our small plates are vegetarian; most can be made vegan. Gluten-free bread is baked fresh twice a week.',
  },
  {
    q: 'Can I bring kids?',
    a: 'Of course — we have a small children’s shelf and crayons by the window. After 8pm the room tilts a little quieter, so that’s more of an adult hour.',
  },
  {
    q: 'How do I donate a book?',
    a: 'Leave it on the orange shelf by the door, or hand it to whoever’s at the counter. We keep everything worth keeping and pass the rest to the Reading Public Library.',
  },
];

// isValidEmail — minimal client-side sanity check. Deliberately loose;
// server-side must do the real validation when we wire this up.
export function isValidEmail(s) {
  if (typeof s !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
