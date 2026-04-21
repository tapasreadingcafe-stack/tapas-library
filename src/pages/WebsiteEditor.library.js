// =====================================================================
// Block library — Phase 7 (spec § 6).
//
// Each block factory returns a fresh Node subtree with unique ids. The
// library is grouped by category; the AddPanel renders groups as
// collapsible sections with searchable tiles.
//
// Shipping this session:
//   - Layout:  Section, Container, Div, Grid, Flex, Columns, Stack
//   - Basic:   Heading, Paragraph, Link, Text, Quote, List, Button,
//              Image, Divider, Line break
//
// Deferred to Phase 7b+: Forms (10), Advanced composites (Slider,
// Tabs, Dropdown, Lightbox, Navbar, Search), CMS collections,
// Ecommerce, rich-text, embed, video.
// =====================================================================

import { newNodeId } from './WebsiteEditor.mutations';

// Tiny helper so every factory stays declarative.
function n(tag, { classes = [], attributes = {}, textContent, children = [] } = {}) {
  const node = { id: newNodeId(), tag };
  if (classes.length) node.classes = classes;
  if (Object.keys(attributes).length) node.attributes = attributes;
  if (textContent !== undefined) node.textContent = textContent;
  if (children.length) node.children = children;
  else node.children = [];
  return node;
}

// ---------------------------------------------------------------------
// Factories — each returns a brand-new tree with fresh ids.
// ---------------------------------------------------------------------

// Layout
const Section = () => n('section', {
  classes: ['section'],
  children: [
    n('div', { classes: ['container'], children: [
      n('h2', { textContent: 'Section title' }),
      n('p',  { textContent: 'Section description goes here.' }),
    ]}),
  ],
});

const Container = () => n('div', {
  classes: ['container'],
  children: [n('div', { textContent: 'Container' })],
});

const DivBlock = () => n('div', { classes: ['div-block'] });

const GridBlock = () => n('div', {
  classes: ['grid'],
  children: [
    n('div', { classes: ['grid-cell'], textContent: 'Cell 1' }),
    n('div', { classes: ['grid-cell'], textContent: 'Cell 2' }),
    n('div', { classes: ['grid-cell'], textContent: 'Cell 3' }),
    n('div', { classes: ['grid-cell'], textContent: 'Cell 4' }),
  ],
});

const FlexBlock = () => n('div', {
  classes: ['flex'],
  children: [
    n('div', { classes: ['flex-cell'], textContent: 'Item 1' }),
    n('div', { classes: ['flex-cell'], textContent: 'Item 2' }),
    n('div', { classes: ['flex-cell'], textContent: 'Item 3' }),
  ],
});

const Columns = () => n('div', {
  classes: ['columns'],
  children: [
    n('div', { classes: ['column'], textContent: 'Column 1' }),
    n('div', { classes: ['column'], textContent: 'Column 2' }),
  ],
});

// CSS multi-column text flow (like a newspaper). Differs from the
// flex "Columns" block above — this one reflows long prose across
// column-count columns rather than placing two siblings side-by-side.
const ColumnsMulti = () => n('div', {
  classes: ['text-columns'],
  attributes: {
    style: 'column-count: 2; column-gap: 2rem;',
  },
  children: [
    n('p', {
      textContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vitae elit libero, a pharetra augue. Cras mattis consectetur purus sit amet fermentum. Etiam porta sem malesuada magna mollis euismod. Maecenas faucibus mollis interdum.',
    }),
  ],
});

const Stack = () => n('div', {
  classes: ['stack'],
  children: [
    n('div', { classes: ['stack-item'], textContent: 'Stacked 1' }),
    n('div', { classes: ['stack-item'], textContent: 'Stacked 2' }),
  ],
});

// Basic
const Heading = () => n('h2', { textContent: 'Heading' });
const Paragraph = () => n('p', { textContent: 'A new paragraph. Edit the copy in the canvas.' });
const TextLink = () => n('a', {
  classes: ['text-link'],
  attributes: { href: '#' },
  textContent: 'Text link',
});
const TextBlock = () => n('div', {
  classes: ['text-block'],
  textContent: 'Text block',
});
const Quote = () => n('blockquote', {
  classes: ['quote'],
  textContent: 'Every block, every page, every pixel.',
});
const List = () => n('ul', {
  classes: ['list'],
  children: [
    n('li', { textContent: 'First item' }),
    n('li', { textContent: 'Second item' }),
    n('li', { textContent: 'Third item' }),
  ],
});
const Button = () => n('a', {
  classes: ['button'],
  attributes: { href: '#' },
  textContent: 'Button',
});
const Image = () => n('img', {
  classes: ['image'],
  attributes: {
    src: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200',
    alt: 'Placeholder',
    loading: 'lazy',
  },
});
const Divider = () => n('div', {
  classes: ['divider'],
});
const LineBreak = () => n('br', {});

// ---------------------------------------------------------------------
// Forms group (Phase 7b)
// ---------------------------------------------------------------------
// We render form primitives as real HTML elements so the browser's
// built-in validation and labeling work out of the box. Submission
// plumbing (Supabase / webhook) is out of scope for this session —
// forms will render in the preview but a Submit won't POST anywhere
// until the storefront wires that up.
const FormBlock = () => n('form', {
  classes: ['form'],
  attributes: { method: 'POST' },
  children: [
    n('label', { classes: ['label'], textContent: 'Name' }),
    n('input', { classes: ['input'], attributes: { type: 'text', name: 'name', placeholder: 'Your name' } }),
    n('button', { classes: ['submit-btn'], attributes: { type: 'submit' }, textContent: 'Submit' }),
  ],
});
const Label = () => n('label', { classes: ['label'], textContent: 'Field label' });
const InputField = () => n('input', {
  classes: ['input'],
  attributes: { type: 'text', name: 'field', placeholder: 'Your answer' },
});
const Textarea = () => n('textarea', {
  classes: ['textarea'],
  attributes: { name: 'message', placeholder: 'Your message', rows: '4' },
});
const Checkbox = () => n('label', {
  classes: ['checkbox'],
  children: [
    n('input', { attributes: { type: 'checkbox', name: 'agree' } }),
    n('span', { textContent: ' I agree' }),
  ],
});
const Radio = () => n('label', {
  classes: ['radio'],
  children: [
    n('input', { attributes: { type: 'radio', name: 'choice', value: 'a' } }),
    n('span', { textContent: ' Option A' }),
  ],
});
const SelectBlock = () => n('select', {
  classes: ['select'],
  attributes: { name: 'choice' },
  children: [
    n('option', { attributes: { value: '' }, textContent: 'Choose…' }),
    n('option', { attributes: { value: 'a' }, textContent: 'Option A' }),
    n('option', { attributes: { value: 'b' }, textContent: 'Option B' }),
  ],
});
const FileUpload = () => n('input', {
  classes: ['file-upload'],
  attributes: { type: 'file', name: 'file' },
});
const SubmitButton = () => n('button', {
  classes: ['submit-btn'],
  attributes: { type: 'submit' },
  textContent: 'Submit',
});
// reCAPTCHA is a client-side widget — we render a placeholder <div>
// with the standard attributes. The storefront wire-up in Phase 11+
// will turn this into the actual challenge.
const Recaptcha = () => n('div', {
  classes: ['g-recaptcha'],
  attributes: { 'data-sitekey': '__YOUR_SITE_KEY__' },
  textContent: 'reCAPTCHA (placeholder)',
});

// ---------------------------------------------------------------------
// Advanced (light — Phase 7b ships only embed + search + navbar shell)
// ---------------------------------------------------------------------
// HTML embed: stored as a <div> with an `embed` class. Proper raw-HTML
// execution would need a sanitizer plus a trusted-html attribute on
// the Node renderer — both deliberately out of scope here.
const HtmlEmbed = () => n('div', {
  classes: ['embed'],
  textContent: '<!-- Paste HTML in the Settings tab -->',
});
const Search = () => n('form', {
  classes: ['search'],
  attributes: { role: 'search' },
  children: [
    n('input', {
      classes: ['search-input'],
      attributes: { type: 'search', name: 'q', placeholder: 'Search…' },
    }),
    n('button', {
      classes: ['search-btn'],
      attributes: { type: 'submit' },
      textContent: 'Go',
    }),
  ],
});

// Tabs — three <details> with a shared `name` attribute. Modern
// browsers treat those as an exclusive-open group (only one can be
// expanded at a time), which is exactly the tab semantic without
// needing a JS runtime or fragile CSS radio-button tricks. Each
// tab's <summary> is the label; everything else inside is the panel.
// The node id namespaces `name` so multiple Tabs blocks on the same
// page don't fight each other.
const Tabs = () => {
  const group = 'tg-' + Math.random().toString(36).slice(2, 7);
  return n('div', {
    classes: ['tabs'],
    children: [
      n('details', {
        classes: ['tab'],
        attributes: { name: group, open: 'open' },
        children: [
          n('summary', { classes: ['tab-label'], textContent: 'Tab 1' }),
          n('div', { classes: ['tab-body'], textContent: 'First tab content.' }),
        ],
      }),
      n('details', {
        classes: ['tab'],
        attributes: { name: group },
        children: [
          n('summary', { classes: ['tab-label'], textContent: 'Tab 2' }),
          n('div', { classes: ['tab-body'], textContent: 'Second tab content.' }),
        ],
      }),
      n('details', {
        classes: ['tab'],
        attributes: { name: group },
        children: [
          n('summary', { classes: ['tab-label'], textContent: 'Tab 3' }),
          n('div', { classes: ['tab-body'], textContent: 'Third tab content.' }),
        ],
      }),
    ],
  });
};

// Navbar — responsive header with brand, menu, and a hamburger that
// reveals the menu on narrow viewports. data-tapas-navbar marks the
// root so the shared runtime can find it; data-tapas-navbar-toggle
// marks the hamburger button; the toggle's click flips
// data-tapas-navbar-open on the root, which CSS uses to show the menu
// below the breakpoint. Desktop stays inline/unchanged.
const Navbar = () => n('nav', {
  classes: ['tapas-navbar'],
  attributes: { 'data-tapas-navbar': '' },
  children: [
    n('div', {
      classes: ['tapas-navbar-brand'],
      textContent: 'Brand',
    }),
    n('button', {
      classes: ['tapas-navbar-toggle'],
      attributes: {
        type: 'button',
        'data-tapas-navbar-toggle': '',
        'aria-label': 'Toggle menu',
      },
      textContent: '☰',
    }),
    n('ul', {
      classes: ['tapas-navbar-menu'],
      children: [
        n('li', { children: [n('a', { classes: ['tapas-navbar-link'], attributes: { href: '/' }, textContent: 'Home' })] }),
        n('li', { children: [n('a', { classes: ['tapas-navbar-link'], attributes: { href: '/about' }, textContent: 'About' })] }),
        n('li', { children: [n('a', { classes: ['tapas-navbar-link'], attributes: { href: '/shop' }, textContent: 'Shop' })] }),
        n('li', { children: [n('a', { classes: ['tapas-navbar-link'], attributes: { href: '/contact' }, textContent: 'Contact' })] }),
      ],
    }),
  ],
});

// Slider — Phase F composite. The <slider> custom tag flags the node
// to both renderers: editor stacks slides vertically for in-place
// editing; storefront upgrades to a swipeable carousel with arrows,
// dots, and autoplay. Attributes drive the runtime (autoplay, interval,
// loop, show_arrows, show_dots, transition).
const Slider = () => n('slider', {
  classes: ['tapas-slider'],
  attributes: {
    'data-tapas-slider': '',
    autoplay: 'true',
    interval: '4500',
    loop: 'true',
    show_arrows: 'true',
    show_dots: 'true',
    transition: 'slide',
  },
  children: [
    n('slide', {
      classes: ['tapas-slide'],
      children: [
        n('h2', { classes: ['tapas-slide-title'], textContent: 'Slide one' }),
        n('p',  { classes: ['tapas-slide-body'],  textContent: 'Edit this slide or drag to reorder.' }),
      ],
    }),
    n('slide', {
      classes: ['tapas-slide'],
      children: [
        n('h2', { classes: ['tapas-slide-title'], textContent: 'Slide two' }),
        n('p',  { classes: ['tapas-slide-body'],  textContent: 'Click a slide to edit its contents.' }),
      ],
    }),
    n('slide', {
      classes: ['tapas-slide'],
      children: [
        n('h2', { classes: ['tapas-slide-title'], textContent: 'Slide three' }),
        n('p',  { classes: ['tapas-slide-body'],  textContent: 'Add more slides via the Navigator.' }),
      ],
    }),
  ],
});

// Empty slide, used when staff clicks "+ Slide" inside an existing
// slider. Separate factory so the Add panel can offer it as its own
// tile for when drag-into-slider is awkward.
const Slide = () => n('slide', {
  classes: ['tapas-slide'],
  children: [
    n('h2', { classes: ['tapas-slide-title'], textContent: 'New slide' }),
    n('p',  { classes: ['tapas-slide-body'],  textContent: 'Replace me.' }),
  ],
});

// Lightbox — wraps an image. Click on the storefront pops a full-size
// modal. In the editor it renders as a plain image with a ⛶ indicator
// (handled by the Node renderer). The `group` attribute ties related
// lightboxes together so prev/next paging walks the gallery.
const Lightbox = () => n('lightbox', {
  classes: ['tapas-lightbox'],
  attributes: {
    'data-tapas-lightbox': '',
    group: 'gallery-1',
  },
  children: [
    n('img', {
      classes: ['tapas-lightbox-img'],
      attributes: {
        src: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1200',
        alt: 'Lightbox photo',
        loading: 'lazy',
      },
    }),
  ],
});

// Accordion — same <details> primitive without the shared `name`, so
// any number of sections can be open at once. Dropdown / FAQ / spec
// sheet all fit this pattern.
const Accordion = () => n('div', {
  classes: ['accordion'],
  children: [
    n('details', {
      classes: ['accordion-item'],
      children: [
        n('summary', { classes: ['accordion-label'], textContent: 'Question one?' }),
        n('div', { classes: ['accordion-body'], textContent: 'Answer one.' }),
      ],
    }),
    n('details', {
      classes: ['accordion-item'],
      children: [
        n('summary', { classes: ['accordion-label'], textContent: 'Question two?' }),
        n('div', { classes: ['accordion-body'], textContent: 'Answer two.' }),
      ],
    }),
    n('details', {
      classes: ['accordion-item'],
      children: [
        n('summary', { classes: ['accordion-label'], textContent: 'Question three?' }),
        n('div', { classes: ['accordion-body'], textContent: 'Answer three.' }),
      ],
    }),
  ],
});

// ---------------------------------------------------------------------
// Catalogue — registered as a flat list so AddPanel.search can filter
// linearly without traversing nested groups.
// ---------------------------------------------------------------------
export const BLOCK_CATALOGUE = [
  // Layout
  { key: 'section',   group: 'Layout', label: 'Section',    glyph: '▭', keywords: 'section band stripe',     create: Section   },
  { key: 'container', group: 'Layout', label: 'Container',  glyph: '▥', keywords: 'container max-width',      create: Container },
  { key: 'div',       group: 'Layout', label: 'Div block',  glyph: '▢', keywords: 'div block group',          create: DivBlock  },
  { key: 'grid',      group: 'Layout', label: 'Grid',       glyph: '▦', keywords: 'grid layout',              create: GridBlock },
  { key: 'flex',      group: 'Layout', label: 'Flex',       glyph: '▨', keywords: 'flex flexbox',             create: FlexBlock },
  { key: 'columns',   group: 'Layout', label: 'Columns',    glyph: '‖', keywords: 'columns two-col split',    create: Columns   },
  { key: 'text-cols', group: 'Layout', label: 'Text columns',glyph: '▥', keywords: 'text columns newspaper multicolumn', create: ColumnsMulti },
  { key: 'stack',     group: 'Layout', label: 'Quick stack',glyph: '≡', keywords: 'stack vertical',           create: Stack     },

  // Basic
  { key: 'heading',   group: 'Basic',  label: 'Heading',    glyph: 'H', keywords: 'heading h1 h2 h3 title',   create: Heading   },
  { key: 'paragraph', group: 'Basic',  label: 'Paragraph',  glyph: 'P', keywords: 'paragraph body copy text', create: Paragraph },
  { key: 'link',      group: 'Basic',  label: 'Text link',  glyph: '↗', keywords: 'link anchor',              create: TextLink  },
  { key: 'text',      group: 'Basic',  label: 'Text block', glyph: 'T', keywords: 'text block rich',          create: TextBlock },
  { key: 'quote',     group: 'Basic',  label: 'Block quote',glyph: '❝', keywords: 'quote blockquote',         create: Quote     },
  { key: 'list',      group: 'Basic',  label: 'List',       glyph: '•', keywords: 'list bullet unordered',    create: List      },
  { key: 'button',    group: 'Basic',  label: 'Button',     glyph: '⬜', keywords: 'button cta',                create: Button    },
  { key: 'image',     group: 'Basic',  label: 'Image',      glyph: '▤', keywords: 'image photo img',          create: Image     },
  { key: 'divider',   group: 'Basic',  label: 'Divider',    glyph: '—', keywords: 'divider hr rule',          create: Divider   },
  { key: 'br',        group: 'Basic',  label: 'Line break', glyph: '↵', keywords: 'break br newline',         create: LineBreak },

  // Forms
  { key: 'form',      group: 'Forms',  label: 'Form block',     glyph: '▥', keywords: 'form contact submit',     create: FormBlock    },
  { key: 'label',     group: 'Forms',  label: 'Label',          glyph: 'L', keywords: 'label form field',        create: Label        },
  { key: 'input',     group: 'Forms',  label: 'Input',          glyph: '▭', keywords: 'input text field',        create: InputField   },
  { key: 'textarea',  group: 'Forms',  label: 'Textarea',       glyph: '▢', keywords: 'textarea message',        create: Textarea     },
  { key: 'checkbox',  group: 'Forms',  label: 'Checkbox',       glyph: '☐', keywords: 'checkbox toggle',         create: Checkbox     },
  { key: 'radio',     group: 'Forms',  label: 'Radio',          glyph: '○', keywords: 'radio option',            create: Radio        },
  { key: 'select',    group: 'Forms',  label: 'Select',         glyph: '▾', keywords: 'select dropdown',         create: SelectBlock  },
  { key: 'file',      group: 'Forms',  label: 'File upload',    glyph: '↑', keywords: 'file upload',             create: FileUpload   },
  { key: 'submit',    group: 'Forms',  label: 'Submit button',  glyph: '⏎', keywords: 'submit button form',      create: SubmitButton },
  { key: 'recaptcha', group: 'Forms',  label: 'reCAPTCHA',      glyph: '✓', keywords: 'recaptcha captcha spam',  create: Recaptcha    },

  // Advanced (light)
  { key: 'embed',     group: 'Advanced', label: 'HTML embed',   glyph: '</>', keywords: 'embed html code raw',             create: HtmlEmbed },
  { key: 'search',    group: 'Advanced', label: 'Search',       glyph: '⌕',   keywords: 'search input',                    create: Search    },
  { key: 'tabs',      group: 'Advanced', label: 'Tabs',         glyph: '▤',   keywords: 'tabs tabbed sections switch',     create: Tabs      },
  { key: 'accordion', group: 'Advanced', label: 'Accordion',    glyph: '≡',   keywords: 'accordion faq collapse expand dropdown', create: Accordion },
  { key: 'navbar',    group: 'Advanced', label: 'Navbar',       glyph: '▭',   keywords: 'navbar nav menu header responsive hamburger', create: Navbar },
  { key: 'slider',    group: 'Advanced', label: 'Slider',       glyph: '↔',   keywords: 'slider carousel hero swipe autoplay', create: Slider },
  { key: 'slide',     group: 'Advanced', label: 'Slide',        glyph: '▭',   keywords: 'slide slider item frame',                 create: Slide  },
  { key: 'lightbox',  group: 'Advanced', label: 'Lightbox',     glyph: '⛶',   keywords: 'lightbox modal zoom gallery image popup', create: Lightbox },
];

// Used by AddPanel to render groups in a stable order.
export const BLOCK_GROUPS = ['Layout', 'Basic', 'Forms', 'Advanced'];
