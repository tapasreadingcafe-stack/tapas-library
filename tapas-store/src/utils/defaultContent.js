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
    name: 'TAPAS reading cafe',
    tagline: '',
    primary_color: '#CFF389',        // light lime — headlines, navbar
    primary_color_dark: '#A8D964',
    primary_color_light: '#DEFAA8',
    accent_color: '#00B9AE',         // bright teal — primary CTAs, links
    accent_color_dark: '#00A09A',
    cream_color: '#E6CCBE',          // warm cream — neutral surfaces
    sand_color: '#F5E9DD',
    heading_font: 'Poppins',
    body_font: 'Poppins',
  },
  contact: {
    phone: '',
    email: '',
    address: '',
    hours_weekdays: '',
    hours_saturday: '',
    hours_sunday: '',
  },
  home: {
    hero_eyebrow: '',
    hero_headline_line1: 'Your headline here',
    hero_headline_line2: '',
    hero_description: 'A short paragraph that sets the tone for your homepage.',
    search_placeholder: 'Search…',

    // Hero carousel — legacy home hero slides. Kept for back-compat but
    // the new pattern is to use the Hero block variants instead.
    hero_carousel_enabled: false,
    hero_carousel_autoplay_seconds: 6,

    hero_slide_1_eyebrow: '',
    hero_slide_1_title: '',
    hero_slide_1_body: '',
    hero_slide_1_cta_label: '',
    hero_slide_1_cta_link: '/',
    hero_slide_1_image: '',

    hero_slide_2_eyebrow: '',
    hero_slide_2_title: '',
    hero_slide_2_body: '',
    hero_slide_2_cta_label: '',
    hero_slide_2_cta_link: '/',
    hero_slide_2_image: '',

    hero_slide_3_eyebrow: '',
    hero_slide_3_title: '',
    hero_slide_3_body: '',
    hero_slide_3_cta_label: '',
    hero_slide_3_cta_link: '/',
    hero_slide_3_image: '',

    staff_picks_eyebrow: '',
    staff_picks_title: '',
    staff_picks_subtitle: '',
    cafe_story_headline_line1: '',
    cafe_story_headline_line2: '',
    cafe_story_body: '',
  },
  about: {
    hero_eyebrow: '',
    hero_headline_line1: 'About us',
    hero_headline_line2: '',
    hero_subtitle: '',
    hero_bg_image_url: '',
    story_pull_quote: '',
    story_body_1: '',
    story_body_2: '',
    story_body_3: '',
    values_heading: '',
    values_eyebrow: '',
    values_1_title: '', values_1_body: '',
    values_2_title: '', values_2_body: '',
    values_3_title: '', values_3_body: '',
    values_4_title: '', values_4_body: '',
  },
  offers: {
    hero_eyebrow: '',
    hero_headline_line1: 'Offers',
    hero_headline_line2: '',
    hero_description: '',
    plans_footer: '',
    why_join_eyebrow: '',
    why_join_heading: '',
    why_join_1_title: '', why_join_1_body: '',
    why_join_2_title: '', why_join_2_body: '',
    why_join_3_title: '', why_join_3_body: '',
    why_join_4_title: '', why_join_4_body: '',
    cta_headline: '',
    cta_body: '',
  },
  images: {
    home_hero_bg_url: '',
    cafe_story_bg_url: '',
  },
  newsletter: {
    eyebrow: '',
    headline: 'Subscribe for updates',
    description: 'Join our newsletter to get updates in your inbox.',
  },
  plans: {
    basic_tier: 'Basic',
    basic_price: '',
    basic_period: '/month',
    basic_tagline: '',
    basic_features: '',
    silver_tier: 'Silver',
    silver_price: '',
    silver_period: '/month',
    silver_tagline: '',
    silver_features: '',
    gold_tier: 'Gold',
    gold_price: '',
    gold_period: '/month',
    gold_tagline: '',
    gold_features: '',
  },
  catalog: {
    header_eyebrow: '',
    header_title: 'Catalog',
    header_subtitle_prefix: '',
    header_subtitle_suffix: '',
  },
  footer: {
    template: 'modern_dark',
    tagline: 'Where words brew and stories come alive. Your community bookstore and reading sanctuary.',
    copyright_text: 'All rights reserved.',
    quick_links_heading: 'Quick Links',
    hours_heading: 'Opening Hours',
    contact_heading: 'Contact',
  },
  header: {
    template: 'classic',
    logo_emoji: '',
    nav_home: 'Home',
    nav_books: 'Shop',
    nav_offers: 'Offers',
    nav_about: 'About',
    login_label: 'Sign In',
    signup_label: 'Sign Up',
    search_placeholder: 'Search…',
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
  typography: {
    heading_xxl_size:   72,   // clamp-max for the biggest page titles (hero h1)
    heading_xl_size:    42,   // section titles like "Handpicked by our librarians"
    heading_l_size:     32,   // sub-section titles
    heading_color:      '',   // optional override; blank = use brand.primary_color
    heading_weight:     '800',
    body_size:          16,
    body_color:         '',
    eyebrow_size:       11,
    eyebrow_tracking:   '2.5px',
  },
  buttons: {
    radius:         50,
    padding_x:      32,
    padding_y:      14,
    font_size:      15,
    font_weight:    '700',
    text_transform: 'none',
    letter_spacing: '0.5px',
  },
  // Per-element CSS override map. Keyed by the data-editable path;
  // values are camelCase CSS property objects applied via an injected
  // <style> tag with !important so they win over hardcoded inline styles.
  // Edited by the "element inspector" in the dashboard when an element
  // is clicked on the preview canvas.
  element_styles: {},
  section_styles: {
    // Per-section overrides. All nullable — empty means "use defaults".
    home_hero_padding_top:      80,
    home_hero_padding_bottom:   100,
    home_hero_bg_color:         '',
    home_hero_bg_image:         '',
    home_staff_picks_padding_top:    80,
    home_staff_picks_padding_bottom: 80,
    home_staff_picks_bg_color:       '',
    home_staff_picks_bg_image:       '',
    home_cafe_story_padding_top:    100,
    home_cafe_story_padding_bottom: 100,
    home_cafe_story_bg_color:       '',
    home_cafe_story_bg_image:       '',
    about_hero_padding_top:    100,
    about_hero_padding_bottom: 120,
    about_hero_bg_color:       '',
    about_hero_bg_image:       '',
    offers_hero_padding_top:    80,
    offers_hero_padding_bottom: 40,
    offers_hero_bg_color:       '',
    offers_hero_bg_image:       '',
    // Per-section color / alignment overrides.
    header_bg_color:            '',
    header_text_color:          '',
    header_link_color:          '',
    header_link_active_color:   '',
    footer_bg_color:            '',
    footer_text_color:          '',
    footer_heading_color:       '',
    footer_link_color:          '',
    footer_text_align:          'left',
    home_genres_bg_color:       '',
    home_genres_text_align:     'left',
    home_new_arrivals_bg_color: '',
    home_new_arrivals_text_align: 'left',
    home_newsletter_bg_color:   '',
    home_newsletter_text_align: 'center',
  },

  // =====================================================================
  // Webflow-style page builder (Phase 1)
  //
  // Each entry in `pages` is a page's block tree. Blocks are rendered
  // in order by <PageRenderer pageKey="..."/>. When a page has NO
  // blocks (empty array), the storefront falls back to the legacy
  // hardcoded JSX of that page. This lets us migrate one page at a
  // time without breaking anything.
  //
  // Block shape: { id, type, props }
  //   - `type` must match a key in tapas-store/src/blocks/index.js
  //   - `props` is a free-form object; its shape is defined by the
  //     matching entry's `schema` and `defaultProps`
  // =====================================================================
  pages: {
    home: {
      meta: { title: 'Home', description: '' },
      blocks: [
        { id: 'tapas_home_hero',         type: 'tapas_hero',         props: {} },
        { id: 'tapas_home_services',     type: 'tapas_services',     props: {} },
        { id: 'tapas_home_new_arrivals', type: 'tapas_new_arrivals', props: {} },
        { id: 'tapas_home_inspiration',  type: 'tapas_inspiration',  props: {} },
        { id: 'tapas_home_testimonials', type: 'tapas_testimonials', props: {} },
        { id: 'tapas_home_newsletter',   type: 'tapas_newsletter',   props: {} },
      ],
    },
    about:   { meta: { title: 'About',   description: '' }, blocks: [] },
    catalog: { meta: { title: 'Shop',    description: '' }, blocks: [] },
    offers:  { meta: { title: 'Offers',  description: '' }, blocks: [] },
    blog:    { meta: { title: 'Journal', description: '' }, blocks: [] },
    events:  { meta: { title: 'Events',  description: '' }, blocks: [] },
  },

  // Reusable block trees the user saves from the editor. Each entry:
  // { id, name, blocks: [...] }. See Phase 3 in the plan.
  block_templates: [],
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
