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
      {
        key: 'items', label: 'Feature items', type: 'array',
        itemDefaults: { icon: '✨', title: '', description: '' },
        itemFields: [
          { key: 'icon',        label: 'Icon',        type: 'text', hint: 'Emoji or short symbol' },
          { key: 'title',       label: 'Title',       type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
      },
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
      {
        key: 'items', label: 'Testimonials', type: 'array',
        itemDefaults: { quote: '', author: '', role: '' },
        itemFields: [
          { key: 'quote',  label: 'Quote',  type: 'textarea' },
          { key: 'author', label: 'Author', type: 'text' },
          { key: 'role',   label: 'Role',   type: 'text' },
        ],
      },
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
        { name: 'Reader',   price: '₹499',  interval: 'month', features: '2 books at a time\nCafe discount', cta_text: 'Join', cta_href: '/membership' },
        { name: 'Explorer', price: '₹899',  interval: 'month', features: '4 books at a time\n10% cafe discount\nEvent priority', cta_text: 'Join', cta_href: '/membership', highlight: true },
        { name: 'Family',   price: '₹1299', interval: 'month', features: 'Up to 4 members\n6 books at a time\n15% cafe discount', cta_text: 'Join', cta_href: '/membership' },
      ],
    },
    schema: [
      { key: 'title',    label: 'Title',    type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      {
        key: 'tiers', label: 'Pricing tiers', type: 'array',
        itemDefaults: { name: '', price: '', interval: 'month', features: '', cta_text: 'Join', cta_href: '/', highlight: false },
        itemFields: [
          { key: 'name',      label: 'Name',     type: 'text' },
          { key: 'price',     label: 'Price',    type: 'text' },
          { key: 'interval',  label: 'Interval', type: 'text', hint: 'e.g. month, year' },
          { key: 'features',  label: 'Features', type: 'textarea', hint: 'One feature per line' },
          { key: 'cta_text',  label: 'Button',   type: 'text' },
          { key: 'cta_href',  label: 'Link',     type: 'text' },
          { key: 'highlight', label: 'Highlight plan', type: 'toggle' },
        ],
      },
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
    schema: [
      { key: 'title', label: 'Title', type: 'text' },
      {
        key: 'items', label: 'Questions', type: 'array',
        itemDefaults: { question: '', answer: '' },
        itemFields: [
          { key: 'question', label: 'Question', type: 'text' },
          { key: 'answer',   label: 'Answer',   type: 'textarea' },
        ],
      },
    ],
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
      button_text: 'Send message',
      success_message: 'Thanks! We\'ll be in touch soon.',
      fields: [],
    },
    schema: [
      { key: 'title',               label: 'Title',              type: 'text' },
      { key: 'subtitle',            label: 'Subtitle',           type: 'text' },
      { key: 'button_text',         label: 'Button text',        type: 'text' },
      { key: 'success_message',     label: 'Success message',    type: 'text' },
      {
        key: 'fields', label: 'Form fields', type: 'array',
        hint: 'Leave empty to use the default Name / Email / Message trio. Add rows to build a fully custom form.',
        itemDefaults: { key: '', label: 'New field', type: 'text', required: false, placeholder: '' },
        itemFields: [
          { key: 'label',       label: 'Label',              type: 'text' },
          { key: 'key',         label: 'Storage key',        type: 'text', hint: 'Optional. Auto-derived from label if blank. Use "name" / "email" / "message" to also populate the inbox summary columns.' },
          {
            key: 'type', label: 'Field type', type: 'select',
            options: [
              { value: 'text',     label: 'Text (single-line)' },
              { value: 'email',    label: 'Email' },
              { value: 'tel',      label: 'Phone' },
              { value: 'textarea', label: 'Textarea (multi-line)' },
              { value: 'select',   label: 'Dropdown' },
              { value: 'checkbox', label: 'Checkbox' },
            ],
          },
          { key: 'required',    label: 'Required',           type: 'toggle' },
          { key: 'placeholder', label: 'Placeholder',        type: 'text' },
        ],
      },
    ],
  },

  // ---- Phase 5: Accordion + Tabs -------------------------------------

  accordion: {
    label: 'Accordion',
    category: 'Content',
    icon: '☰',
    defaultProps: {
      eyebrow: '',
      title: 'Good to know',
      allow_multiple: true,
      open_first: true,
      items: [
        { title: 'Opening hours',      content: 'Mon–Fri · 9am to 9pm\nSat–Sun · 10am to 10pm' },
        { title: 'Membership',         content: 'Choose from monthly, quarterly, or annual plans.' },
        { title: 'How borrowing works', content: 'Members can borrow up to 2 books for 14 days.' },
      ],
    },
    schema: [
      { key: 'eyebrow',        label: 'Eyebrow',              type: 'text' },
      { key: 'title',          label: 'Title',                type: 'text' },
      { key: 'allow_multiple', label: 'Allow multiple open',  type: 'toggle' },
      { key: 'open_first',     label: 'Open first by default', type: 'toggle' },
      {
        key: 'items', label: 'Sections', type: 'array',
        itemDefaults: { title: 'New section', content: '' },
        itemFields: [
          { key: 'title',   label: 'Title',   type: 'text' },
          { key: 'content', label: 'Content', type: 'textarea' },
        ],
      },
    ],
  },

  tabs: {
    label: 'Tabs',
    category: 'Content',
    icon: '◰',
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
      {
        key: 'items', label: 'Tabs', type: 'array',
        itemDefaults: { label: 'New tab', content: '' },
        itemFields: [
          { key: 'label',   label: 'Label',   type: 'text' },
          { key: 'content', label: 'Content', type: 'textarea' },
        ],
      },
    ],
  },

  stats: {
    label: 'Stats / Metrics',
    category: 'Content',
    icon: '#',
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
      {
        key: 'items', label: 'Metrics', type: 'array',
        itemDefaults: { value: '0', label: 'Metric', caption: '' },
        itemFields: [
          { key: 'value',   label: 'Big number',  type: 'text' },
          { key: 'label',   label: 'Label',       type: 'text' },
          { key: 'caption', label: 'Caption',     type: 'text' },
        ],
      },
    ],
  },

  logo_row: {
    label: 'Logo row',
    category: 'Media',
    icon: '▦',
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
      {
        key: 'logos', label: 'Logos', type: 'array',
        itemDefaults: { src: '', alt: '', href: '' },
        itemFields: [
          { key: 'src',  label: 'Image',         type: 'image' },
          { key: 'alt',  label: 'Alt text',      type: 'text' },
          { key: 'href', label: 'Link (optional)', type: 'text' },
        ],
      },
    ],
  },

  // ---- Phase 6 ------------------------------------------------------

  team: {
    label: 'Team members',
    category: 'Content',
    icon: '👥',
    defaultProps: {
      eyebrow: 'Meet the team',
      title: 'The humans behind Tapas',
      subtitle: 'Book lovers, baristas, and storytellers.',
      min_card_width: 220,
      members: [
        { name: 'Jane Doe',  role: 'Founder',      photo: '', bio: 'Started Tapas after a lifetime of bookshop hopping.', social_label: '', social_href: '' },
        { name: 'Arjun Rao', role: 'Head Barista', photo: '', bio: 'Serves the best pour-over in Nagpur. Fight me.',       social_label: '', social_href: '' },
        { name: 'Priya Sen', role: 'Librarian',    photo: '', bio: 'Can recommend a book for literally any mood.',          social_label: '', social_href: '' },
      ],
    },
    schema: [
      { key: 'eyebrow',        label: 'Eyebrow',             type: 'text' },
      { key: 'title',          label: 'Title',               type: 'text' },
      { key: 'subtitle',       label: 'Subtitle',            type: 'textarea' },
      { key: 'min_card_width', label: 'Min card width (px)', type: 'number', min: 160, max: 400 },
      {
        key: 'members', label: 'Team members', type: 'array',
        itemDefaults: { name: 'New member', role: '', photo: '', bio: '', social_label: '', social_href: '' },
        itemFields: [
          { key: 'name',         label: 'Name',          type: 'text' },
          { key: 'role',         label: 'Role',          type: 'text' },
          { key: 'photo',        label: 'Photo',         type: 'image' },
          { key: 'bio',          label: 'Bio',           type: 'textarea' },
          { key: 'social_label', label: 'Link label',    type: 'text' },
          { key: 'social_href',  label: 'Link URL',      type: 'text' },
        ],
      },
    ],
  },

  announcement_bar: {
    label: 'Announcement bar',
    category: 'Content',
    icon: '📢',
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
    icon: '⌇',
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
      {
        key: 'plans', label: 'Plans (columns)', type: 'array',
        itemDefaults: { name: 'New plan', price: '', period: '', highlight: false, cta_text: '', cta_href: '' },
        itemFields: [
          { key: 'name',      label: 'Name',      type: 'text' },
          { key: 'price',     label: 'Price',     type: 'text' },
          { key: 'period',    label: 'Period',    type: 'text' },
          { key: 'highlight', label: 'Highlight', type: 'toggle' },
          { key: 'cta_text',  label: 'CTA text',  type: 'text' },
          { key: 'cta_href',  label: 'CTA link',  type: 'text' },
        ],
      },
      {
        key: 'features', label: 'Features (rows)', type: 'array',
        itemDefaults: { name: 'New feature', plan_0: '', plan_1: '', plan_2: '' },
        itemFields: [
          { key: 'name',   label: 'Feature',           type: 'text' },
          { key: 'plan_0', label: 'Plan 1 value',      type: 'text', hint: 'Text, or true/false for ✓/—' },
          { key: 'plan_1', label: 'Plan 2 value',      type: 'text' },
          { key: 'plan_2', label: 'Plan 3 value',      type: 'text' },
        ],
      },
    ],
  },

  testimonial_carousel: {
    label: 'Testimonial carousel',
    category: 'Content',
    icon: '❝',
    defaultProps: {
      eyebrow: 'What readers are saying',
      autoplay_seconds: 6,
      background_color: '',
      items: [
        { quote: 'Tapas has the best curated selection I\'ve found in years. The coffee is a bonus.', name: 'Kritika N.', role: 'Silver member', photo: '' },
        { quote: 'My kid now asks to go to "the book place" every weekend. Thank you, Tapas.',        name: 'Ravi M.',   role: 'Gold member',   photo: '' },
        { quote: 'A peaceful corner of the city. I get more reading done here than at home.',          name: 'Ananya K.', role: 'Bronze member', photo: '' },
      ],
    },
    schema: [
      { key: 'eyebrow',          label: 'Eyebrow',                    type: 'text' },
      { key: 'autoplay_seconds', label: 'Autoplay seconds (0 = off)', type: 'number', min: 0, max: 60 },
      { key: 'background_color', label: 'Background',                 type: 'color' },
      {
        key: 'items', label: 'Testimonials', type: 'array',
        itemDefaults: { quote: '', name: '', role: '', photo: '' },
        itemFields: [
          { key: 'quote', label: 'Quote', type: 'textarea' },
          { key: 'name',  label: 'Name',  type: 'text' },
          { key: 'role',  label: 'Role',  type: 'text' },
          { key: 'photo', label: 'Photo', type: 'image' },
        ],
      },
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
