// All static content for the /about page. Every string, stat,
// timeline entry, team card, compromise card, and press quote lives
// here so editing the page is a one-file operation.

export const ABOUT_MANIFESTO = {
  kicker: 'Manifesto',
  title: [
    { t: 'We built the ' },
    { t: 'cafe we wanted', em: true },
    { t: ' to read in.' },
  ],
  paragraphs: [
    {
      dropCap: 'T',
      // "T" is the drop-cap; the rest starts with "apas..."
      body: "apas Reading Cafe is a love letter to two things: the slow afternoon, and the long novel. We opened in the fall of 2021 with forty chairs, eight hundred books, and a small kitchen that does exactly six things well. We did not open to scale. We opened so there would be a room, on Haven Street, with enough sunlight to read in and enough food to stay for.",
    },
    {
      dropCap: 'M',
      body: 'ost bookshops rush you. Most cafes turn their tables. We do neither. The tapas come out in waves so you can keep reading. The library along the north wall is free to borrow from. The book clubs meet around one long walnut table, and anyone is welcome for the first visit on the house.',
    },
    {
      dropCap: 'W',
      body: "e are a three-person team with a standing rule: if a book is worth our shelves, it\u2019s worth a paragraph in our staff notes. We hand-write them on cream cards, we update them every Monday, and we\u2019ve never lost a single one.",
    },
  ],
};

export const ABOUT_STATS = {
  title: [
    { t: 'Five years, ' },
    { t: 'counted quietly.', em: true },
  ],
  items: [
    { value: '2,412', label: 'Books on shelf' },
    { value: '318',   label: 'Members' },
    { value: '1,040', label: 'Club meetings' },
    { value: '64',    label: 'Translators hosted' },
  ],
};

const CURRENT_YEAR = new Date().getFullYear();

export const ABOUT_HISTORY = {
  kicker: 'A brief history',
  title: [
    { t: 'How ' },
    { t: 'the room', em: true },
    { t: ' got here.' },
  ],
  lede: 'It started with a lease, a stove, and a personal library that had outgrown two apartments.',
  items: [
    {
      year: '2021',
      heading: 'The lease on Haven St.',
      body: 'Marisol signed for the 900sqft storefront on a Tuesday. We painted on Saturday; the first pot of coffee was Sunday.',
    },
    {
      year: '2022',
      heading: 'The long table arrived.',
      body: 'Built by a neighbor from a single walnut slab. It seats 24. The Slow Fiction Club began the week it was finished.',
    },
    {
      year: '2023',
      heading: 'Lending library, no cards.',
      body: 'The ledger went up. We promised no late fees, no paperwork \u2014 just a name, a date, and a return window of three weeks.',
    },
    {
      year: String(CURRENT_YEAR),
      heading: 'Six clubs, one room.',
      body: 'Translators in Translation, First-Draft Friday, and the Poetry Supper now share the same table, in rotation.',
    },
  ],
};

export const ABOUT_COMPROMISES = {
  kicker: 'What we actually believe',
  title: [
    { t: 'Three things ' },
    { t: 'we won\u2019t compromise', em: true },
    { t: ' on.' },
  ],
  lede: "We\u2019re small enough that everything we do fits inside one of these three sentences. If something doesn\u2019t, we probably shouldn\u2019t be doing it.",
  cards: [
    {
      n: '01',
      variant: 'lime',
      title: [
        { t: 'The room ' },
        { t: 'takes its time.', em: 'purple' },
      ],
      body: "No table turns. No laptops after five. Coffee refills are on us. If you\u2019re reading something long, we\u2019d rather you finished the chapter than opened your wallet again.",
    },
    {
      n: '02',
      variant: 'white',
      title: [
        { t: 'Books ' },
        { t: 'are for borrowing.', em: 'purple' },
      ],
      body: 'The lending library is free, without cards, without sign-up. We trust you. We have never, in five years, lost more than eleven books \u2014 and nine of those came back.',
    },
    {
      n: '03',
      variant: 'orange',
      title: [
        { t: 'Small plates, ' },
        { t: 'big conversations.', em: 'lime' },
      ],
      body: 'Six tapas a night, cooked by Rafa. No tasting menus, no pairings unless you ask. The food is here so the reading and talking can go longer, not shorter.',
    },
  ],
};

export const ABOUT_TEAM = {
  kicker: 'The people',
  title: [
    { t: 'Four humans, ' },
    { t: 'one long table.', em: true },
  ],
  lede: 'We\u2019re a small team. We all pour, we all stock the shelves, and one of us cooks. Find us on the floor if you want to talk about a book.',
  members: [
    {
      initials: 'MR',
      color: '#e8dfcb',
      name: 'Marisol Reyes',
      role: 'Founder \u00b7 Slow Fiction host',
      reading: 'The Magic Mountain (again)',
    },
    {
      initials: 'RA',
      color: '#caf27e',
      name: 'Rafa Alvarado',
      role: 'Kitchen \u00b7 Menu',
      reading: 'Chang, Lispector, a knife catalog',
    },
    {
      initials: 'AP',
      color: '#FF934A',
      name: 'Ava Park',
      role: 'Bookseller \u00b7 Journal editor',
      reading: 'Minor Detail, then Austerlitz',
    },
    {
      initials: 'JG',
      color: '#E8D9FF',
      name: 'Julien Gagn\u00E9',
      role: 'Translators host \u00b7 Bar',
      reading: 'Saramago in the original',
    },
  ],
};

export const ABOUT_PRESS = {
  kicker: 'Kind words',
  title: [
    { t: 'What ' },
    { t: 'people said.', em: true },
  ],
  lede: 'We don\u2019t mind a good review. We mind a careless one. These stuck.',
  quotes: [
    {
      source: 'The Boston Globe',
      body: 'The rare bookshop that expects you to stay for dinner \u2014 and makes it worth your while.',
      footer: 'Dining \u00b7 2024',
    },
    {
      source: 'Boston Magazine',
      body: 'A room so quiet you can hear the pages turn, with tapas sharp enough to cut through it.',
      footer: 'Best of \u00b7 2025',
    },
    {
      source: 'Eater Boston',
      body: 'The menu is short. The wine list is shorter. The book list is enormous. That\u2019s the whole pitch.',
      footer: 'First look \u00b7 2023',
    },
    {
      source: 'A regular, on Google',
      body: 'I have read more in the last year at Tapas than in the five before it. I don\u2019t know what that says about me.',
      footer: '\u2605\u2605\u2605\u2605\u2605 \u00b7 2026',
    },
  ],
};
