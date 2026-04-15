// =====================================================================
// blockRegistryMeta.js  (STAFF APP)
//
// Metadata-only mirror of tapas-store/src/blocks/index.js
//
// Why duplicated
//   The staff editor and the customer storefront are two separate CRA
//   apps with independent src/ trees, so they can't share a module.
//   The storefront needs the React Renderer components (which pull in
//   supabase, react-router, etc.) while the staff editor only needs
//   the metadata: label, category, defaultProps, inspector schema.
//   Duplicating just the metadata keeps the staff bundle lean and
//   means Phase 2 doesn't cross the app boundary.
//
// Keep in sync
//   When adding or changing a block in tapas-store/src/blocks/index.js
//   mirror the metadata here. The `type` keys MUST match exactly or
//   the storefront won't know how to render blocks created in the
//   editor.
// =====================================================================

export const BLOCK_REGISTRY_META = {
  hero: {
    label: 'Hero',
    category: 'Content',
    icon: '🎯',
    defaultProps: {
      eyebrow: 'New arrival',
      headline: 'Your headline here',
      subheadline: '',
      description: 'A short paragraph to set the tone for this page.',
      cta_text: 'Get started →',
      cta_href: '/',
      align: 'center',
      background_image: '',
      overlay_opacity: 0.4,
    },
    schema: [
      { key: 'eyebrow',          label: 'Eyebrow',      type: 'text' },
      { key: 'headline',         label: 'Headline',     type: 'text' },
      { key: 'subheadline',      label: 'Subheadline',  type: 'text', hint: 'Optional italic line under the headline.' },
      { key: 'description',      label: 'Description',  type: 'textarea' },
      { key: 'cta_text',         label: 'Button text',  type: 'text' },
      { key: 'cta_href',         label: 'Button link',  type: 'text' },
      { key: 'align',            label: 'Alignment',    type: 'select', options: [
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' },
      ]},
      { key: 'background_image', label: 'Background',   type: 'image' },
      { key: 'overlay_opacity',  label: 'Overlay',      type: 'number', min: 0, max: 1 },
    ],
  },

  cta: {
    label: 'Call to action',
    category: 'Content',
    icon: '📣',
    defaultProps: {
      headline: 'Ready to start reading?',
      description: '',
      cta_text: 'Join us →',
      cta_href: '/',
      background_color: '',
      text_color: '#ffffff',
      cta_variant: 'primary',
    },
    schema: [
      { key: 'headline',         label: 'Headline',   type: 'text' },
      { key: 'description',      label: 'Description',type: 'textarea' },
      { key: 'cta_text',         label: 'Button text',type: 'text' },
      { key: 'cta_href',         label: 'Button link',type: 'text' },
      { key: 'background_color', label: 'Background', type: 'color' },
      { key: 'text_color',       label: 'Text color', type: 'color' },
    ],
  },

  feature_grid: {
    label: 'Feature grid',
    category: 'Content',
    icon: '⊞',
    defaultProps: {
      eyebrow: 'Why us',
      title: 'Everything you need',
      items: [
        { icon: '📚', title: 'Curated catalog',  description: 'Handpicked by our team.' },
        { icon: '☕', title: 'Read in-cafe',     description: 'Cozy seats, warm drinks.' },
        { icon: '🎟️', title: 'Events all year', description: 'Clubs, workshops, signings.' },
      ],
    },
    schema: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title',   label: 'Title',   type: 'text' },
    ],
  },

  footer: {
    label: 'Footer',
    category: 'Content',
    icon: '⎯',
    defaultProps: {
      columns: [
        { title: 'Shop',  links: [{ label: 'All books', href: '/books' }, { label: 'Offers', href: '/offers' }] },
        { title: 'About', links: [{ label: 'Our story', href: '/about' }, { label: 'Contact', href: '/contact' }] },
        { title: 'Visit', links: [{ label: 'Events',    href: '/events' }, { label: 'Blog',    href: '/blog' }] },
      ],
      copyright: `© ${new Date().getFullYear()} Tapas Reading Cafe`,
      background_color: '',
    },
    schema: [
      { key: 'copyright',        label: 'Copyright text', type: 'text' },
      { key: 'background_color', label: 'Background',     type: 'color' },
    ],
  },

  text_image: {
    label: 'Text + image',
    category: 'Content',
    icon: '▭',
    defaultProps: {
      eyebrow: '',
      heading: 'Add a heading',
      body: 'Write a few sentences that tell your story.',
      image_url: '',
      image_side: 'right',
      cta_text: '',
      cta_href: '',
    },
    schema: [
      { key: 'eyebrow',    label: 'Eyebrow',    type: 'text' },
      { key: 'heading',    label: 'Heading',    type: 'text' },
      { key: 'body',       label: 'Body',       type: 'textarea' },
      { key: 'image_url',  label: 'Image',      type: 'image' },
      { key: 'image_side', label: 'Image side', type: 'select', options: [
        { value: 'left',  label: 'Left' },
        { value: 'right', label: 'Right' },
      ]},
      { key: 'cta_text',   label: 'Button text',type: 'text' },
      { key: 'cta_href',   label: 'Button link',type: 'text' },
    ],
  },

  testimonials: {
    label: 'Testimonials',
    category: 'Content',
    icon: '❝',
    defaultProps: {
      title: 'What readers say',
      items: [
        { quote: 'A quiet haven with great coffee.', author: 'Aarav', role: 'Member' },
        { quote: 'The curation is spot on.',         author: 'Priya', role: 'Reader' },
      ],
    },
    schema: [
      { key: 'title', label: 'Title', type: 'text' },
    ],
  },

  pricing: {
    label: 'Pricing',
    category: 'Content',
    icon: '₹',
    defaultProps: {
      title: 'Membership',
      subtitle: 'Pick a plan that suits you.',
      tiers: [
        { name: 'Reader',   price: '₹499',  interval: 'month', features: ['2 books at a time', 'Cafe discount'], cta_text: 'Join', cta_href: '/membership' },
        { name: 'Explorer', price: '₹899',  interval: 'month', features: ['4 books at a time', '10% cafe discount', 'Event priority'], cta_text: 'Join', cta_href: '/membership', highlight: true },
        { name: 'Family',   price: '₹1299', interval: 'month', features: ['Up to 4 members', '6 books at a time', '15% cafe discount'], cta_text: 'Join', cta_href: '/membership' },
      ],
    },
    schema: [
      { key: 'title',    label: 'Title',    type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
    ],
  },

  faq: {
    label: 'FAQ',
    category: 'Content',
    icon: '?',
    defaultProps: {
      title: 'Questions, answered',
      items: [
        { question: 'How does borrowing work?', answer: 'Members can borrow up to 2 books for 14 days.' },
        { question: 'Do you host events?',       answer: 'Yes — book clubs, author talks, open mics.' },
      ],
    },
    schema: [{ key: 'title', label: 'Title', type: 'text' }],
  },

  gallery: {
    label: 'Gallery',
    category: 'Media',
    icon: '⊟',
    defaultProps: { title: '', images: [], min_width: 240 },
    schema: [
      { key: 'title',     label: 'Title',         type: 'text' },
      { key: 'min_width', label: 'Min tile (px)', type: 'number', min: 120, max: 400 },
    ],
  },

  newsletter: {
    label: 'Newsletter',
    category: 'Content',
    icon: '✉',
    defaultProps: {
      headline: 'Stories in your inbox',
      description: 'Staff picks, new arrivals, and upcoming events — once a month.',
      placeholder: 'you@email.com',
      button_text: 'Subscribe',
    },
    schema: [
      { key: 'headline',    label: 'Headline',    type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'placeholder', label: 'Placeholder', type: 'text' },
      { key: 'button_text', label: 'Button text', type: 'text' },
    ],
  },

  // ---- Phase 4: Video, Map, Countdown, Contact form ------------------

  video_embed: {
    label: 'Video embed',
    category: 'Media',
    icon: '▶',
    defaultProps: {
      title: '',
      subtitle: '',
      video_url: '',
      max_width: '960px',
    },
    schema: [
      { key: 'title',     label: 'Title',     type: 'text' },
      { key: 'subtitle',  label: 'Subtitle',  type: 'text' },
      { key: 'video_url', label: 'Video URL', type: 'text', hint: 'YouTube or Vimeo URL' },
      { key: 'max_width', label: 'Max width', type: 'text', hint: 'e.g. 960px' },
    ],
  },

  map_embed: {
    label: 'Map',
    category: 'Media',
    icon: '📍',
    defaultProps: {
      title: 'Find us',
      address: 'Tapas Reading Cafe',
      address_text: '',
      height: '400px',
      max_width: '100%',
    },
    schema: [
      { key: 'title',        label: 'Title',           type: 'text' },
      { key: 'address',      label: 'Address (query)', type: 'text', hint: 'Street address for map pin' },
      { key: 'address_text', label: 'Display text',    type: 'text', hint: 'Optional caption under map' },
      { key: 'height',       label: 'Height',          type: 'text' },
    ],
  },

  countdown: {
    label: 'Countdown',
    category: 'Content',
    icon: '⏱',
    defaultProps: {
      eyebrow: 'Limited time',
      title: 'Our next event starts in',
      target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      accent_color: '',
      background_color: '',
      cta_text: '',
      cta_href: '/',
    },
    schema: [
      { key: 'eyebrow',          label: 'Eyebrow',      type: 'text' },
      { key: 'title',            label: 'Title',        type: 'text' },
      { key: 'target_date',      label: 'Target date',  type: 'text', hint: 'ISO datetime, e.g. 2026-12-31T23:59' },
      { key: 'accent_color',     label: 'Accent color', type: 'color' },
      { key: 'background_color', label: 'Background',   type: 'color' },
      { key: 'cta_text',         label: 'Button text',  type: 'text' },
      { key: 'cta_href',         label: 'Button link',  type: 'text' },
    ],
  },

  contact_form: {
    label: 'Contact form',
    category: 'Content',
    icon: '✎',
    defaultProps: {
      title: 'Get in touch',
      subtitle: 'We usually reply within a day.',
      message_placeholder: 'Your message...',
      button_text: 'Send message',
      success_message: 'Thanks! We\'ll be in touch soon.',
    },
    schema: [
      { key: 'title',               label: 'Title',              type: 'text' },
      { key: 'subtitle',            label: 'Subtitle',           type: 'text' },
      { key: 'message_placeholder', label: 'Message placeholder',type: 'text' },
      { key: 'button_text',         label: 'Button text',        type: 'text' },
      { key: 'success_message',     label: 'Success message',    type: 'text' },
    ],
  },

  // ---- Dynamic blocks — live from Supabase ---------------------------

  book_list: {
    label: 'Books (from database)',
    category: 'Dynamic',
    icon: '📚',
    defaultProps: {
      eyebrow: 'Staff picks',
      title: 'Books we love this month',
      limit: 8,
      category: 'all',
      sort: 'created_at',
      staff_picks_only: true,
      cta_text: 'Browse all books →',
      cta_href: '/books',
    },
    schema: [
      { key: 'eyebrow',          label: 'Eyebrow',     type: 'text' },
      { key: 'title',            label: 'Title',       type: 'text' },
      { key: 'limit',            label: 'Show count',  type: 'number', min: 1, max: 48 },
      { key: 'staff_picks_only', label: 'Staff picks', type: 'toggle' },
      { key: 'sort',             label: 'Sort by',     type: 'select', options: [
        { value: 'created_at', label: 'Newest first' },
        { value: 'title',      label: 'Title (A–Z)' },
      ]},
      { key: 'cta_text',         label: 'Button text', type: 'text' },
      { key: 'cta_href',         label: 'Button link', type: 'text' },
    ],
  },

  blog_list: {
    label: 'Blog posts (from database)',
    category: 'Dynamic',
    icon: '✍',
    defaultProps: {
      title: 'From the journal',
      limit: 6,
      cta_text: 'Read the journal →',
      cta_href: '/blog',
    },
    schema: [
      { key: 'title',    label: 'Title',       type: 'text' },
      { key: 'limit',    label: 'Show count',  type: 'number', min: 1, max: 24 },
      { key: 'cta_text', label: 'Button text', type: 'text' },
      { key: 'cta_href', label: 'Button link', type: 'text' },
    ],
  },

  event_list: {
    label: 'Events (from database)',
    category: 'Dynamic',
    icon: '🎟',
    defaultProps: {
      title: 'Upcoming events',
      limit: 6,
      upcoming_only: true,
      cta_text: 'See all events →',
      cta_href: '/events',
    },
    schema: [
      { key: 'title',         label: 'Title',         type: 'text' },
      { key: 'limit',         label: 'Show count',    type: 'number', min: 1, max: 24 },
      { key: 'upcoming_only', label: 'Upcoming only', type: 'toggle' },
      { key: 'cta_text',      label: 'Button text',   type: 'text' },
      { key: 'cta_href',      label: 'Button link',   type: 'text' },
    ],
  },
};

// Groupings for the Add-section picker.
export const BLOCK_CATEGORIES = ['Content', 'Media', 'Dynamic'];

// Fresh block factory. Mirrors makeBlock() in tapas-store/src/blocks/index.js.
let _blockIdCounter = 0;
export function makeBlock(type) {
  const entry = BLOCK_REGISTRY_META[type];
  if (!entry) throw new Error(`Unknown block type: ${type}`);
  const id = `b_${Date.now().toString(36)}_${(_blockIdCounter++).toString(36)}`;
  return {
    id,
    type,
    props: JSON.parse(JSON.stringify(entry.defaultProps || {})),
  };
}

// Ordered list of all pages the editor can manage. Must align with
// siteContentSchema.js `DEFAULT_CONTENT.pages` and tapas-store's
// default content. Labels are shown in the Layers tab page picker.
export const EDITABLE_PAGES = [
  { key: 'home',    label: 'Home',    path: '/' },
  { key: 'about',   label: 'About',   path: '/about' },
  { key: 'catalog', label: 'Books',   path: '/books' },
  { key: 'offers',  label: 'Offers',  path: '/offers' },
  { key: 'blog',    label: 'Journal', path: '/blog' },
  { key: 'events',  label: 'Events',  path: '/events' },
];
