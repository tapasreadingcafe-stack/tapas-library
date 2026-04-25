// =====================================================================
// cms/adapters.js  —  shape adapters between DB rows and the props
// shapes the existing storefront components already expect.
//
// We do NOT change component code. Instead, each page's hook output
// is mapped through one of these adapters before being handed to the
// component. The hardcoded data modules in tapas-store/src/data stay
// in place as reference until Phase 5 cleanup.
// =====================================================================

// Brand hexes for team_members.color enum. Mirrors what the seed
// script's `normalizeTeamColor()` mapped FROM, so this round-trips.
const TEAM_HEX = {
  cream:    '#e8dfcb',
  lime:     '#caf27e',
  orange:   '#FF934A',
  lavender: '#E8D9FF',
};

// shop_books: DB → Shop component shape
//   id ← slug              (so favorites/cart keep using stable slugs)
//   price ← price_inr
//   coverVariant ← cover_color
//   coverLabel  ← title    (hardcoded data sometimes set this to a
//                           different string for design hints; default
//                           to title now — Phase 4 dashboard could add
//                           a separate cover_label column if needed)
//   inStock ← in_stock
//   newThisWeek ← false    (column not in DB; Phase 4 may add it)
export function adaptShopBook(row) {
  if (!row) return null;
  return {
    id: row.slug,
    title: row.title,
    author: row.author,
    coverLabel: row.title,
    coverVariant: row.cover_color || 'taupe',
    price: row.price_inr,
    categories: row.categories || [],
    format: row.format,
    clubs: row.clubs || [],
    inStock: row.in_stock,
    signed: row.signed,
    newThisWeek: false,
    description: row.description || null,
    isFeatured: row.is_featured,
  };
}
export function adaptShopBooks(rows) { return (rows || []).map(adaptShopBook); }

// library_shelves+books: DB → Library component shape.
// The component expects each book to have { id, title, author, status }
// where status = { kind: 'available' } or { kind: 'out', returnDate: 'M/D' }.
function formatReturnDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${parseInt(m[1], 10)}/${parseInt(m[2], 10)}`;
}
export function adaptLibraryShelf(shelf, idx = 0) {
  if (!shelf) return null;
  return {
    id: shelf.slug,
    number: String(idx + 1).padStart(2, '0'),
    name: shelf.name,
    italic: shelf.italic_accent || null,
    totals: {
      titles: shelf.title_count || 0,
      outOnLoan: shelf.out_on_loan || 0,
    },
    isFeatured: shelf.is_featured,
    books: (shelf.books || []).map((b) => ({
      id: b.slug,
      title: b.title,
      author: b.author,
      cover: b.cover_color || 'cream',
      coverVariant: b.cover_color || 'cream',
      categories: b.categories || [],
      status: b.availability_status === 'out'
        ? { kind: 'out', returnDate: formatReturnDate(b.return_date) }
        : { kind: 'available' },
    })),
  };
}
export function adaptLibraryShelves(rows) { return (rows || []).map(adaptLibraryShelf); }

// tapas_events → events page component shape.
// "Full" cards (those with a description) become UPCOMING_EVENTS-shaped;
// minimal calendar stubs become CALENDAR_EVENTS-shaped. Both come back
// from the same DB table.
const BADGE_LABEL = {
  weekly:        'WEEKLY',
  monthly:       'MONTHLY',
  'prix-fixe':   'PRIX FIXE',
  'drop-in':     'DROP IN',
  'guest-night': 'GUEST NIGHT',
};
function isoToMonthDay(iso) {
  if (!iso) return { month: '', day: 0 };
  const [y, m, d] = String(iso).split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return { month: months[parseInt(m, 10) - 1] || '', day: parseInt(d, 10) || 0, y };
}
// Schema chip values are kebab; the storefront's CHIP palette uses
// camelCase keys (softPink). Map back to the display key.
const CHIP_TO_DISPLAY = {
  'lavender':  'lavender',
  'sage':      'sage',
  'pink':      'pink',
  'peach':     'peach',
  'soft-pink': 'softPink',
};
// Schema badges (kebab) → camelCase keys the BADGE palette uses.
const BADGE_TO_DISPLAY = {
  'weekly':      'weekly',
  'monthly':     'monthly',
  'prix-fixe':   'prixFixe',
  'drop-in':     'dropIn',
  'guest-night': 'guestNight',
};

export function splitEvents(rows) {
  const upcoming = [];
  const calendar = [];
  (rows || []).forEach((e) => {
    if (e.description) {
      const { month, day } = isoToMonthDay(e.event_date);
      upcoming.push({
        slug: e.slug,
        dateMonth: month, dateDay: day, iso: e.event_date,
        title: e.title,
        italic: e.italic_accent || '',
        description: e.description,
        time: '',
        seats: '',
        badge: BADGE_TO_DISPLAY[e.badge] || e.badge,
        cta: {
          label: e.cta_type === 'rsvp' ? 'RSVP' : e.cta_type === 'reserve' ? 'Reserve' : 'Drop in',
          action: e.cta_type === 'dropin' ? 'drop-in' : e.cta_type,
        },
        category: e.category,
      });
    } else {
      calendar.push({
        date: e.event_date,
        label: e.title,
        chip: CHIP_TO_DISPLAY[e.chip_color] || e.chip_color,
        category: e.category,
        targetSlug: e.slug.startsWith('cal-') ? null : e.slug,
      });
    }
  });
  return { upcoming, calendar };
}
export { BADGE_LABEL };

// clubs DB → component shape: split title_html back into {title, italic, tail}
// or just hand the whole HTML string and let the component render it.
// Components currently expect title/titleItalic/titleTail. Easiest:
// return title_html directly under a new prop and update the components
// in a follow-up — but that violates "don't change visual design".
// Instead, parse the HTML on the JS side: split on <em>...</em>.
export function adaptClub(c) {
  if (!c) return null;
  const { lead, italic, tail } = splitEmHtml(c.title_html || '');
  return {
    id: c.slug,
    schedule: c.schedule,
    title: lead,
    titleItalic: italic,
    titleTail: tail,
    body: c.description || '',
    seats: c.total_seats,
    status: c.status_label || '',
    category: 'book-club',                          // not stored; default for filter compatibility
  };
}
export function adaptClubs(rows) { return (rows || []).map(adaptClub); }

function splitEmHtml(html) {
  const m = String(html || '').match(/^([^<]*)<em>([^<]*)<\/em>(.*)$/);
  if (m) return { lead: m[1] || '', italic: m[2] || '', tail: m[3] || '' };
  return { lead: html, italic: '', tail: '' };
}

// featured_supper DB → component shape
export function adaptFeaturedSupper(row) {
  if (!row) return null;
  return {
    kicker: row.kicker || '',
    titleLead: row.title || '',
    titleItalic: row.italic_accent || '',
    body: row.description || '',
    cta: { label: 'Reserve a seat', action: 'reserve' },
    slug: 'poetry-small-plates-may-8',              // legacy id
    menu: (row.courses || []).map((c) => ({
      n: c.number, dish: c.dish, poem: c.attribution,
    })),
    priceFull: row.price_full,
    priceMember: row.price_member,
    priceWinePairing: row.price_wine_pairing,
  };
}

// contact_info + hours: components expect specific shapes
export function adaptContactInfo(row) {
  if (!row) return null;
  return {
    address: { bold: row.address_line_1 || '', line: row.address_line_2 || '' },
    phone: row.phone || '',
    email: row.email_general || '',
    events: row.email_events || '',
    press: row.email_press || '',
    parking: row.parking || '',
    transit: row.transit || '',
    accessibility: row.accessibility || '',
    mapLabel: row.map_label || '',
  };
}

const DAY_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function timeToDisplay(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return '';
  const isMidnight = h === 0;
  const hour12 = isMidnight ? 12 : (h > 12 ? h - 12 : h);
  const suffix = h < 12 ? 'a' : (isMidnight ? 'a' : 'p');
  if (m && m !== 0) return `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
  return `${hour12}${suffix}`;
}
export function adaptHours(rows) {
  return (rows || []).map((h) => ({
    key: (h.day || '').toLowerCase(),
    dayIndex: DAY_TO_INDEX[h.day] ?? 0,
    short: h.day,
    hours: h.is_closed ? 'Closed' : `${timeToDisplay(h.opens)}–${timeToDisplay(h.closes)}`,
    closed: h.is_closed || false,
  })).sort((a, b) => a.dayIndex - b.dayIndex);
}

export function adaptFaqs(rows) {
  return (rows || []).map((f) => ({
    q: f.question,
    a: f.answer,
    openByDefault: f.is_open_by_default,
  }));
}

// journal_posts DB → component shape (TitleParts split)
function htmlToTitleParts(html) {
  // 'Slow <em>Fiction</em> Club' → [{t:'Slow '},{t:'Fiction',em:true},{t:' Club'}]
  const parts = [];
  let rest = String(html || '');
  const re = /<em>([\s\S]*?)<\/em>/g;
  let last = 0;
  let m;
  while ((m = re.exec(rest)) !== null) {
    if (m.index > last) parts.push({ t: rest.slice(last, m.index) });
    parts.push({ t: m[1], em: true });
    last = re.lastIndex;
  }
  if (last < rest.length) parts.push({ t: rest.slice(last) });
  return parts.length > 0 ? parts : [{ t: html || '' }];
}

export function adaptJournalPost(p) {
  if (!p) return null;
  return {
    slug: p.slug,
    kicker: p.sidebar_kicker || (p.is_featured ? 'Featured' : null) || p.category,
    kickerColor: p.cover_color || 'taupe',          // sidebar pill tint
    title: htmlToTitleParts(p.title_html),
    excerpt: p.excerpt || '',
    author: { name: p.author_name || '', initial: p.author_initial || '' },
    readMinutes: p.read_minutes,
    color: p.cover_color || 'taupe',
    coverVariant: p.cover_color || 'taupe',
    category: p.category,
    publishedAt: p.published_at,
  };
}
export function adaptJournalPosts(rows) {
  const all = (rows || []).map(adaptJournalPost);
  return {
    featured: all.find((p) => /^Featured$/i.test(p.kicker || '')) || all.find((p) => rows.find((r) => r.slug === p.slug)?.is_featured) || null,
    sidebar:  all.filter((p) => rows.find((r) => r.slug === p.slug)?.is_sidebar),
    archive:  all.filter((p) => {
      const r = rows.find((rr) => rr.slug === p.slug);
      return r && !r.is_featured && !r.is_sidebar;
    }),
    // Plus the full list, in case a page wants everything together.
    all,
  };
}

// about_* — component shapes
export function adaptAbout(payload) {
  if (!payload) return null;
  const { manifesto, stats, timeline, compromises, team, press } = payload;
  return {
    manifesto: manifesto && {
      kicker: manifesto.kicker || '',
      title: htmlToTitleParts(manifesto.heading_html),
      paragraphs: (manifesto.paragraphs || []).map((p) => ({ dropCap: p.drop_cap, body: p.body })),
    },
    stats: {
      title: [{ t: 'Five years, ' }, { t: 'counted quietly.', em: true }],
      items: (stats || []).map((s) => ({ label: s.label, value: s.value, highlighted: s.is_highlighted })),
    },
    history: {
      kicker: 'A brief history',
      title: [{ t: 'How ' }, { t: 'the room', em: true }, { t: ' got here.' }],
      lede: 'It started with a lease, a stove, and a personal library that had outgrown two apartments.',
      items: (timeline || []).map((t) => ({ year: t.year, heading: t.heading, body: t.body })),
    },
    compromises: {
      kicker: 'What we actually believe',
      title: [{ t: 'Three things ' }, { t: 'we won’t compromise', em: true }, { t: ' on.' }],
      lede: 'We’re small enough that everything we do fits inside one of these three sentences. If something doesn’t, we probably shouldn’t be doing it.',
      cards: (compromises || []).map((c) => ({
        n: c.number_label,
        title: htmlToTitleParts(c.title_html),
        body: c.body || '',
        variant: c.bg_color,                          // CSS class hook: is-lime / is-white / is-orange
        bg: c.bg_color,
      })),
    },
    team: {
      kicker: 'The people',
      title: [{ t: 'Four humans, ' }, { t: 'one long table.', em: true }],
      lede: 'We’re a small team. We all pour, we all stock the shelves, and one of us cooks. Find us on the floor if you want to talk about a book.',
      // The component sets `style={{ background: m.color }}` so we
      // expand the enum back to the brand hex it represents.
      members: (team || []).map((m) => ({
        initials: m.initials,
        color: TEAM_HEX[m.color] || '#e8dfcb',
        name: m.name,
        role: m.role,
        reading: m.currently_reading,
      })),
    },
    press: {
      kicker: 'Kind words',
      title: [{ t: 'What ' }, { t: 'people said.', em: true }],
      lede: 'We don’t mind a good review. We mind a careless one. These stuck.',
      quotes: (press || []).map((q) => ({ source: q.source, body: q.quote, footer: q.context })),
    },
  };
}
