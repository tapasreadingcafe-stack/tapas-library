// =====================================================================
// Shared Notion-clone helpers: ids, block types, property types,
// color palette, and starter database schema.
// =====================================================================

export const uid = () => Math.random().toString(36).slice(2, 10);

// ── Block types (for the doc editor / slash menu) ───────────────────
export const BLOCK_TYPES = [
  { type: 'text',       label: 'Text',            icon: 'T',  hint: 'Plain paragraph.' },
  { type: 'heading1',   label: 'Heading 1',       icon: 'H1', hint: 'Big section heading.' },
  { type: 'heading2',   label: 'Heading 2',       icon: 'H2', hint: 'Medium section heading.' },
  { type: 'heading3',   label: 'Heading 3',       icon: 'H3', hint: 'Small section heading.' },
  { type: 'todo',       label: 'To-do list',      icon: '☐', hint: 'Checkbox + text.' },
  { type: 'bullet',     label: 'Bulleted list',   icon: '•', hint: 'A bullet list item.' },
  { type: 'numbered',   label: 'Numbered list',   icon: '1.', hint: 'A numbered list item.' },
  { type: 'quote',      label: 'Quote',           icon: '❝', hint: 'Callout quote.' },
  { type: 'divider',    label: 'Divider',         icon: '—', hint: 'Horizontal line.' },
  { type: 'callout',    label: 'Callout',         icon: '💡', hint: 'Highlighted note with an emoji.' },
  { type: 'code',       label: 'Code',            icon: '{ }', hint: 'Monospace code block.' },
];

export function newBlock(type = 'text', content = '') {
  return {
    id: uid(),
    type,
    content,
    checked: false,
    indent: 0,
    emoji: type === 'callout' ? '💡' : undefined,
  };
}

// ── Property types (for databases) ──────────────────────────────────
export const PROPERTY_TYPES = [
  { type: 'text',     label: 'Text',     icon: '𝗧' },
  { type: 'number',   label: 'Number',   icon: '#' },
  { type: 'select',   label: 'Select',   icon: '◉' },
  { type: 'date',     label: 'Date',     icon: '📅' },
  { type: 'checkbox', label: 'Checkbox', icon: '☑' },
  { type: 'url',      label: 'URL',      icon: '🔗' },
  { type: 'email',    label: 'Email',    icon: '✉' },
  { type: 'phone',    label: 'Phone',    icon: '📞' },
];

// Notion's color palette for select options.
export const SELECT_COLORS = [
  'gray', 'brown', 'orange', 'yellow',
  'green', 'blue', 'purple', 'pink', 'red',
];

export const COLOR_STYLES = {
  gray:   { bg: '#eceff3', fg: '#475569', border: '#cbd5e1' },
  brown:  { bg: '#ecdfd2', fg: '#713f12', border: '#d6b38e' },
  orange: { bg: '#fed7aa', fg: '#9a3412', border: '#fdba74' },
  yellow: { bg: '#fef08a', fg: '#854d0e', border: '#facc15' },
  green:  { bg: '#bbf7d0', fg: '#166534', border: '#86efac' },
  blue:   { bg: '#bfdbfe', fg: '#1e40af', border: '#93c5fd' },
  purple: { bg: '#e9d5ff', fg: '#6b21a8', border: '#c4b5fd' },
  pink:   { bg: '#fbcfe8', fg: '#9f1239', border: '#f9a8d4' },
  red:    { bg: '#fecaca', fg: '#991b1b', border: '#fca5a5' },
};

// ── View types ──────────────────────────────────────────────────────
export const VIEW_TYPES = [
  { type: 'table',    label: 'Table',    icon: '▦' },
  { type: 'board',    label: 'Board',    icon: '▥' },
  { type: 'list',     label: 'List',     icon: '≡' },
  { type: 'gallery',  label: 'Gallery',  icon: '▤' },
];

// ── Starter schemas for new databases ───────────────────────────────
export function starterDbSchema() {
  const statusProp = {
    id: uid(), name: 'Status', type: 'select',
    options: [
      { id: uid(), name: 'Not started', color: 'gray' },
      { id: uid(), name: 'In progress', color: 'blue' },
      { id: uid(), name: 'Done',        color: 'green' },
    ],
  };
  const priorityProp = {
    id: uid(), name: 'Priority', type: 'select',
    options: [
      { id: uid(), name: 'Low',    color: 'gray' },
      { id: uid(), name: 'Medium', color: 'yellow' },
      { id: uid(), name: 'High',   color: 'red' },
    ],
  };
  const dueProp = { id: uid(), name: 'Due date', type: 'date' };

  return {
    properties: [statusProp, priorityProp, dueProp],
    views: [
      { id: uid(), name: 'All',      type: 'table' },
      { id: uid(), name: 'By status', type: 'board',   group_by: statusProp.id },
      { id: uid(), name: 'Cards',    type: 'gallery' },
    ],
  };
}

// ── Misc helpers ────────────────────────────────────────────────────
export function placeCaretAtEnd(el) {
  if (!el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

export function formatDateDisplay(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Neutral UI tokens.
export const N = {
  text:      '#0f172a',
  textDim:   '#475569',
  textFaint: '#94a3b8',
  textMuted: '#64748b',
  border:    '#e2e8f0',
  borderSoft:'#f1f5f9',
  bg:        '#ffffff',
  bgAlt:     '#f8fafc',
  hover:     '#f1f5f9',
  accent:    '#D4A853',
  accentSoft:'#fef3c7',
  danger:    '#dc2626',
};
