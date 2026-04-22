// =====================================================================
// landingContent
//
// Hybrid CMS layer for the hand-authored landing page: layout stays in
// LandingPage.js, but the user-editable strings + card arrays live in
// app_settings.landing_content. Both the storefront renderer and the
// staff editor import the same defaults + schema so they can never
// drift apart.
// =====================================================================
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const LANDING_CONTENT_KEY = 'landing_content';

// Deep defaults — what the hardcoded design originally shipped with.
// The fetcher merges the Supabase row on top, so any missing field
// falls back here instead of crashing the render.
export const DEFAULT_LANDING_CONTENT = {
  hero: {
    tag: 'Reading room · Book club · Small plates',
    heading_lead: 'A quiet room for',
    heading_accent: 'big books',
    heading_middle: '&',
    heading_underlined: 'small plates.',
    copy: "Tapas Reading Cafe is a neighborhood library-cafe — borrow a book, order a plate, and stay as long as the chapter asks for. Weekly book clubs, silent reading hours, and a shelf that's always rotating.",
    primary_cta: 'Browse the library',
    primary_href: '/books',
    secondary_cta: 'See events',
    secondary_href: '#events',
    sticker_line1: 'Open today',
    sticker_line2: '10a – 11p',
    art_caption: 'library.jpg — our wall of books',
    stats: [
      { value: '2,400+', label: 'BOOKS ON SHELF' },
      { value: '6',      label: 'WEEKLY CLUBS' },
      { value: '312',    label: 'ACTIVE MEMBERS' },
    ],
  },
  marquee: 'Borrow a book · stay for a plate · join a club · read on the house',
  services: {
    kicker: 'Our Services',
    heading_lead: 'Everything a reader needs,',
    heading_accent: 'under one roof.',
    lede: 'Three ways to use the room: take a book home, borrow one for a week, or come read with a group. Coffee, wine, and tapas served throughout.',
    items: [
      { icon: 'Aa', title: 'Buying Books',          copy: 'A small, carefully-chosen shelf for purchase — new releases, small presses, and staff favorites. Always 10% off for members.', cta: 'Visit the shop',          href: '/books' },
      { icon: '↺',  title: 'Lending Library',       copy: 'Over 2,400 books you can borrow on the honor system. Take two home at a time, return within three weeks.',                      cta: 'Browse the library',      href: '/books' },
      { icon: '☕', title: 'Events & Book Clubs',   copy: 'Six weekly clubs, poetry suppers, and silent reading Saturdays. Come once as a guest — decide later.',                             cta: 'See the calendar',        href: '#events' },
    ],
  },
  arrivals: {
    kicker: 'New on the shelf',
    heading_lead: "This week's",
    heading_accent: 'arrivals.',
    lede: "Freshly unpacked from the small-press boxes and the translators' stacks. Borrow for free, or take one home.",
    books: [
      { cover: 'cover-1', title: 'The Magic Mountain',   author: 'Thomas Mann',         badge: 'Slow Fiction' },
      { cover: 'cover-2', title: 'The Years',            author: 'Annie Ernaux',        badge: 'Memoir' },
      { cover: 'cover-3', title: 'Solenoid',             author: 'Mircea Cărtărescu',   badge: 'Translation' },
      { cover: 'cover-4', title: 'Bluets',               author: 'Maggie Nelson',       badge: 'Poetry' },
      { cover: 'cover-5', title: "A Room of One's Own",  author: 'Virginia Woolf',      badge: 'Essays' },
      { cover: 'cover-6', title: 'The Waves',            author: 'Virginia Woolf',      badge: 'Novel' },
      { cover: 'cover-2', title: 'Minor Detail',         author: 'Adania Shibli',       badge: 'Translation' },
      { cover: 'cover-1', title: 'Checkout 19',          author: 'Claire-Louise Bennett', badge: 'Novel' },
    ],
  },
  membership: {
    kicker: 'Pricing & Plans',
    heading_lead: 'Two ways to',
    heading_accent: 'pull up a chair.',
    lede: 'Drop in whenever you like — or become a member and unlock every club, a quarterly book, and 10% off the kitchen.',
    free: {
      kicker: 'Drop-in',
      title:  'The Reading Room',
      copy:   'Free to enter. Borrow one book at a time, read all afternoon. Buy a coffee or a plate if the mood strikes.',
      features: [
        'Lending library, honor system',
        'Wi-Fi, quiet tables, long hours',
        'One guest club visit per month',
      ],
      price: 'Free',
      price_suffix: '',
      cta: 'Visit today',
      cta_href: '#visit',
    },
    paid: {
      kicker: 'Membership',
      title:  'The Chair',
      copy:   'A seat at every club, a book of your choice each quarter, 10% off the kitchen, and first dibs on supper events.',
      features: [
        'All six weekly book clubs',
        'One book per quarter, on us',
        '10% off food, wine & coffee',
        'Priority RSVP for supper events',
      ],
      price: '$18',
      price_suffix: '/month',
      cta: 'Become a member',
      cta_href: '#join',
    },
  },
  events: {
    kicker: 'Upcoming Events',
    heading_lead: 'On the calendar',
    heading_accent: 'this season.',
    lede: 'Weekly clubs, translator evenings, poetry suppers, and the occasional quiet Saturday. All welcome, members first.',
    items: [
      { month: 'Apr', day: '23', title: 'Slow Fiction',         emph: 'Club',            copy: 'Opening pages of The Magic Mountain. Sherry & olives.',        tag: 'p', tag_text: 'Weekly · Thu 7p' },
      { month: 'Apr', day: '27', title: 'Translators &',        emph: 'Twilight',        copy: 'An evening with translator Margaret Jull Costa on Saramago.',   tag: 'o', tag_text: 'Guest · Mon 7:30p' },
      { month: 'May', day: '02', title: 'Saturday',             emph: 'Silent Reading',  copy: 'Two quiet hours, a pot of coffee, a plate of toast. No phones.', tag: 'l', tag_text: 'Weekly · Sat 10a' },
      { month: 'May', day: '08', title: 'Poetry on',            emph: 'Small Plates',    copy: 'A tasting menu paired to six poems. Lorca, Szymborska, Berry.',  tag: 'k', tag_text: 'Prix Fixe · Fri 8p' },
      { month: 'May', day: '15', title: 'First-Draft',          emph: 'Friday',          copy: 'One page of work-in-progress. Two minutes each, then we eat.',   tag: 'p', tag_text: 'Members · Fri 7p' },
      { month: 'May', day: '21', title: 'The',                  emph: 'Novella',         copy: 'Read a novella that afternoon; meet for dinner to discuss.',    tag: 'o', tag_text: 'Single Session · Thu 4p', title_suffix: 'Supper' },
    ],
  },
  testimonial: {
    quote: "I came in on a Tuesday for a coffee and ended up finishing my novel. Three months later I'm hosting the Silent Reading club. It is the ",
    emph: 'warmest quiet place',
    quote_after: " I've ever found.",
    author_initials: 'RK',
    author_name: 'Rukmini K.',
    author_role: 'Member since 2024 · Silent Reading host',
  },
  newsletter: {
    kicker: 'The Dispatch',
    heading_lead: 'A letter on',
    heading_emph: "what we're reading.",
    copy: "One email a month. This week's shelf, next week's clubs, and a paragraph we couldn't stop thinking about.",
    placeholder: 'your@email.com',
    button_label: 'Subscribe',
    success_label: 'Thanks — see you soon',
  },
  footer: {
    brand_name: 'Tapas reading cafe',
    brand_tagline: 'a small room for big books',
    brand_blurb: 'A neighborhood library-cafe serving small plates, natural wine, and six weekly book clubs.',
    visit_heading: 'Visit',
    visit_lines: ['14 Haven Street', 'Reading, MA 01867', 'Tue–Sun · 10a–11p'],
    read_heading: 'Read',
    read_links: [
      { label: 'Library',     href: '/books' },
      { label: 'Book Clubs',  href: '#events' },
      { label: 'The Journal', href: '/blog' },
      { label: 'Archive',     href: '#archive' },
    ],
    more_heading: 'More',
    more_links: [
      { label: 'Private Events', href: '#events' },
      { label: 'Gift Cards',     href: '#gift' },
      { label: 'Careers',        href: '#careers' },
      { label: 'Contact',        href: '#contact' },
    ],
    copyright: '© Tapas Reading Cafe · Reading, MA',
  },
};

// Shallow-merge each top-level section against its default so a
// partial row (saved before all fields existed) doesn't explode the
// renderer. Only goes one level deep; nested arrays replace wholesale
// — which is fine because the staff editor always saves the full list.
export function mergeLandingContent(row) {
  if (!row || typeof row !== 'object') return DEFAULT_LANDING_CONTENT;
  const out = { ...DEFAULT_LANDING_CONTENT };
  for (const key of Object.keys(DEFAULT_LANDING_CONTENT)) {
    if (row[key] && typeof row[key] === 'object' && !Array.isArray(row[key])) {
      out[key] = { ...DEFAULT_LANDING_CONTENT[key], ...row[key] };
    } else if (row[key] !== undefined) {
      out[key] = row[key];
    }
  }
  return out;
}

export function useLandingContent() {
  const [content, setContent] = useState(DEFAULT_LANDING_CONTENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', LANDING_CONTENT_KEY)
          .maybeSingle();
        if (!mounted) return;
        setContent(mergeLandingContent(data?.value));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[landingContent] fetch failed, using defaults:', err?.message || err);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { content, loaded };
}
