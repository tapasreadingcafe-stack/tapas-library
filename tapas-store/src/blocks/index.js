// =====================================================================
// Block registry
//
// Single source of truth for every block type the page builder knows
// about. Each entry is:
//
//   type: {
//     label:        human name shown in the Add-section picker
//     category:     "Content" | "Media" | "Dynamic" — groups the
//                   picker into tabs
//     Renderer:     React component (imported from BlockLibrary)
//     defaultProps: starting props when a user adds a fresh block
//     schema:       field definitions the staff inspector renders —
//                   same shape the existing FIELD_RENDERERS understand
//                   ({ key, label, type, hint, options? })
//   }
//
// The editor (Phase 2) will read `schema` to build the inspector
// panel for whichever block the user selects. The storefront only
// needs `Renderer`; schema is stripped by tree-shaking on the store
// build if we ever decide to split the bundle.
// =====================================================================

import {
  Hero, CTA, FeatureGrid, Footer,
  TextImage, Testimonials, Pricing, FAQ, Gallery, Newsletter,
  BookList, BlogList, EventList,
} from './BlockLibrary';

export const BLOCK_REGISTRY = {
  hero: {
    label: 'Hero',
    category: 'Content',
    Renderer: Hero,
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
    Renderer: CTA,
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
    Renderer: FeatureGrid,
    defaultProps: {
      eyebrow: 'Why us',
      title: 'Everything you need',
      items: [
        { icon: '📚', title: 'Curated catalog',      description: 'Handpicked by our team.' },
        { icon: '☕', title: 'Read in-cafe',         description: 'Cozy seats, warm drinks.' },
        { icon: '🎟️', title: 'Events all year',     description: 'Clubs, workshops, signings.' },
      ],
    },
    schema: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title',   label: 'Title',   type: 'text' },
      // `items` is edited via a richer array UI in Phase 3.
    ],
  },

  footer: {
    label: 'Footer',
    category: 'Content',
    Renderer: Footer,
    defaultProps: {
      columns: [
        { title: 'Shop',   links: [{ label: 'All books', href: '/books' }, { label: 'Offers', href: '/offers' }] },
        { title: 'About',  links: [{ label: 'Our story', href: '/about' }, { label: 'Contact', href: '/contact' }] },
        { title: 'Visit',  links: [{ label: 'Events',    href: '/events' }, { label: 'Blog',    href: '/blog' }] },
      ],
      copyright: `© ${new Date().getFullYear()} Tapas Reading Cafe`,
      background_color: '',
    },
    schema: [
      { key: 'copyright', label: 'Copyright text', type: 'text' },
      { key: 'background_color', label: 'Background', type: 'color' },
    ],
  },

  text_image: {
    label: 'Text + image',
    category: 'Content',
    Renderer: TextImage,
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
    Renderer: Testimonials,
    defaultProps: {
      title: 'What readers say',
      items: [
        { quote: 'A quiet haven with great coffee.', author: 'Aarav',  role: 'Member' },
        { quote: 'The curation is spot on.',         author: 'Priya',  role: 'Reader' },
      ],
    },
    schema: [
      { key: 'title', label: 'Title', type: 'text' },
    ],
  },

  pricing: {
    label: 'Pricing',
    category: 'Content',
    Renderer: Pricing,
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
    Renderer: FAQ,
    defaultProps: {
      title: 'Questions, answered',
      items: [
        { question: 'How does borrowing work?',  answer: 'Members can borrow up to 2 books for 14 days.' },
        { question: 'Do you host events?',        answer: 'Yes — book clubs, author talks, open mics.' },
      ],
    },
    schema: [{ key: 'title', label: 'Title', type: 'text' }],
  },

  gallery: {
    label: 'Gallery',
    category: 'Media',
    Renderer: Gallery,
    defaultProps: { title: '', images: [], min_width: 240 },
    schema: [
      { key: 'title',     label: 'Title',         type: 'text' },
      { key: 'min_width', label: 'Min tile (px)', type: 'number', min: 120, max: 400 },
    ],
  },

  newsletter: {
    label: 'Newsletter',
    category: 'Content',
    Renderer: Newsletter,
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

  // ---- Dynamic blocks — content from Supabase ------------------------

  book_list: {
    label: 'Books from database',
    category: 'Dynamic',
    Renderer: BookList,
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
    label: 'Blog posts from database',
    category: 'Dynamic',
    Renderer: BlogList,
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
    label: 'Events from database',
    category: 'Dynamic',
    Renderer: EventList,
    defaultProps: {
      title: 'Upcoming events',
      limit: 6,
      upcoming_only: true,
      cta_text: 'See all events →',
      cta_href: '/events',
    },
    schema: [
      { key: 'title',         label: 'Title',          type: 'text' },
      { key: 'limit',         label: 'Show count',     type: 'number', min: 1, max: 24 },
      { key: 'upcoming_only', label: 'Upcoming only',  type: 'toggle' },
      { key: 'cta_text',      label: 'Button text',    type: 'text' },
      { key: 'cta_href',      label: 'Button link',    type: 'text' },
    ],
  },
};

// Helper: return a fresh block object with a unique id for the given
// type. Used when the user clicks "Add section" in the editor.
let _blockIdCounter = 0;
export function makeBlock(type) {
  const entry = BLOCK_REGISTRY[type];
  if (!entry) throw new Error(`Unknown block type: ${type}`);
  const id = `b_${Date.now().toString(36)}_${(_blockIdCounter++).toString(36)}`;
  return { id, type, props: JSON.parse(JSON.stringify(entry.defaultProps || {})) };
}
