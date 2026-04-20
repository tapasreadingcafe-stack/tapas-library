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
      cta_secondary_text: '',
      cta_secondary_href: '/',
      stats: [
        { value: '500+', label: 'Books' },
        { value: '200',  label: 'Members' },
        { value: '4.8★', label: 'Rating' },
      ],
      chips: [],
    },
    presets: [
      {
        id: 'centered',
        label: 'Centered',
        hint: 'Big headline, centered text, single CTA.',
        defaultProps: { preset: 'centered', align: 'center' },
      },
      {
        id: 'split',
        label: 'Split image',
        hint: 'Text on the left, image on the right.',
        defaultProps: { preset: 'split', align: 'left', image_url: '' },
      },
      {
        id: 'gradient',
        label: 'Gradient',
        hint: 'Bold gradient background with eyebrow + headline.',
        defaultProps: { preset: 'gradient', align: 'center', background_image: '' },
      },
      {
        id: 'video_bg',
        label: 'Video / image bg',
        hint: 'Full-bleed background image with dark overlay.',
        defaultProps: { preset: 'video_bg', align: 'center', overlay_opacity: 0.55 },
      },
      {
        id: 'minimal',
        label: 'Minimal',
        hint: 'Lots of whitespace. Headline + small CTA, no description.',
        defaultProps: { preset: 'minimal', align: 'center', subheadline: '', description: '' },
      },
      {
        id: 'side_image',
        label: 'Image left',
        hint: 'Mirror of Split — image on the left, text on the right.',
        defaultProps: { preset: 'side_image', align: 'left' },
      },
      {
        id: 'dual_cta',
        label: 'Two buttons',
        hint: 'Primary + secondary CTA side by side.',
        defaultProps: { preset: 'dual_cta', align: 'center', cta_secondary_text: 'Learn more' },
      },
      {
        id: 'stat_strip',
        label: 'With stats',
        hint: 'Headline + CTA + a row of three big metric numbers.',
        defaultProps: { preset: 'stat_strip', align: 'center' },
      },
      {
        id: 'announcement',
        label: 'Announcement',
        hint: 'Compact banner-style hero with an inline arrow CTA.',
        defaultProps: { preset: 'announcement', align: 'center' },
      },
      {
        id: 'with_chips',
        label: 'With chips',
        hint: 'Pills/tags row above the headline.',
        defaultProps: {
          preset: 'with_chips', align: 'center',
          chips: [{ label: 'New' }, { label: 'Free shipping' }, { label: 'Limited' }],
        },
      },
    ],
    schema: [
      { key: 'eyebrow',          label: 'Eyebrow',      type: 'text' },
      { key: 'headline',         label: 'Headline',     type: 'text' },
      { key: 'subheadline',      label: 'Subheadline',  type: 'text', hint: 'Optional italic line under the headline.', hideFor: ['minimal', 'announcement'] },
      { key: 'description',      label: 'Description',  type: 'textarea', hideFor: ['minimal', 'announcement'] },
      { key: 'cta_text',         label: 'Button text',  type: 'text' },
      { key: 'cta_href',         label: 'Button link',  type: 'text' },
      { key: 'cta_secondary_text', label: 'Secondary button text', type: 'text', usedBy: ['dual_cta'] },
      { key: 'cta_secondary_href', label: 'Secondary button link', type: 'text', usedBy: ['dual_cta'] },
      { key: 'align',            label: 'Alignment',    type: 'select', options: [
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' },
      ], usedBy: ['centered'] },
      { key: 'background_image', label: 'Background image', type: 'image', usedBy: ['centered', 'video_bg'] },
      { key: 'overlay_opacity',  label: 'Image overlay',    type: 'number', min: 0, max: 1, usedBy: ['centered', 'video_bg'] },
      { key: 'image_url',        label: 'Image',            type: 'image', usedBy: ['split', 'side_image'] },
      {
        key: 'stats', label: 'Stats', type: 'array',
        itemDefaults: { value: '0', label: 'Metric' },
        itemFields: [
          { key: 'value', label: 'Value', type: 'text' },
          { key: 'label', label: 'Label', type: 'text' },
        ],
        usedBy: ['stat_strip'],
      },
      {
        key: 'chips', label: 'Chips', type: 'array',
        itemDefaults: { label: 'New' },
        itemFields: [
          { key: 'label', label: 'Label', type: 'text' },
        ],
        usedBy: ['with_chips'],
      },
    ],
  },

  navbar: {
    label: 'Navbar',
    category: 'Content',
    icon: '☰',
    defaultProps: {
      preset: 'classic',
      brand_name: 'Your brand',
      tagline: '',
      links: [
        { label: 'Home',    href: '/' },
        { label: 'About',   href: '/about' },
        { label: 'Pricing', href: '/offers' },
        { label: 'Contact', href: '/about' },
      ],
      cta_text: 'Sign up',
      cta_href: '/',
      cta_secondary_text: '',
      cta_secondary_href: '/',
      background_color: '',
      text_color: '',
      announcement_text: '',
    },
    presets: [
      { id: 'classic',     label: 'Classic',         hint: 'Brand left · links center · CTA right.', defaultProps: { preset: 'classic' } },
      { id: 'centered',    label: 'Centered',        hint: 'Brand stacked above link row.',          defaultProps: { preset: 'centered' } },
      { id: 'minimal',     label: 'Minimal',         hint: 'Just brand and a single CTA.',          defaultProps: { preset: 'minimal' } },
      { id: 'split',       label: 'Split',           hint: 'Nav left · brand center · CTA right.',  defaultProps: { preset: 'split' } },
      { id: 'pill',        label: 'Pill nav',        hint: 'Links wrapped in a rounded pill.',      defaultProps: { preset: 'pill' } },
      { id: 'transparent', label: 'Transparent',     hint: 'No background — overlays the section above.', defaultProps: { preset: 'transparent' } },
      { id: 'accent_bar',  label: 'Accent bar',      hint: 'Bold accent border on the left edge.',  defaultProps: { preset: 'accent_bar' } },
      { id: 'announcement',label: 'With announcement',hint: 'Thin accent bar above the navbar.',     defaultProps: { preset: 'announcement', announcement_text: '🎉 Free shipping on orders over ₹500.' } },
      { id: 'double_cta',  label: 'Two CTAs',        hint: 'Primary + secondary button on the right.', defaultProps: { preset: 'double_cta', cta_secondary_text: 'Log in' } },
      { id: 'tagline',     label: 'Brand + tagline', hint: 'Brand with a small tagline beneath.',   defaultProps: { preset: 'tagline', tagline: 'A short brand line.' } },
    ],
    schema: [
      { key: 'brand_name',       label: 'Brand name',   type: 'text' },
      { key: 'tagline',          label: 'Tagline',      type: 'text', usedBy: ['tagline'] },
      { key: 'cta_text',         label: 'Button text',  type: 'text' },
      { key: 'cta_href',         label: 'Button link',  type: 'text' },
      { key: 'cta_secondary_text', label: 'Secondary button text', type: 'text', usedBy: ['double_cta'] },
      { key: 'cta_secondary_href', label: 'Secondary button link', type: 'text', usedBy: ['double_cta'] },
      { key: 'announcement_text', label: 'Announcement bar text', type: 'text', usedBy: ['announcement'] },
      { key: 'background_color', label: 'Background',   type: 'color', hideFor: ['transparent'] },
      { key: 'text_color',       label: 'Text color',   type: 'color' },
      {
        key: 'links', label: 'Nav links', type: 'array',
        itemDefaults: { label: 'New link', href: '/' },
        itemFields: [
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'href',  label: 'URL',   type: 'text' },
        ],
        hideFor: ['minimal'],
      },
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
      preset: 'columns',
      brand_name: 'Your brand',
      columns: [
        { title: 'Shop',  links: [{ label: 'All books', href: '/books' }, { label: 'Offers', href: '/offers' }] },
        { title: 'About', links: [{ label: 'Our story', href: '/about' }, { label: 'Contact', href: '/contact' }] },
        { title: 'Visit', links: [{ label: 'Events',    href: '/events' }, { label: 'Blog',    href: '/blog' }] },
      ],
      copyright: `© ${new Date().getFullYear()} Tapas Reading Cafe`,
      background_color: '',
      tagline: '',
      newsletter_headline: 'Stay in the loop',
      newsletter_placeholder: 'you@email.com',
      newsletter_button: 'Subscribe',
      socials: [
        { label: 'Instagram', href: 'https://instagram.com' },
        { label: 'Twitter',   href: 'https://twitter.com' },
      ],
    },
    presets: [
      { id: 'columns',       label: 'Columns',        hint: 'Multi-column links with copyright row.', defaultProps: { preset: 'columns' } },
      { id: 'minimal',       label: 'Minimal',        hint: 'Single centered copyright line.',         defaultProps: { preset: 'minimal' } },
      { id: 'tagline_split', label: 'Tagline + links',hint: 'Brand tagline left, link columns right.', defaultProps: { preset: 'tagline_split', tagline: 'A short brand line.' } },
      { id: 'centered',      label: 'Centered brand', hint: 'Brand + nav links + copyright, all centered.', defaultProps: { preset: 'centered' } },
      { id: 'newsletter',    label: 'Newsletter',     hint: 'Email signup form on the left, links on the right.', defaultProps: { preset: 'newsletter' } },
      { id: 'social_strip',  label: 'Social strip',   hint: 'Social links on the right, copyright on the left.', defaultProps: { preset: 'social_strip' } },
      { id: 'mega',          label: 'Mega footer',    hint: 'Big brand block + 4 link columns.',       defaultProps: { preset: 'mega', tagline: 'A short brand line.' } },
      { id: 'dark_band',     label: 'Dark band',      hint: 'Wide dark band with accent border on top.', defaultProps: { preset: 'dark_band' } },
      { id: 'logo_only',     label: 'Logo only',      hint: 'Just the brand mark above a copyright line.', defaultProps: { preset: 'logo_only' } },
      { id: 'tagline_below', label: 'Tagline below',  hint: 'Columns row, then brand + tagline below.', defaultProps: { preset: 'tagline_below', tagline: 'A short brand line.' } },
    ],
    schema: [
      { key: 'brand_name', label: 'Brand name', type: 'text', usedBy: ['centered', 'mega', 'logo_only', 'tagline_below'] },
      { key: 'copyright',  label: 'Copyright text', type: 'text' },
      { key: 'tagline',    label: 'Tagline',        type: 'text', usedBy: ['tagline_split', 'mega', 'tagline_below'] },
      { key: 'background_color', label: 'Background', type: 'color', hideFor: ['dark_band'] },
      { key: 'newsletter_headline', label: 'Newsletter headline', type: 'text', usedBy: ['newsletter'] },
      { key: 'newsletter_placeholder', label: 'Newsletter placeholder', type: 'text', usedBy: ['newsletter'] },
      { key: 'newsletter_button', label: 'Newsletter button', type: 'text', usedBy: ['newsletter'] },
      {
        key: 'socials', label: 'Social links', type: 'array',
        itemDefaults: { label: 'Instagram', href: 'https://instagram.com' },
        itemFields: [
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'href',  label: 'URL',   type: 'text' },
        ],
        usedBy: ['social_strip'],
      },
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
      success_message: 'You\'re on the list. Thanks!',
    },
    schema: [
      { key: 'headline',        label: 'Headline',        type: 'text' },
      { key: 'description',     label: 'Description',     type: 'textarea' },
      { key: 'placeholder',     label: 'Placeholder',     type: 'text' },
      { key: 'button_text',     label: 'Button text',     type: 'text' },
      { key: 'success_message', label: 'Success message', type: 'text' },
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

  review_wall: {
    label: 'Review wall',
    category: 'Dynamic',
    icon: '★',
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
    icon: '🎟',
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

  // ---- Tapas home page Figma blocks ----------------------------------
  tapas_hero: {
    label: 'Tapas Hero (lime wave)',
    category: 'Content',
    icon: '🌊',
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
    icon: '✦',
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
    icon: '⚝',
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
    icon: '⌇',
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
    icon: '❝',
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

  tapas_group: {
    label: 'Tapas Group (container with children)',
    category: 'Content',
    icon: '◫',
    defaultProps: {
      children: [],
      background_color: 'transparent',
      padding_y: 0,
      padding_x: 0,
      max_width: 0,
      align: 'stretch',
      direction: 'column',
      gap: 0,
    },
    schema: [
      { key: 'background_color', label: 'Background color',        type: 'color' },
      { key: 'padding_y',        label: 'Vertical padding (px)',   type: 'number', min: 0, max: 200 },
      { key: 'padding_x',        label: 'Horizontal padding (px)', type: 'number', min: 0, max: 200 },
      { key: 'max_width',        label: 'Max width (px, 0 = no limit)', type: 'number', min: 0, max: 1600 },
      { key: 'direction',        label: 'Direction',           type: 'select', options: [
        { value: 'column', label: 'Column (stack)' },
        { value: 'row',    label: 'Row (inline)'  },
      ]},
      { key: 'align',            label: 'Align children',      type: 'select', options: [
        { value: 'stretch', label: 'Stretch' },
        { value: 'start',   label: 'Start' },
        { value: 'center',  label: 'Center' },
        { value: 'end',     label: 'End' },
      ]},
      { key: 'gap',              label: 'Gap between children (px)', type: 'number', min: 0, max: 120 },
    ],
  },

  tapas_section: {
    label: 'Tapas Section (heading + subtext)',
    category: 'Content',
    icon: '▱',
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
    icon: '✉',
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

// Groupings for the Add-section picker.
export const BLOCK_CATEGORIES = ['Content', 'Media', 'Dynamic'];

// Fresh block factory. Mirrors makeBlock() in tapas-store/src/blocks/index.js.
// When `presetId` is provided, the preset's defaultProps are merged on
// top of the block type's defaultProps so the new block opens with the
// preset's specific styling.
let _blockIdCounter = 0;
export function makeBlock(type, presetId) {
  const entry = BLOCK_REGISTRY_META[type];
  if (!entry) throw new Error(`Unknown block type: ${type}`);
  const id = `b_${Date.now().toString(36)}_${(_blockIdCounter++).toString(36)}`;
  const baseProps = JSON.parse(JSON.stringify(entry.defaultProps || {}));
  if (presetId && Array.isArray(entry.presets)) {
    const preset = entry.presets.find(p => p.id === presetId);
    if (preset && preset.defaultProps) {
      Object.assign(baseProps, JSON.parse(JSON.stringify(preset.defaultProps)));
    }
  }
  return { id, type, props: baseProps };
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
