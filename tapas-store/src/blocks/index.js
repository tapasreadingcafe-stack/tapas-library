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
  Hero, Navbar, CTA, FeatureGrid, Footer,
  TextImage, Testimonials, Pricing, FAQ, Gallery, Newsletter,
  VideoEmbed, MapEmbed, Countdown, ContactForm,
  Accordion, Tabs, Stats, LogoRow,
  Team, AnnouncementBar, PricingCompare, TestimonialCarousel,
  ReviewWall, EventRSVP,
  BookList, BlogList, EventList,
} from './BlockLibrary';
import {
  TapasHero, TapasServices, TapasNewArrivals, TapasInspiration,
  TapasTestimonials, TapasNewsletter, TapasSection,
} from './TapasFigmaBlocks';

export const BLOCK_REGISTRY = {
  hero: {
    label: 'Hero',
    category: 'Content',
    Renderer: Hero,
    defaultProps: {
      preset: 'centered',
      eyebrow: 'New arrival',
      headline: 'Your headline here',
      subheadline: '',
      description: 'A short paragraph to set the tone for this page.',
      cta_text: 'Get started →',
      cta_href: '/',
      align: 'center',
      background_image: '',
      overlay_opacity: 0.4,
      image_url: '',
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

  navbar: {
    label: 'Navbar',
    category: 'Content',
    Renderer: Navbar,
    defaultProps: {
      preset: 'classic',
      brand_name: 'Your brand',
      links: [
        { label: 'Home',    href: '/' },
        { label: 'About',   href: '/about' },
        { label: 'Pricing', href: '/offers' },
        { label: 'Contact', href: '/about' },
      ],
      cta_text: 'Sign up',
      cta_href: '/',
      background_color: '',
      text_color: '',
    },
  },

  footer: {
    label: 'Footer',
    category: 'Content',
    Renderer: Footer,
    defaultProps: {
      preset: 'columns',
      columns: [
        { title: 'Shop',   links: [{ label: 'All books', href: '/books' }, { label: 'Offers', href: '/offers' }] },
        { title: 'About',  links: [{ label: 'Our story', href: '/about' }, { label: 'Contact', href: '/contact' }] },
        { title: 'Visit',  links: [{ label: 'Events',    href: '/events' }, { label: 'Blog',    href: '/blog' }] },
      ],
      copyright: `© ${new Date().getFullYear()} Your brand`,
      background_color: '',
      tagline: '',
    },
    schema: [
      { key: 'copyright', label: 'Copyright text', type: 'text' },
      { key: 'tagline',   label: 'Tagline',        type: 'text' },
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

  // ---- Phase 4: Video, Map, Countdown, Contact form ------------------

  video_embed: {
    label: 'Video embed',
    category: 'Media',
    Renderer: VideoEmbed,
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
    Renderer: MapEmbed,
    defaultProps: {
      title: 'Find us',
      address: '',
      address_text: '',
      height: '400px',
      max_width: '100%',
    },
    schema: [
      { key: 'title',         label: 'Title',           type: 'text' },
      { key: 'address',       label: 'Address (query)', type: 'text', hint: 'Street address for map pin' },
      { key: 'address_text',  label: 'Display text',    type: 'text', hint: 'Optional caption under map' },
      { key: 'height',        label: 'Height',          type: 'text' },
    ],
  },

  countdown: {
    label: 'Countdown',
    category: 'Content',
    Renderer: Countdown,
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
      { key: 'eyebrow',          label: 'Eyebrow',        type: 'text' },
      { key: 'title',            label: 'Title',          type: 'text' },
      { key: 'target_date',      label: 'Target date',    type: 'text', hint: 'ISO datetime, e.g. 2026-12-31T23:59' },
      { key: 'accent_color',     label: 'Accent color',   type: 'color' },
      { key: 'background_color', label: 'Background',     type: 'color' },
      { key: 'cta_text',         label: 'Button text',    type: 'text' },
      { key: 'cta_href',         label: 'Button link',    type: 'text' },
    ],
  },

  contact_form: {
    label: 'Contact form',
    category: 'Content',
    Renderer: ContactForm,
    defaultProps: {
      title: 'Get in touch',
      subtitle: 'We usually reply within a day.',
      button_text: 'Send message',
      success_message: 'Thanks! We\'ll be in touch soon.',
      // Empty = use the default Name / Email / Message fields.
      fields: [],
    },
    schema: [
      { key: 'title',              label: 'Title',             type: 'text' },
      { key: 'subtitle',           label: 'Subtitle',          type: 'text' },
      { key: 'button_text',        label: 'Button text',       type: 'text' },
      { key: 'success_message',    label: 'Success message',   type: 'text' },
    ],
  },

  // ---- Phase 5: Accordion + Tabs ------------------------------------

  accordion: {
    label: 'Accordion',
    category: 'Content',
    Renderer: Accordion,
    defaultProps: {
      eyebrow: '',
      title: 'Good to know',
      allow_multiple: true,
      open_first: true,
      items: [
        { title: 'Opening hours',      content: 'Mon–Fri · 9am to 9pm\nSat–Sun · 10am to 10pm' },
        { title: 'Membership',         content: 'Choose from monthly, quarterly, or annual plans. All include unlimited borrowing and 10% off cafe orders.' },
        { title: 'How borrowing works', content: 'Members can borrow up to 2 books for 14 days. Renew once if no one is waiting.' },
      ],
    },
    schema: [
      { key: 'eyebrow',        label: 'Eyebrow',         type: 'text' },
      { key: 'title',          label: 'Title',           type: 'text' },
      { key: 'allow_multiple', label: 'Allow multiple open', type: 'toggle' },
      { key: 'open_first',     label: 'Open first item by default', type: 'toggle' },
    ],
  },

  tabs: {
    label: 'Tabs',
    category: 'Content',
    Renderer: Tabs,
    defaultProps: {
      title: '',
      items: [
        { label: 'About',    content: 'Tell the story of your space in a warm, welcoming tone.' },
        { label: 'Policies', content: 'Share your house rules, late-return fees, or community guidelines.' },
        { label: 'Visit',    content: 'Address, phone, and a friendly note about what to expect on arrival.' },
      ],
    },
    schema: [
      { key: 'title', label: 'Title (optional)', type: 'text' },
    ],
  },

  stats: {
    label: 'Stats / Metrics',
    category: 'Content',
    Renderer: Stats,
    defaultProps: {
      eyebrow: 'By the numbers',
      title: '',
      items: [
        { value: '500+', label: 'Books in catalog',  caption: 'Fiction, non-fiction, kids' },
        { value: '200',  label: 'Active members',    caption: 'And growing every month' },
        { value: '4.8★', label: 'Google rating',     caption: 'From 120+ reviews' },
      ],
      background_color: '',
      number_color: '',
    },
    schema: [
      { key: 'eyebrow',          label: 'Eyebrow',      type: 'text' },
      { key: 'title',            label: 'Title',        type: 'text' },
      { key: 'background_color', label: 'Background',   type: 'color' },
      { key: 'number_color',     label: 'Number color', type: 'color' },
    ],
  },

  logo_row: {
    label: 'Logo row',
    category: 'Media',
    Renderer: LogoRow,
    defaultProps: {
      title: 'As featured in',
      logos: [],
      logo_height: 40,
      grayscale: true,
      background_color: '',
    },
    schema: [
      { key: 'title',            label: 'Title',           type: 'text' },
      { key: 'logo_height',      label: 'Logo height (px)', type: 'number', min: 20, max: 120 },
      { key: 'grayscale',        label: 'Grayscale (color on hover)', type: 'toggle' },
      { key: 'background_color', label: 'Background',      type: 'color' },
    ],
  },

  // ---- Phase 6 ------------------------------------------------------

  team: {
    label: 'Team members',
    category: 'Content',
    Renderer: Team,
    defaultProps: {
      eyebrow: 'Meet the team',
      title: 'The humans behind Tapas',
      subtitle: 'Book lovers, baristas, and storytellers.',
      min_card_width: 220,
      members: [
        { name: 'Jane Doe',  role: 'Founder',     photo: '', bio: 'Started Tapas after a lifetime of bookshop hopping.', social_label: '', social_href: '' },
        { name: 'Arjun Rao', role: 'Head Barista',photo: '', bio: 'Serves the best pour-over in Nagpur. Fight me.',       social_label: '', social_href: '' },
        { name: 'Priya Sen', role: 'Librarian',   photo: '', bio: 'Can recommend a book for literally any mood.',          social_label: '', social_href: '' },
      ],
    },
    schema: [
      { key: 'eyebrow',         label: 'Eyebrow',               type: 'text' },
      { key: 'title',           label: 'Title',                 type: 'text' },
      { key: 'subtitle',        label: 'Subtitle',              type: 'textarea' },
      { key: 'min_card_width',  label: 'Min card width (px)',   type: 'number', min: 160, max: 400 },
    ],
  },

  announcement_bar: {
    label: 'Announcement bar',
    category: 'Content',
    Renderer: AnnouncementBar,
    defaultProps: {
      icon: '🎉',
      text: 'Free local delivery this weekend on orders over ₹500.',
      cta_text: 'Shop now',
      cta_href: '/books',
      background_color: '',
      text_color: '',
    },
    schema: [
      { key: 'icon',             label: 'Icon (emoji)', type: 'text' },
      { key: 'text',             label: 'Message',      type: 'text' },
      { key: 'cta_text',         label: 'Link text',    type: 'text' },
      { key: 'cta_href',         label: 'Link URL',     type: 'text' },
      { key: 'background_color', label: 'Background',   type: 'color' },
      { key: 'text_color',       label: 'Text color',   type: 'color' },
    ],
  },

  pricing_compare: {
    label: 'Pricing comparison',
    category: 'Content',
    Renderer: PricingCompare,
    defaultProps: {
      eyebrow: 'Membership plans',
      title: 'Pick the plan that fits',
      plans: [
        { name: 'Bronze', price: '₹300', period: '/mo', highlight: false, cta_text: 'Join Bronze', cta_href: '/offers' },
        { name: 'Silver', price: '₹500', period: '/mo', highlight: true,  cta_text: 'Join Silver', cta_href: '/offers' },
        { name: 'Gold',   price: '₹800', period: '/mo', highlight: false, cta_text: 'Join Gold',   cta_href: '/offers' },
      ],
      features: [
        { name: 'Books borrowed at a time', plan_0: '5',  plan_1: '10', plan_2: 'Unlimited' },
        { name: 'Borrowing period',          plan_0: '30 days', plan_1: '45 days', plan_2: '60 days' },
        { name: 'Priority reservations',     plan_0: false, plan_1: true, plan_2: true },
        { name: 'Early access to new arrivals', plan_0: false, plan_1: true, plan_2: true },
        { name: 'Free home delivery',        plan_0: false, plan_1: false, plan_2: true },
      ],
    },
    schema: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title',   label: 'Title',   type: 'text' },
    ],
  },

  review_wall: {
    label: 'Review wall',
    category: 'Dynamic',
    Renderer: ReviewWall,
    defaultProps: {
      eyebrow: '',
      title: 'Reader reviews',
      book_id: '',
      limit: 12,
      min_card_width: 260,
      cta_text: '✍ Leave a review',
      allow_submissions: true,
      auto_publish: true,
    },
    schema: [
      { key: 'eyebrow',           label: 'Eyebrow',             type: 'text' },
      { key: 'title',             label: 'Title',               type: 'text' },
      { key: 'book_id',           label: 'Filter by book id',   type: 'text', hint: 'Optional. Leave blank for site-wide reviews.' },
      { key: 'limit',             label: 'Show count',          type: 'number', min: 1, max: 60 },
      { key: 'min_card_width',    label: 'Min card width (px)', type: 'number', min: 160, max: 400 },
      { key: 'cta_text',          label: 'CTA button text',     type: 'text' },
      { key: 'allow_submissions', label: 'Allow submissions',   type: 'toggle' },
      { key: 'auto_publish',      label: 'Auto-publish (off = moderate first)', type: 'toggle' },
    ],
  },

  event_rsvp: {
    label: 'Event RSVP',
    category: 'Dynamic',
    Renderer: EventRSVP,
    defaultProps: {
      eyebrow: 'Reserve your spot',
      event_id: '',
      button_text: 'Reserve my spot',
      success_message: 'You\'re in. See you there!',
    },
    schema: [
      { key: 'eyebrow',         label: 'Eyebrow',         type: 'text' },
      { key: 'event_id',        label: 'Event id',        type: 'text', hint: 'Optional. Leave blank to auto-pick the next upcoming event.' },
      { key: 'button_text',     label: 'Button text',     type: 'text' },
      { key: 'success_message', label: 'Success message', type: 'text' },
    ],
  },

  testimonial_carousel: {
    label: 'Testimonial carousel',
    category: 'Content',
    Renderer: TestimonialCarousel,
    defaultProps: {
      eyebrow: 'What readers are saying',
      autoplay_seconds: 6,
      background_color: '',
      items: [
        { quote: 'Tapas has the best curated selection I\'ve found in years. The coffee is a bonus.', name: 'Kritika N.', role: 'Silver member', photo: '' },
        { quote: 'My kid now asks to go to "the book place" every weekend. Thank you, Tapas.',       name: 'Ravi M.',   role: 'Gold member',   photo: '' },
        { quote: 'A peaceful corner of the city. I get more reading done here than at home.',            name: 'Ananya K.', role: 'Bronze member', photo: '' },
      ],
    },
    schema: [
      { key: 'eyebrow',          label: 'Eyebrow',             type: 'text' },
      { key: 'autoplay_seconds', label: 'Autoplay seconds (0 = off)', type: 'number', min: 0, max: 60 },
      { key: 'background_color', label: 'Background',          type: 'color' },
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

  // ---- Tapas home page Figma blocks ----------------------------------
  // These make every section of the Figma home page editable via the
  // dashboard. Each one renders one slab of the page.

  tapas_hero: {
    label: 'Tapas Hero (lime wave)',
    category: 'Content',
    Renderer: TapasHero,
    defaultProps: {
      headline_line1: 'Discover Our',
      headline_line2: 'New Collection',
      description: 'Curated reads from our shelves — fresh fiction, deep non-fiction, and the year\'s most-talked-about titles, all under one roof.',
      cta_text: 'Join now!',
      cta_href: '/books',
      image_url: 'HERO-LIBRARY.png',
    },
    schema: [
      { key: 'headline_line1', label: 'Headline — line 1', type: 'text' },
      { key: 'headline_line2', label: 'Headline — line 2', type: 'text' },
      { key: 'description',    label: 'Description',       type: 'textarea' },
      { key: 'cta_text',       label: 'Button text',       type: 'text' },
      { key: 'cta_href',       label: 'Button link',       type: 'text' },
      { key: 'image_url',      label: 'Photo',             type: 'image' },
    ],
  },

  tapas_services: {
    label: 'Tapas Services (3 cards)',
    category: 'Content',
    Renderer: TapasServices,
    defaultProps: {
      eyebrow: 'Our Services',
      heading: 'We provide great services for our customers based on',
      items: [
        { icon: '📚', title: 'Buying Books',  body: 'Browse our curated catalogue and take new titles home — from indie debuts to global bestsellers.', cta_text: 'Learn more', cta_href: '/books' },
        { icon: '🪪', title: 'Lending Books', body: 'Become a member and borrow up to four books at a time. Renewals are free, late fees are gentle.',   cta_text: 'Learn more', cta_href: '/profile' },
        { icon: '🎤', title: 'Events',         body: 'Author readings, book clubs, and quiet study evenings — there is always something on the calendar.', cta_text: 'Learn more', cta_href: '/blog' },
      ],
    },
    schema: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'text' },
      {
        key: 'items', label: 'Service cards', type: 'array',
        itemDefaults: { icon: '✨', title: '', body: '', cta_text: 'Learn more', cta_href: '/' },
        itemFields: [
          { key: 'icon',     label: 'Icon (emoji)', type: 'text' },
          { key: 'title',    label: 'Title',        type: 'text' },
          { key: 'body',     label: 'Description',  type: 'textarea' },
          { key: 'cta_text', label: 'Link text',    type: 'text' },
          { key: 'cta_href', label: 'Link URL',     type: 'text' },
        ],
      },
    ],
  },

  tapas_new_arrivals: {
    label: 'Tapas New Arrivals (4 products)',
    category: 'Content',
    Renderer: TapasNewArrivals,
    defaultProps: {
      eyebrow: 'New Arrivals',
      items: [
        { title: 'Syltherine', sub: 'Stylish café chair', price: 'Rp 2.500.000', strike: 'Rp 3.500.000', badge: '-30%', image_url: 'arrival-1.jpg' },
        { title: 'Leviosa',    sub: 'Stylish café chair', price: 'Rp 2.500.000', strike: '',              badge: '',     image_url: 'arrival-2.jpg' },
        { title: 'Lolito',     sub: 'Luxury big sofa',    price: 'Rp 7.000.000', strike: 'Rp 14.000.000', badge: '-50%', image_url: 'arrival-3.jpg' },
        { title: 'Respira',    sub: 'Outdoor bar table',  price: 'Rp 500.000',   strike: '',              badge: 'New',  image_url: 'arrival-4.jpg' },
      ],
    },
    schema: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      {
        key: 'items', label: 'Products', type: 'array',
        itemDefaults: { title: '', sub: '', price: '', strike: '', badge: '', image_url: '' },
        itemFields: [
          { key: 'title',     label: 'Title',          type: 'text' },
          { key: 'sub',       label: 'Subtitle',       type: 'text' },
          { key: 'price',     label: 'Price',          type: 'text' },
          { key: 'strike',    label: 'Strike price',   type: 'text', hint: 'Optional. Shown struck through.' },
          { key: 'badge',     label: 'Badge',          type: 'text', hint: 'e.g. -30%, New. Leave blank for none.' },
          { key: 'image_url', label: 'Image',          type: 'image' },
        ],
      },
    ],
  },

  tapas_inspiration: {
    label: 'Tapas Inspiration (split)',
    category: 'Content',
    Renderer: TapasInspiration,
    defaultProps: {
      heading_line1: '50+ Beautiful rooms',
      heading_line2: 'inspiration',
      description: 'Our designers have already arranged a lot of beautiful prototypes of reading nooks that inspire us.',
      cta_text: 'Explore More',
      cta_href: '/blog',
      image_1_url: 'room-1.jpg',
      image_2_url: 'room-2.jpg',
      badge_eyebrow: '01 — Bed Room',
      badge_title: 'Inner Peace',
      background_color: '#FBF8EE',
    },
    schema: [
      { key: 'heading_line1',    label: 'Heading — line 1',  type: 'text' },
      { key: 'heading_line2',    label: 'Heading — line 2',  type: 'text' },
      { key: 'description',      label: 'Description',       type: 'textarea' },
      { key: 'cta_text',         label: 'Button text',       type: 'text' },
      { key: 'cta_href',         label: 'Button link',       type: 'text' },
      { key: 'image_1_url',      label: 'Large image',       type: 'image' },
      { key: 'image_2_url',      label: 'Side image',        type: 'image' },
      { key: 'badge_eyebrow',    label: 'Badge eyebrow',     type: 'text' },
      { key: 'badge_title',      label: 'Badge title',       type: 'text' },
      { key: 'background_color', label: 'Background color',  type: 'color' },
    ],
  },

  tapas_testimonials: {
    label: 'Tapas Testimonials',
    category: 'Content',
    Renderer: TapasTestimonials,
    defaultProps: {
      background_color: '#CFF389',
      items: [
        { quote: 'You made it so simple.', body: 'My new shelf is so much faster and easier to browse than my old library app.', author: 'Corey Valdez', role: 'Founder at Zenix' },
        { quote: 'Simply the best.',        body: "Better than all the rest. I'd recommend this place to beginners.", author: 'Ian Klein', role: 'Digital Marketer' },
      ],
    },
    schema: [
      { key: 'background_color', label: 'Background color', type: 'color' },
      {
        key: 'items', label: 'Testimonials', type: 'array',
        itemDefaults: { quote: '', body: '', author: '', role: '' },
        itemFields: [
          { key: 'quote',  label: 'Quote',  type: 'text' },
          { key: 'body',   label: 'Body',   type: 'textarea' },
          { key: 'author', label: 'Author', type: 'text' },
          { key: 'role',   label: 'Role',   type: 'text' },
        ],
      },
    ],
  },

  tapas_section: {
    label: 'Tapas Section (heading + subtext)',
    category: 'Content',
    Renderer: TapasSection,
    defaultProps: {
      eyebrow: '',
      heading: 'Section heading',
      subtext: '',
      text_color: '#1F2937',
      background_color: '#FBF8EE',
      padding_y: 80,
      max_width: 960,
      align: 'center',
    },
    schema: [
      { key: 'eyebrow',          label: 'Eyebrow',          type: 'text' },
      { key: 'heading',          label: 'Heading',          type: 'text' },
      { key: 'subtext',          label: 'Subtext',          type: 'textarea' },
      { key: 'align',            label: 'Alignment',        type: 'select', options: [
        { value: 'left',   label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right',  label: 'Right' },
      ]},
      { key: 'text_color',       label: 'Text color',       type: 'color' },
      { key: 'background_color', label: 'Background color', type: 'color' },
      { key: 'padding_y',        label: 'Vertical padding (px)', type: 'number', min: 0, max: 200 },
      { key: 'max_width',        label: 'Content max width (px)', type: 'number', min: 320, max: 1600 },
    ],
  },

  tapas_newsletter: {
    label: 'Tapas Newsletter (dark strip)',
    category: 'Content',
    Renderer: TapasNewsletter,
    defaultProps: {
      headline: '✉ Subscribe to our Newsletter',
      subtext: 'Monthly book picks, member events, and quiet announcements.',
      placeholder: 'Your email address',
      button_text: 'Subscribe',
      background_color: '#1F1F1F',
    },
    schema: [
      { key: 'headline',         label: 'Headline',          type: 'text' },
      { key: 'subtext',          label: 'Subtext',           type: 'text' },
      { key: 'placeholder',      label: 'Input placeholder', type: 'text' },
      { key: 'button_text',      label: 'Button text',       type: 'text' },
      { key: 'background_color', label: 'Background color',  type: 'color' },
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
