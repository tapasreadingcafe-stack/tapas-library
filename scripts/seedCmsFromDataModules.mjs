#!/usr/bin/env node
// =====================================================================
// seedCmsFromDataModules.mjs  —  Phase 2 CMS seed generator.
//
// Reads every tapas-store/src/data/*.js module, normalises the values
// to the Phase-2 schema, and writes INSERT statements to
// supabase/migrations/20260425_cms_seed.sql.
//
// The data modules use ES module syntax (`export const`) but live in a
// CRA app whose package.json doesn't set "type": "module", so they
// can't be imported directly with dynamic import(). Workaround: read
// each file, strip the `export` keyword, and run the body inside a
// node:vm context. Side-effect-free (the modules contain only data +
// pure helpers, no top-level fetches or DOM access).
//
// Usage:
//   node scripts/seedCmsFromDataModules.mjs
//
// Idempotent: the resulting SQL uses ON CONFLICT clauses so re-running
// it on a populated DB updates rows in place.
// =====================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DATA_DIR  = resolve(REPO_ROOT, 'tapas-store/src/data');
const OUT_PATH  = resolve(REPO_ROOT, 'supabase/migrations/20260425_cms_seed.sql');

// ---------------------------------------------------------------------
// Module loader: read, strip `export`, eval in a sandbox, return all
// top-level bindings.
// ---------------------------------------------------------------------
function loadDataModule(filename) {
  const src = readFileSync(resolve(DATA_DIR, filename), 'utf8');
  // Strip `export` keyword. Then convert top-level `const` (and `let`)
  // to `var` so the bindings attach to the vm context's globals —
  // const/let are lexically scoped and would be invisible to us. We
  // anchor on column 0 to avoid touching nested declarations inside
  // function bodies (which use 2-space indentation in these files).
  const transformed = src
    .replace(/^export\s+/gm, '')
    .replace(/^const\s+/gm, 'var ')
    .replace(/^let\s+/gm, 'var ');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(transformed, ctx, { filename });
  return ctx;
}

// ---------------------------------------------------------------------
// SQL helpers — keep escaping local; we don't bring in pg-format.
// ---------------------------------------------------------------------
function sqlString(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlInt(v)  { return v === null || v === undefined ? 'NULL' : String(parseInt(v, 10)); }
function sqlBool(v) { return v ? 'TRUE' : 'FALSE'; }
function sqlDate(v) { return v ? `'${v}'::date` : 'NULL'; }
function sqlJsonb(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}
function sqlTextArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return `'{}'::text[]`;
  // Two layers of escaping: the array literal (inside the outer
  // postgres string) needs `\` and `"` escaped; the outer string
  // wrapper needs `'` doubled.
  const items = arr.map((s) => {
    const inner = String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${inner}"`;
  }).join(',');
  const literal = `{${items}}`.replace(/'/g, "''");
  return `'${literal}'::text[]`;
}

// Convert an array of fragments to an HTML string with <em>.
//
// Two shapes appear in the data files:
//   {t: 'text', em?: true|'colorHint'}   ← about/journal/clubs
//   {text: 'text'} or {em: 'italicText'} ← occasional alternate
// `em` truthy = wrap in <em>. The colour hint (e.g. 'purple') is
// dropped — Phase 3 picks the colour from CSS.
function fragmentsToHtml(parts) {
  if (!Array.isArray(parts)) return String(parts || '');
  return parts.map((p) => {
    if (p == null) return '';
    if (typeof p === 'string') return p;
    // Legacy alt shape: {em: 'italicText'} where em itself carries text.
    if (typeof p.em === 'string' && !p.t && !p.text) {
      return `<em>${p.em}</em>`;
    }
    const text = p.t ?? p.text ?? '';
    if (p.em) return `<em>${text}</em>`;
    return text;
  }).join('');
}

// Hex-code → enum-name normaliser for team_members.color.
// The data file uses hex codes for visual flexibility, but the schema
// has a typed enum to keep dashboard UIs simple. Map known hexes; fall
// back to 'cream' for anything new (staff can edit in Phase 4).
function normalizeTeamColor(c) {
  if (!c) return 'cream';
  const h = String(c).toLowerCase();
  switch (h) {
    case '#e8dfcb': return 'cream';
    case '#caf27e': return 'lime';
    case '#ff934a': return 'orange';
    case '#e8d9ff': return 'lavender';
    default:
      // Allow already-normalised values to pass through.
      if (['cream','lime','orange','lavender'].includes(h)) return h;
      return 'cream';
  }
}

// Slugify (matches the data module convention).
function slugify(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now().toString(36)}`;
}

// dayIndex (0=Sun JS convention) → 'Sun'/'Mon'/...
const DAY_BY_INDEX = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Parse strings like '10a–11p' / '9a–12a' / '10am-11pm' into ['HH:MM','HH:MM'].
// Accepts en-dash, em-dash, or hyphen as the separator.
function parseHoursRange(str) {
  if (!str) return [null, null];
  const parts = String(str).split(/[–—-]/).map((s) => s.trim());
  if (parts.length !== 2) return [null, null];
  return [parseTime(parts[0]), parseTime(parts[1])];
}
function parseTime(token) {
  // '10a' / '12a' (midnight) / '9p' / '12p' (noon) / '10am' / '9:30p'
  const m = String(token).toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = (m[3] || '').replace('m', '');
  if (mer === 'a') h = (h === 12) ? 0 : h;
  if (mer === 'p') h = (h === 12) ? 12 : h + 12;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// chip color normalisation — data uses 'softPink', schema uses 'soft-pink'.
function normalizeChipColor(c) {
  if (c === 'softPink') return 'soft-pink';
  return c;
}

// badge normalisation — data uses 'weekly','prixFixe','dropIn','guestNight','monthly';
// schema uses kebab.
function normalizeBadge(b) {
  switch (b) {
    case 'weekly':     return 'weekly';
    case 'monthly':    return 'monthly';
    case 'prixFixe':   return 'prix-fixe';
    case 'dropIn':     return 'drop-in';
    case 'guestNight': return 'guest-night';
    default: return null;
  }
}

// cta action normalisation — data uses 'rsvp','reserve','drop-in'; schema
// uses 'rsvp','reserve','dropin' (no hyphen).
function normalizeCta(action) {
  if (action === 'drop-in') return 'dropin';
  return action || 'rsvp';
}

// ---------------------------------------------------------------------
// Per-module emitters
// ---------------------------------------------------------------------
const sql = [];
sql.push('-- =====================================================================');
sql.push('-- 20260425_cms_seed.sql  —  generated by scripts/seedCmsFromDataModules.mjs');
sql.push('-- =====================================================================');
sql.push('-- Generated at: ' + new Date().toISOString());
sql.push('');

const counts = {};
// Page-level stats keyed by page slug; populated as data is loaded,
// flushed when we emit the pages table.
const pendingStats = {};

function track(table, n) {
  counts[table] = (counts[table] || 0) + n;
}

// ---------- shop_books ----------
{
  const m = loadDataModule('shopBooks.js');
  const books = m.SHOP_BOOKS || [];
  const featuredId = m.FEATURED_BOOK_ID;
  sql.push('-- shop_books');
  books.forEach((b, i) => {
    sql.push(`insert into public.shop_books (slug, title, author, cover_color, price_inr, categories, clubs, format, in_stock, signed, is_featured, sort_order, status) values (`
      + [
        sqlString(b.id),
        sqlString(b.title),
        sqlString(b.author),
        sqlString(b.coverVariant),
        sqlInt(b.price),
        sqlTextArray(b.categories || []),
        sqlTextArray(b.clubs || []),
        sqlString(b.format),
        sqlBool(b.inStock),
        sqlBool(b.signed),
        sqlBool(b.id === featuredId),
        sqlInt(i),
        `'published'`,
      ].join(', ')
      + `) on conflict (slug) do update set `
      + `title=excluded.title, author=excluded.author, cover_color=excluded.cover_color, `
      + `price_inr=excluded.price_inr, categories=excluded.categories, clubs=excluded.clubs, `
      + `format=excluded.format, in_stock=excluded.in_stock, signed=excluded.signed, `
      + `is_featured=excluded.is_featured, sort_order=excluded.sort_order;`);
  });
  track('shop_books', books.length);
  sql.push('');
}

// ---------- library_shelves + library_books ----------
{
  const m = loadDataModule('libraryBooks.js');
  const shelves = m.LIBRARY_SHELVES || [];
  const featured = m.LIBRARY_FEATURED || null;
  const stats = m.LIBRARY_STATS || [];
  const houseRules = m.LIBRARY_HOUSE_RULES || [];

  sql.push('-- library_shelves');
  shelves.forEach((shelf, i) => {
    const isFeatured = featured && featured.shelfId === shelf.id;
    sql.push(`insert into public.library_shelves (slug, name, italic_accent, title_count, out_on_loan, is_featured, sort_order, status) values (`
      + [
        sqlString(shelf.id),
        sqlString(shelf.name || shelf.title || shelf.id),
        sqlString(shelf.italic || null),
        sqlInt(shelf.totalTitles || (shelf.books?.length ?? 0)),
        sqlInt(shelf.onLoan || 0),
        sqlBool(isFeatured),
        sqlInt(i),
        `'published'`,
      ].join(', ')
      + `) on conflict (slug) do update set `
      + `name=excluded.name, italic_accent=excluded.italic_accent, title_count=excluded.title_count, `
      + `out_on_loan=excluded.out_on_loan, is_featured=excluded.is_featured, sort_order=excluded.sort_order;`);
  });
  track('library_shelves', shelves.length);
  sql.push('');

  sql.push('-- library_books');
  let bookSort = 0;
  let totalBooks = 0;
  shelves.forEach((shelf) => {
    const books = shelf.books || [];
    books.forEach((book, idx) => {
      const av = book.status?.kind === 'out' ? 'out' : 'available';
      const returnDate = book.status?.kind === 'out' && book.status.returnDate
        ? parseReturnDate(book.status.returnDate) : null;
      sql.push(`insert into public.library_books (shelf_id, slug, title, author, cover_color, availability_status, return_date, categories, sort_order, status) values (`
        + [
          `(select id from public.library_shelves where slug=${sqlString(shelf.id)})`,
          sqlString(book.id || slugify(book.title)),
          sqlString(book.title),
          sqlString(book.author),
          sqlString(book.coverVariant || 'cream'),
          sqlString(av),
          sqlDate(returnDate),
          sqlTextArray(book.categories || []),
          sqlInt(bookSort++),
          `'published'`,
        ].join(', ')
        + `) on conflict (shelf_id, slug) do update set `
        + `title=excluded.title, author=excluded.author, cover_color=excluded.cover_color, `
        + `availability_status=excluded.availability_status, return_date=excluded.return_date, `
        + `categories=excluded.categories, sort_order=excluded.sort_order;`);
      totalBooks++;
    });
  });
  track('library_books', totalBooks);
  sql.push('');

  // pages.library.stats_jsonb — page-level numbers (titles/onLoan/etc).
  if (stats.length > 0 || houseRules.length > 0 || featured) {
    const statsObj = {
      stats: stats.map((s) => ({ label: s.label, value: s.value })),
      houseRules: houseRules,
      featured: featured ? { kicker: featured.kicker, headline: featured.headline, accent: featured.accent, body: featured.body } : null,
    };
    sql.push(`-- pages.library.stats_jsonb (held inside pages row, written below)`);
    sql.push(`-- ${JSON.stringify(statsObj).slice(0, 80)}...`);
    sql.push('');
    // store for later when we write pages
    pendingStats.library = statsObj;
  }
}

// "M/D" → "2026-MM-DD" (returnDate format). Anchored to current year.
function parseReturnDate(md) {
  if (!md || typeof md !== 'string') return null;
  const m = md.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const yr = 2026;
  return `${yr}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
}

// ---------- pages (with stats_jsonb hooks for library) ----------
{
  // Run library again to populate pendingStats — we need it for pages emit.
  // (Above block already populated pendingStats.library)
  sql.push('-- pages');
  const pageSeeds = [
    { slug: 'home',    title: 'Home',         hero_kicker: 'WELCOME TO TAPAS',     hero_heading_html: 'Where Stories Begin & Families Connect',    hero_lede: 'A cozy reading space for kids and parents — discover books, enjoy simple treats, and build a love for reading together.' },
    { slug: 'shop',    title: 'Shop',         hero_kicker: 'The Shop',             hero_heading_html: 'Books we keep <em>pressing</em> into people’s hands.', hero_lede: 'A considered shelf of new releases, small presses, and staff favorites. Free shipping over ₹999.' },
    { slug: 'library', title: 'Library',      hero_kicker: 'The Lending Library',          hero_heading_html: 'Over <em>2,400 books</em>,<br />free to borrow.', hero_lede: 'Take two home at a time. Three weeks to return. No late fees, no paperwork.' },
    { slug: 'blog',    title: 'The Journal',  hero_kicker: 'The Journal',          hero_heading_html: 'Notes from the <em>reading room.</em>', hero_lede: 'Essays, marginalia, and conversations. Posted slowly, always from inside the cafe.' },
    { slug: 'events',  title: 'Events',       hero_kicker: 'Events &amp; Book Clubs', hero_heading_html: 'Six clubs, one room,<br /><em>all welcome.</em>', hero_lede: 'Weekly clubs, poetry suppers, and silent reading Saturdays. Drop in once as a guest.' },
    { slug: 'contact', title: 'Contact',      hero_kicker: 'Visit & Contact',              hero_heading_html: 'Come <em>read with us.</em>', hero_lede: '14 Haven Street, right off the square. Walk in anytime.' },
    { slug: 'about',   title: 'About',        hero_kicker: 'About Us',                hero_heading_html: 'A small room<br /><em>for big books.</em>', hero_lede: 'A library-cafe on Haven Street since 2021. Six clubs, 2,400 books, one long table.' },
    { slug: 'cart',    title: 'Cart',         hero_kicker: 'Your basket',          hero_heading_html: 'Books waiting <em>to be read.</em>', hero_lede: 'Free shipping over ₹999, or pick up at the cafe.' },
  ];
  for (const p of pageSeeds) {
    const stats = pendingStats[p.slug] || null;
    sql.push(`insert into public.pages (slug, title, hero_kicker, hero_heading_html, hero_lede, stats_jsonb, status) values (`
      + [
        sqlString(p.slug),
        sqlString(p.title),
        sqlString(p.hero_kicker),
        sqlString(p.hero_heading_html),
        sqlString(p.hero_lede),
        sqlJsonb(stats),
        `'published'`,
      ].join(', ')
      + `) on conflict (slug) do update set `
      + `title=excluded.title, hero_kicker=excluded.hero_kicker, `
      + `hero_heading_html=excluded.hero_heading_html, hero_lede=excluded.hero_lede, `
      + `stats_jsonb=excluded.stats_jsonb;`);
  }
  track('pages', pageSeeds.length);
  sql.push('');
}

// ---------- events (unified table — see 20260426_unify_events.sql) ----------
{
  const m = loadDataModule('eventsData.js');
  const upcoming = m.UPCOMING_EVENTS || [];
  const calendar = m.CALENDAR_EVENTS || [];
  const clubs    = m.CLUBS || [];
  const supper   = m.FEATURED_SUPPER || null;

  // Build a slug → upcoming map so we can deduplicate calendar entries
  // that point at an upcoming card (targetSlug match).
  const upcomingSlugs = new Set(upcoming.map((u) => u.slug));

  sql.push('-- events: full upcoming cards (5 of these in seed)');
  upcoming.forEach((e, i) => {
    sql.push(`insert into public.events (slug, title, italic_accent, description, start_date, category, badge, cta_type, chip_color, sort_order, status) values (`
      + [
        sqlString(e.slug),
        sqlString(e.title),
        sqlString(e.italic || null),
        sqlString(e.description || null),
        sqlDate(e.iso),
        sqlString(e.category),
        e.badge ? sqlString(normalizeBadge(e.badge)) : 'NULL',
        sqlString(normalizeCta(e.cta?.action)),
        sqlString(normalizeChipColor(chipColorForCategory(e.category))),
        sqlInt(i),
        `'upcoming'`,
      ].join(', ')
      + `) on conflict (slug) do update set `
      + `title=excluded.title, italic_accent=excluded.italic_accent, description=excluded.description, `
      + `start_date=excluded.start_date, category=excluded.category, badge=excluded.badge, `
      + `cta_type=excluded.cta_type, chip_color=excluded.chip_color, sort_order=excluded.sort_order;`);
  });

  sql.push('-- events: calendar-only stubs (no description)');
  let stubCount = 0;
  calendar.forEach((c, i) => {
    if (c.targetSlug && upcomingSlugs.has(c.targetSlug)) return; // skip duplicates
    const slug = c.targetSlug || `cal-${c.date}-${slugify(c.label)}`;
    sql.push(`insert into public.events (slug, title, start_date, category, chip_color, sort_order, status) values (`
      + [
        sqlString(slug),
        sqlString(c.label),
        sqlDate(c.date),
        sqlString(c.category),
        sqlString(normalizeChipColor(c.chip)),
        sqlInt(100 + i),
        `'upcoming'`,
      ].join(', ')
      + `) on conflict (slug) do update set `
      + `title=excluded.title, start_date=excluded.start_date, category=excluded.category, `
      + `chip_color=excluded.chip_color, sort_order=excluded.sort_order;`);
    stubCount++;
  });
  track('events', upcoming.length + stubCount);
  sql.push('');

  sql.push('-- clubs');
  clubs.forEach((c, i) => {
    const titleHtml = (c.title || '') + (c.titleItalic ? `<em>${c.titleItalic}</em>` : '') + (c.titleTail || '');
    sql.push(`insert into public.clubs (slug, title_html, schedule, description, total_seats, status_label, sort_order, status) values (`
      + [
        sqlString(c.id),
        sqlString(titleHtml),
        sqlString(c.schedule),
        sqlString(c.body || null),
        sqlInt(c.seats),
        sqlString(c.status || null),
        sqlInt(i),
        `'published'`,
      ].join(', ')
      + `) on conflict (slug) do update set `
      + `title_html=excluded.title_html, schedule=excluded.schedule, description=excluded.description, `
      + `total_seats=excluded.total_seats, status_label=excluded.status_label, sort_order=excluded.sort_order;`);
  });
  track('clubs', clubs.length);
  sql.push('');

  if (supper) {
    sql.push('-- featured_supper (singleton)');
    const courses = (supper.menu || []).map((m) => ({ number: m.n, dish: m.dish, attribution: m.poem }));
    sql.push(`insert into public.featured_supper (id, kicker, title, italic_accent, description, menu_title, courses, price_full, price_member, price_wine_pairing, status) values (`
      + [
        'true',
        sqlString(supper.kicker),
        sqlString(supper.titleLead || null),
        sqlString(supper.titleItalic || null),
        sqlString(supper.body),
        sqlString('Read & eaten.'),
        sqlJsonb(courses),
        sqlInt(4080),
        sqlInt(3060),
        sqlInt(2050),
        `'published'`,
      ].join(', ')
      + `) on conflict (id) do update set `
      + `kicker=excluded.kicker, title=excluded.title, italic_accent=excluded.italic_accent, `
      + `description=excluded.description, menu_title=excluded.menu_title, courses=excluded.courses, `
      + `price_full=excluded.price_full, price_member=excluded.price_member, price_wine_pairing=excluded.price_wine_pairing;`);
    track('featured_supper', 1);
    sql.push('');
  }
}

// chip color heuristic: pick a default by category if unspecified
function chipColorForCategory(cat) {
  switch (cat) {
    case 'book-club':       return 'lavender';
    case 'silent-reading':  return 'sage';
    case 'guest-night':     return 'peach';
    case 'poetry-supper':   return 'pink';
    case 'members-only':    return 'soft-pink';
    default:                return 'lavender';
  }
}

// ---------- contact_info + hours + faqs ----------
{
  const m = loadDataModule('contactConfig.js');
  const info = m.CONTACT_INFO || {};
  const hours = m.CONTACT_HOURS || [];
  const faqs = m.CONTACT_FAQS || [];

  sql.push('-- contact_info (singleton)');
  sql.push(`insert into public.contact_info (id, address_line_1, address_line_2, phone, email_general, email_events, email_press, parking, transit, accessibility, map_label) values (`
    + [
      'true',
      sqlString(info.address?.bold || null),
      sqlString(info.address?.line || null),
      sqlString(info.phone || null),
      sqlString(info.email || null),
      sqlString(info.events || null),
      sqlString(info.press || null),
      sqlString(info.parking || null),
      sqlString(info.transit || null),
      sqlString(info.accessibility || null),
      sqlString(info.mapLabel || '14 Haven Street'),
    ].join(', ')
    + `) on conflict (id) do update set `
    + `address_line_1=excluded.address_line_1, address_line_2=excluded.address_line_2, `
    + `phone=excluded.phone, email_general=excluded.email_general, email_events=excluded.email_events, `
    + `email_press=excluded.email_press, parking=excluded.parking, transit=excluded.transit, `
    + `accessibility=excluded.accessibility, map_label=excluded.map_label;`);
  track('contact_info', 1);
  sql.push('');

  sql.push('-- hours (7 rows by day)');
  hours.forEach((h, i) => {
    const day = DAY_BY_INDEX[h.dayIndex];
    if (!day) return;
    const isClosed = !!h.closed || /closed/i.test(h.hours || '');
    const [opens, closes] = isClosed ? [null, null] : parseHoursRange(h.hours);
    sql.push(`insert into public.hours (day, opens, closes, is_closed, sort_order) values (`
      + [
        sqlString(day),
        opens  ? sqlString(opens)  : 'NULL',
        closes ? sqlString(closes) : 'NULL',
        sqlBool(isClosed),
        sqlInt(i),
      ].join(', ')
      + `) on conflict (day) do update set `
      + `opens=excluded.opens, closes=excluded.closes, is_closed=excluded.is_closed, sort_order=excluded.sort_order;`);
  });
  track('hours', hours.length);
  sql.push('');

  sql.push('-- faqs');
  faqs.forEach((f, i) => {
    sql.push(`insert into public.faqs (question, answer, is_open_by_default, sort_order, status) values (`
      + [
        sqlString(f.q || f.question),
        sqlString(f.a || f.answer),
        sqlBool(!!f.openByDefault),
        sqlInt(i),
        `'published'`,
      ].join(', ')
      + `);`);
  });
  track('faqs', faqs.length);
  sql.push('');
}

// ---------- journal_posts ----------
{
  const m = loadDataModule('journalPosts.js');
  const featured = m.JOURNAL_FEATURED || null;
  const sidebar = m.JOURNAL_SIDEBAR || [];
  const archive = m.JOURNAL_ARCHIVE || [];

  sql.push('-- journal_posts');
  let order = 0;
  if (featured) {
    sql.push(buildJournalInsert({ ...featured, _featured: true, _sidebar: false, _order: order++ }));
  }
  sidebar.forEach((s) => {
    sql.push(buildJournalInsert({ ...s, _featured: false, _sidebar: true, _order: order++ }));
  });
  archive.forEach((a) => {
    sql.push(buildJournalInsert({ ...a, _featured: false, _sidebar: false, _order: order++ }));
  });
  track('journal_posts', (featured ? 1 : 0) + sidebar.length + archive.length);
  sql.push('');
}

function buildJournalInsert(p) {
  const titleHtml = fragmentsToHtml(p.title || []);
  const cat = p.category || 'Essay';
  // Data shape: cover_color comes from `color` field; readtime from `readMinutes`.
  return `insert into public.journal_posts (slug, category, cover_color, title_html, excerpt, author_name, author_initial, read_minutes, is_featured, is_sidebar, sidebar_kicker, sort_order, status) values (`
    + [
      sqlString(p.slug),
      sqlString(cat),
      sqlString(p.color || p.coverVariant || 'taupe'),
      sqlString(titleHtml),
      sqlString(p.excerpt || p.dek || null),
      sqlString(p.author?.name || null),
      sqlString(p.author?.initial || null),
      sqlInt(p.readMinutes || p.readTime),
      sqlBool(p._featured),
      sqlBool(p._sidebar),
      sqlString(p.kicker || null),
      sqlInt(p._order),
      `'published'`,
    ].join(', ')
    + `) on conflict (slug) do update set `
    + `category=excluded.category, cover_color=excluded.cover_color, title_html=excluded.title_html, `
    + `excerpt=excluded.excerpt, author_name=excluded.author_name, author_initial=excluded.author_initial, `
    + `read_minutes=excluded.read_minutes, is_featured=excluded.is_featured, is_sidebar=excluded.is_sidebar, `
    + `sidebar_kicker=excluded.sidebar_kicker, sort_order=excluded.sort_order;`;
}

// ---------- about_* ----------
{
  const m = loadDataModule('aboutContent.js');
  const manifesto = m.ABOUT_MANIFESTO || {};
  const stats     = m.ABOUT_STATS    || {};
  const history   = m.ABOUT_HISTORY  || {};
  const compromises = m.ABOUT_COMPROMISES || {};
  const team      = m.ABOUT_TEAM     || {};
  const press     = m.ABOUT_PRESS    || {};

  sql.push('-- about_manifesto (singleton)');
  sql.push(`insert into public.about_manifesto (id, kicker, heading_html, paragraphs) values (`
    + [
      'true',
      sqlString(manifesto.kicker || null),
      sqlString(fragmentsToHtml(manifesto.title || [])),
      sqlJsonb((manifesto.paragraphs || []).map((p) => ({
        drop_cap: p.dropCap || null,
        body: p.body || (typeof p === 'string' ? p : ''),
      }))),
    ].join(', ')
    + `) on conflict (id) do update set `
    + `kicker=excluded.kicker, heading_html=excluded.heading_html, paragraphs=excluded.paragraphs;`);
  track('about_manifesto', 1);
  sql.push('');

  sql.push('-- about_stats');
  (stats.items || []).forEach((s, i) => {
    sql.push(`insert into public.about_stats (label, value, is_highlighted, sort_order) values (`
      + [
        sqlString(s.label),
        sqlString(s.value),
        sqlBool(!!s.highlighted),
        sqlInt(i),
      ].join(', ')
      + `);`);
  });
  track('about_stats', (stats.items || []).length);
  sql.push('');

  sql.push('-- about_timeline');
  (history.items || []).forEach((it, i) => {
    sql.push(`insert into public.about_timeline (year, heading, body, sort_order) values (`
      + [
        sqlString(it.year),
        sqlString(it.heading || it.title || ''),
        sqlString(it.body || it.detail || null),
        sqlInt(i),
      ].join(', ')
      + `);`);
  });
  track('about_timeline', (history.items || []).length);
  sql.push('');

  sql.push('-- about_compromises');
  (compromises.cards || []).forEach((c, i) => {
    // bg can be a hex code or a name; map to enum.
    const bgEnum = (() => {
      const v = String(c.bg || '').toLowerCase();
      if (['lime','white','orange'].includes(v)) return v;
      return 'lime';
    })();
    sql.push(`insert into public.about_compromises (number_label, title_html, body, bg_color, sort_order) values (`
      + [
        sqlString(c.n || c.number || String(i + 1).padStart(2, '0')),
        sqlString(fragmentsToHtml(c.title || [])),
        sqlString(c.body || null),
        sqlString(bgEnum),
        sqlInt(i),
      ].join(', ')
      + `);`);
  });
  track('about_compromises', (compromises.cards || []).length);
  sql.push('');

  sql.push('-- team_members');
  (team.members || []).forEach((mem, i) => {
    sql.push(`insert into public.team_members (initials, color, name, role, currently_reading, sort_order, status) values (`
      + [
        sqlString(mem.initials || mem.name?.split(' ').map((p) => p[0]).join('').slice(0,2) || ''),
        sqlString(normalizeTeamColor(mem.color)),
        sqlString(mem.name),
        sqlString(mem.role || null),
        sqlString(mem.reading || mem.currentlyReading || null),
        sqlInt(i),
        `'published'`,
      ].join(', ')
      + `);`);
  });
  track('team_members', (team.members || []).length);
  sql.push('');

  sql.push('-- press_quotes');
  // Data shape: press.quotes[] with {source, body, footer}.
  (press.quotes || press.items || []).forEach((q, i) => {
    sql.push(`insert into public.press_quotes (source, quote, context, sort_order) values (`
      + [
        sqlString(q.source || q.outlet || ''),
        sqlString(q.body || q.quote || q.text || ''),
        sqlString(q.footer || q.context || q.byline || null),
        sqlInt(i),
      ].join(', ')
      + `);`);
  });
  track('press_quotes', (press.quotes || press.items || []).length);
  sql.push('');
}

// ---------- write file + summary ----------
mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, sql.join('\n') + '\n');

console.log(`Wrote ${OUT_PATH}`);
console.log('Row counts emitted:');
for (const [t, n] of Object.entries(counts).sort()) {
  console.log(`  ${t.padEnd(20)} ${n}`);
}
