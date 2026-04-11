// =====================================================================
// defaultContent.js
//
// The shape of editable site content AND its default values.
//
// Shared between:
//   - tapas-store (reads via SiteContentContext)
//   - staff dashboard (writes via the Site Content editor page)
//
// Rules:
//   - Every field has a sensible default that matches what's currently
//     hardcoded in the store pages, so if the DB row is missing the
//     store renders exactly like today.
//   - Don't remove keys — the dashboard editor is schema-driven off
//     this object. Adding new keys is fine; removing breaks the form.
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
  images: {
    home_hero_bg_url: '',
    cafe_story_bg_url: '',
  },
  newsletter: {
    eyebrow: '📬',
    headline: 'Our weekly reading list',
    description: "One email every Sunday — staff picks, new arrivals, and what's happening at the cafe. No spam, easy unsubscribe.",
  },
  plans: {
    basic_tier: 'Basic',
    basic_price: '₹300',
    basic_period: '/month',
    basic_tagline: 'For the occasional reader.',
    basic_features: '5 books borrowed at a time\n30-day borrowing period\nAccess to the full collection\nStandard reservations',
    silver_tier: 'Silver',
    silver_price: '₹500',
    silver_period: '/month',
    silver_tagline: 'Our most popular plan.',
    silver_features: '10 books borrowed at a time\n45-day borrowing period\nPriority reservations\n10% off every book purchase\nEarly access to new arrivals\nMonthly reading newsletter',
    gold_tier: 'Gold',
    gold_price: '₹800',
    gold_period: '/month',
    gold_tagline: 'For the voracious reader.',
    gold_features: 'Unlimited books at a time\n60-day borrowing period\n20% off every book purchase\nFree home delivery in Nagpur\n2 guest passes per month\nMembers-only events',
  },
  catalog: {
    header_eyebrow: 'The Collection',
    header_title: 'Every book on our shelves',
    header_subtitle_prefix: '',
    header_subtitle_suffix: 'titles curated by the Tapas team. Browse by genre or search for something specific.',
  },
  footer: {
    tagline: "Your neighbourhood library and book store. Discover, borrow, and buy books you'll love.",
    copyright_text: 'All rights reserved.',
  },
  visibility: {
    home_hero: true,
    home_genres: true,
    home_staff_picks: true,
    home_new_arrivals: true,
    home_cafe_story: true,
    home_newsletter: true,
    about_values: true,
    about_visit: true,
    about_contact_form: true,
    offers_plans: true,
    offers_why_join: true,
    offers_cta: true,
  },
  styles: {
    home_hero_headline_size: 72,
    home_hero_headline_align: 'left',
    about_hero_headline_size: 64,
    about_hero_headline_align: 'center',
    offers_hero_headline_size: 64,
    offers_hero_headline_align: 'center',
  },
  layout: {
    home_section_order: 'hero,genres,staff_picks,new_arrivals,cafe_story,newsletter',
  },
};

// =====================================================================
// Editor schema — drives the dashboard form.
// Each section renders as a card; each field becomes an input of the
// given type. Add new fields to DEFAULT_CONTENT and here at the same time.
// =====================================================================

// Dashboard schema is now in siteContentSchema.js — tapas-store only needs DEFAULT_CONTENT.
// Keeping the export here as a no-op for backward compat; edit the schema in the dashboard file.
export const CONTENT_SCHEMA_UNUSED = [
  {
    key: 'brand',
    title: 'Brand',
    subtitle: 'Name, tagline, colors, and fonts shared across every page.',
    icon: '🎨',
    fields: [
      { key: 'name',               label: 'Brand name',        type: 'text',  hint: 'Shown in the navbar and footer.' },
      { key: 'tagline',            label: 'Brand tagline',     type: 'text',  hint: 'Small line under the name, e.g. "& BOOK STORE".' },
      { key: 'primary_color',      label: 'Primary color',     type: 'color', hint: 'Dark brown. Used for navbar, hero backgrounds, headlines.' },
      { key: 'primary_color_dark', label: 'Primary color — darker shade', type: 'color' },
      { key: 'primary_color_light',label: 'Primary color — lighter shade', type: 'color' },
      { key: 'accent_color',       label: 'Accent color',      type: 'color', hint: 'Warm gold. Used for prices, CTAs, highlights.' },
      { key: 'accent_color_dark',  label: 'Accent color — darker shade', type: 'color' },
      { key: 'cream_color',        label: 'Background cream',  type: 'color', hint: 'Page background — keep light.' },
      { key: 'sand_color',         label: 'Sand accent',       type: 'color', hint: 'Used for book cover placeholders.' },
      { key: 'heading_font',       label: 'Heading font',      type: 'font',  hint: 'Any Google Font. Default: Playfair Display.' },
      { key: 'body_font',          label: 'Body font',         type: 'font',  hint: 'Any Google Font. Default: Lato.' },
    ],
  },
  {
    key: 'contact',
    title: 'Contact',
    subtitle: 'Phone, email, address, and opening hours shown in About and the footer.',
    icon: '📍',
    fields: [
      { key: 'phone',          label: 'Phone',            type: 'text' },
      { key: 'email',          label: 'Email',            type: 'text' },
      { key: 'address',        label: 'Address',          type: 'textarea' },
      { key: 'hours_weekdays', label: 'Mon–Fri hours',    type: 'text' },
      { key: 'hours_saturday', label: 'Saturday hours',   type: 'text' },
      { key: 'hours_sunday',   label: 'Sunday hours',     type: 'text' },
    ],
  },
  {
    key: 'home',
    title: 'Home page',
    subtitle: 'Headlines and copy for www.tapasreadingcafe.com/',
    icon: '🏠',
    fields: [
      { key: 'hero_eyebrow',          label: 'Hero eyebrow',        type: 'text' },
      { key: 'hero_headline_line1',   label: 'Hero headline — line 1', type: 'text' },
      { key: 'hero_headline_line2',   label: 'Hero headline — line 2 (italic)', type: 'text' },
      { key: 'hero_description',      label: 'Hero description',    type: 'textarea' },
      { key: 'search_placeholder',    label: 'Search placeholder',  type: 'text' },
      { key: 'staff_picks_eyebrow',   label: 'Staff picks eyebrow', type: 'text' },
      { key: 'staff_picks_title',     label: 'Staff picks title',   type: 'text' },
      { key: 'staff_picks_subtitle',  label: 'Staff picks subtitle',type: 'textarea' },
      { key: 'cafe_story_headline_line1', label: 'Cafe story headline — line 1', type: 'text' },
      { key: 'cafe_story_headline_line2', label: 'Cafe story headline — line 2 (italic)', type: 'text' },
      { key: 'cafe_story_body',       label: 'Cafe story body',     type: 'textarea' },
    ],
  },
  {
    key: 'about',
    title: 'About page',
    subtitle: 'Story and hero copy for /about',
    icon: '📖',
    fields: [
      { key: 'hero_eyebrow',        label: 'Hero eyebrow',        type: 'text' },
      { key: 'hero_headline_line1', label: 'Hero headline — line 1', type: 'text' },
      { key: 'hero_headline_line2', label: 'Hero headline — line 2 (italic)', type: 'text' },
      { key: 'hero_subtitle',       label: 'Hero subtitle',       type: 'textarea' },
      { key: 'story_pull_quote',    label: 'Story pull quote',    type: 'text' },
      { key: 'story_body_1',        label: 'Story paragraph 1',   type: 'textarea' },
      { key: 'story_body_2',        label: 'Story paragraph 2',   type: 'textarea' },
      { key: 'story_body_3',        label: 'Story paragraph 3',   type: 'textarea' },
    ],
  },
  {
    key: 'offers',
    title: 'Offers page',
    subtitle: 'Headlines and copy for /offers',
    icon: '💳',
    fields: [
      { key: 'hero_eyebrow',        label: 'Hero eyebrow',        type: 'text' },
      { key: 'hero_headline_line1', label: 'Hero headline — line 1', type: 'text' },
      { key: 'hero_headline_line2', label: 'Hero headline — line 2 (italic)', type: 'text' },
      { key: 'hero_description',    label: 'Hero description',    type: 'textarea' },
    ],
  },
  {
    key: 'newsletter',
    title: 'Newsletter',
    subtitle: 'The "Subscribe to our reading list" strip at the bottom of the home page.',
    icon: '📬',
    fields: [
      { key: 'eyebrow',     label: 'Eyebrow (emoji ok)', type: 'text' },
      { key: 'headline',    label: 'Headline',           type: 'text' },
      { key: 'description', label: 'Description',        type: 'textarea' },
    ],
  },
];
