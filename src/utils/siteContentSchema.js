// =====================================================================
// siteContentSchema.js
//
// Schema + defaults for the store's editable site content.
// Mirrors tapas-store/src/utils/defaultContent.js — keep the two in sync.
// =====================================================================

export const DEFAULT_CONTENT = {
  brand: {
    name: 'Tapas Library',
    tagline: '& BOOK STORE',
    primary_color: '#2C1810',
    primary_color_dark: '#1A0F0A',
    primary_color_light: '#4A2C17',
    accent_color: '#D4A853',
    accent_color_dark: '#C49040',
    cream_color: '#FDF8F0',
    sand_color: '#F5DEB3',
    heading_font: 'Playfair Display',
    body_font: 'Lato',
  },
  contact: {
    phone: '+91 98765 43210',
    email: 'tapasreadingcafe@gmail.com',
    address: 'Tapas Reading Cafe, Nagpur, Maharashtra',
    hours_weekdays: '9:00 AM – 8:00 PM',
    hours_saturday: '9:00 AM – 6:00 PM',
    hours_sunday: '10:00 AM – 4:00 PM',
  },
  home: {
    hero_eyebrow: "Nagpur's Reading Cafe",
    hero_headline_line1: 'Stories worth',
    hero_headline_line2: 'your shelf.',
    hero_description: "A curated collection of books to borrow or own — handpicked by the Tapas Reading Cafe team. Fiction, memoirs, kids' favourites, and everything in between.",
    search_placeholder: 'Search title, author, or genre…',
    staff_picks_eyebrow: '★ ★ ★',
    staff_picks_title: 'Handpicked by our librarians',
    staff_picks_subtitle: "Every week our team picks a handful of books we can't stop talking about. Here's what's on our desks right now.",
    cafe_story_headline_line1: 'More than a bookstore.',
    cafe_story_headline_line2: 'A reading home.',
    cafe_story_body: 'Tapas Reading Cafe is part library, part bookshop, part neighbourhood café. Members borrow from a curated collection, visitors stop in for filter coffee and a book-of-the-week, and everyone is welcome to stay a while. Come find your next read.',
  },
  about: {
    hero_eyebrow: 'Our story',
    hero_headline_line1: 'A room full of books',
    hero_headline_line2: 'and a pot of coffee.',
    hero_subtitle: 'Tapas Reading Cafe started the way most good things do — a few shelves, a kettle, and people who wanted somewhere quiet to read.',
    hero_bg_image_url: '',
    story_pull_quote: "We wanted a reading room that didn't feel like a library rulebook.",
    story_body_1: 'Before Tapas, the nearest bookstore in our part of the neighbourhood was a forty-minute bus ride away, and the library closed too early for anyone who worked. So we opened a small space with a couple hundred books, a single espresso machine, and a long table for anyone who wanted to linger.',
    story_body_2: "The collection grew the way friendships do — one recommendation at a time. A member brought in a Booker winner they'd loved; we ordered two more. A regular asked for picture books for their daughter; we started a kids' shelf. Ten years later, most of what you'll find on our shelves arrived because someone, somewhere, asked for it.",
    story_body_3: "We're still that room with a kettle. Just a lot more books.",
    values_heading: 'Four things we care about',
    values_eyebrow: 'What we believe',
    values_1_title: 'Curated, not endless',
    values_1_body: "We don't stock everything — we stock books our team has actually read and wants to recommend. That means less noise, better discoveries.",
    values_2_title: 'Borrow or own',
    values_2_body: "Every book on our shelves can either come home with you or be borrowed as a member. Reading shouldn't depend on your budget.",
    values_3_title: 'A place to stay a while',
    values_3_body: 'The café is part of the bookstore, not an afterthought. Come for a coffee, stay for a book, leave with both.',
    values_4_title: 'Built on word of mouth',
    values_4_body: 'We opened because our neighbourhood asked for it. The best recommendations still come from members talking to members.',
  },
  offers: {
    hero_eyebrow: 'Membership',
    hero_headline_line1: 'Read more,',
    hero_headline_line2: 'pay less.',
    hero_description: 'Becoming a Tapas member is the simplest way to read more books for less money. Borrow freely, reserve new arrivals, and get a discount on anything you want to take home.',
    plans_footer: 'All plans billed monthly. Cancel anytime. Pay cash, UPI, or card at the cafe.',
    why_join_eyebrow: 'Why join',
    why_join_heading: 'What a membership actually buys you',
    why_join_1_title: 'A curated catalog',
    why_join_1_body: 'Our team handpicks every title. You skip the noise and find your next read faster.',
    why_join_2_title: 'A space to read',
    why_join_2_body: 'Members can spend as long as they want in the cafe reading area, with filter coffee at member rates.',
    why_join_3_title: 'Real discounts',
    why_join_3_body: 'Silver and Gold members get 10–20% off anything they buy, not just during sales.',
    why_join_4_title: 'Priority on new arrivals',
    why_join_4_body: 'Flag books you want and members get reserved copies before walk-ins.',
    cta_headline: 'Ready to join?',
    cta_body: "Sign up online, then drop by the cafe whenever you're ready to start borrowing.",
  },
  newsletter: {
    eyebrow: '📬',
    headline: 'Our weekly reading list',
    description: "One email every Sunday — staff picks, new arrivals, and what's happening at the cafe. No spam, easy unsubscribe.",
  },
  images: {
    home_hero_bg_url: '',
    cafe_story_bg_url: '',
  },
};

export const CONTENT_SCHEMA = [
  {
    key: 'brand',
    title: 'Brand',
    subtitle: 'Name, tagline, colors, and fonts shared across every page.',
    icon: '🎨',
    fields: [
      { key: 'name',                label: 'Brand name',        type: 'text',  hint: 'Shown in the navbar and footer.' },
      { key: 'tagline',             label: 'Brand tagline',     type: 'text',  hint: 'Small line under the name.' },
      { key: 'primary_color',       label: 'Primary color',     type: 'color', hint: 'Dark brown. Navbar, hero, headlines.' },
      { key: 'primary_color_dark',  label: 'Primary — darker shade',  type: 'color' },
      { key: 'primary_color_light', label: 'Primary — lighter shade', type: 'color' },
      { key: 'accent_color',        label: 'Accent color',      type: 'color', hint: 'Warm gold. Prices, CTAs, highlights.' },
      { key: 'accent_color_dark',   label: 'Accent — darker shade',   type: 'color' },
      { key: 'cream_color',         label: 'Background cream',  type: 'color', hint: 'Page background.' },
      { key: 'sand_color',          label: 'Sand accent',       type: 'color', hint: 'Book cover placeholder.' },
      { key: 'heading_font',        label: 'Heading font',      type: 'font',  hint: 'Any Google Font.' },
      { key: 'body_font',           label: 'Body font',         type: 'font',  hint: 'Any Google Font.' },
    ],
  },
  {
    key: 'contact',
    title: 'Contact',
    subtitle: 'Phone, email, address, hours shown in About and the footer.',
    icon: '📍',
    fields: [
      { key: 'phone',          label: 'Phone',          type: 'text' },
      { key: 'email',          label: 'Email',          type: 'text' },
      { key: 'address',        label: 'Address',        type: 'textarea' },
      { key: 'hours_weekdays', label: 'Mon–Fri hours',  type: 'text' },
      { key: 'hours_saturday', label: 'Saturday hours', type: 'text' },
      { key: 'hours_sunday',   label: 'Sunday hours',   type: 'text' },
    ],
  },
  {
    key: 'home',
    title: 'Home page',
    subtitle: 'Headlines and copy for the home page.',
    icon: '🏠',
    fields: [
      { key: 'hero_eyebrow',              label: 'Hero eyebrow',                    type: 'text' },
      { key: 'hero_headline_line1',       label: 'Hero headline — line 1',          type: 'text' },
      { key: 'hero_headline_line2',       label: 'Hero headline — line 2 (italic)', type: 'text' },
      { key: 'hero_description',          label: 'Hero description',                type: 'textarea' },
      { key: 'search_placeholder',        label: 'Search placeholder',              type: 'text' },
      { key: 'staff_picks_eyebrow',       label: 'Staff picks eyebrow',             type: 'text' },
      { key: 'staff_picks_title',         label: 'Staff picks title',               type: 'text' },
      { key: 'staff_picks_subtitle',      label: 'Staff picks subtitle',            type: 'textarea' },
      { key: 'cafe_story_headline_line1', label: 'Cafe headline — line 1',          type: 'text' },
      { key: 'cafe_story_headline_line2', label: 'Cafe headline — line 2 (italic)', type: 'text' },
      { key: 'cafe_story_body',           label: 'Cafe story body',                 type: 'textarea' },
    ],
  },
  {
    key: 'images',
    title: 'Images',
    subtitle: 'Background photos used on hero sections. Leave blank for the default gradient.',
    icon: '🖼️',
    fields: [
      { key: 'home_hero_bg_url',  label: 'Home hero background',  type: 'image', hint: 'Large photo behind the home page headline.' },
      { key: 'cafe_story_bg_url', label: 'Cafe story background', type: 'image', hint: 'Photo behind the "More than a bookstore" section.' },
    ],
  },
  {
    key: 'about',
    title: 'About — Hero & story',
    subtitle: 'The About page hero and the three-paragraph story block.',
    icon: '📖',
    fields: [
      { key: 'hero_eyebrow',        label: 'Hero eyebrow',                    type: 'text' },
      { key: 'hero_headline_line1', label: 'Hero headline — line 1',          type: 'text' },
      { key: 'hero_headline_line2', label: 'Hero headline — line 2 (italic)', type: 'text' },
      { key: 'hero_subtitle',       label: 'Hero subtitle',                   type: 'textarea' },
      { key: 'hero_bg_image_url',   label: 'Hero background image',           type: 'image' },
      { key: 'story_pull_quote',    label: 'Story pull quote',                type: 'text' },
      { key: 'story_body_1',        label: 'Story paragraph 1',               type: 'textarea' },
      { key: 'story_body_2',        label: 'Story paragraph 2',               type: 'textarea' },
      { key: 'story_body_3',        label: 'Story paragraph 3',               type: 'textarea' },
    ],
  },
  {
    key: 'about_values',
    parent: 'about',
    title: 'About — Values block',
    subtitle: 'The "Four things we care about" section with 01/02/03/04 cards.',
    icon: '💎',
    fields: [
      { key: 'values_eyebrow',      label: 'Eyebrow',                 type: 'text' },
      { key: 'values_heading',      label: 'Section heading',         type: 'text' },
      { key: 'values_1_title',      label: 'Value 1 — title',         type: 'text' },
      { key: 'values_1_body',       label: 'Value 1 — body',          type: 'textarea' },
      { key: 'values_2_title',      label: 'Value 2 — title',         type: 'text' },
      { key: 'values_2_body',       label: 'Value 2 — body',          type: 'textarea' },
      { key: 'values_3_title',      label: 'Value 3 — title',         type: 'text' },
      { key: 'values_3_body',       label: 'Value 3 — body',          type: 'textarea' },
      { key: 'values_4_title',      label: 'Value 4 — title',         type: 'text' },
      { key: 'values_4_body',       label: 'Value 4 — body',          type: 'textarea' },
    ],
  },
  {
    key: 'offers',
    title: 'Offers — Hero',
    subtitle: 'The top of the Offers page.',
    icon: '💳',
    fields: [
      { key: 'hero_eyebrow',        label: 'Hero eyebrow',                    type: 'text' },
      { key: 'hero_headline_line1', label: 'Hero headline — line 1',          type: 'text' },
      { key: 'hero_headline_line2', label: 'Hero headline — line 2 (italic)', type: 'text' },
      { key: 'hero_description',    label: 'Hero description',                type: 'textarea' },
      { key: 'plans_footer',        label: 'Fine print below plans',          type: 'text' },
    ],
  },
  {
    key: 'offers_why_join',
    parent: 'offers',
    title: 'Offers — Why join',
    subtitle: 'The "What a membership actually buys you" block.',
    icon: '⭐',
    fields: [
      { key: 'why_join_eyebrow',    label: 'Eyebrow',                  type: 'text' },
      { key: 'why_join_heading',    label: 'Section heading',          type: 'text' },
      { key: 'why_join_1_title',    label: 'Item 1 — title',           type: 'text' },
      { key: 'why_join_1_body',     label: 'Item 1 — body',            type: 'textarea' },
      { key: 'why_join_2_title',    label: 'Item 2 — title',           type: 'text' },
      { key: 'why_join_2_body',     label: 'Item 2 — body',            type: 'textarea' },
      { key: 'why_join_3_title',    label: 'Item 3 — title',           type: 'text' },
      { key: 'why_join_3_body',     label: 'Item 3 — body',            type: 'textarea' },
      { key: 'why_join_4_title',    label: 'Item 4 — title',           type: 'text' },
      { key: 'why_join_4_body',     label: 'Item 4 — body',            type: 'textarea' },
    ],
  },
  {
    key: 'offers_cta',
    parent: 'offers',
    title: 'Offers — Final CTA',
    subtitle: 'The "Ready to join?" block at the bottom of the page.',
    icon: '🎯',
    fields: [
      { key: 'cta_headline', label: 'CTA headline', type: 'text' },
      { key: 'cta_body',     label: 'CTA body',     type: 'textarea' },
    ],
  },
  {
    key: 'newsletter',
    title: 'Newsletter',
    subtitle: 'The subscribe strip at the bottom of the home page.',
    icon: '📬',
    fields: [
      { key: 'eyebrow',     label: 'Eyebrow (emoji ok)', type: 'text' },
      { key: 'headline',    label: 'Headline',           type: 'text' },
      { key: 'description', label: 'Description',        type: 'textarea' },
    ],
  },
];

// Map a "dotted field path" (e.g. "about.values_1_title") to the schema
// section key that contains it. Sections with `parent` are grouped under
// the parent's real storage key in DEFAULT_CONTENT. Used by click-to-edit.
export function sectionForFieldPath(fieldPath) {
  const [section, field] = fieldPath.split('.');
  for (const s of CONTENT_SCHEMA) {
    const storageKey = s.parent || s.key;
    if (storageKey === section && s.fields.some(f => f.key === field)) {
      return s.key;
    }
  }
  return null;
}
