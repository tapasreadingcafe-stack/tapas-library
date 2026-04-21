// =====================================================================
// cmsBindings — Phase I3 {{field}} substitution.
//
// Two responsibilities:
//   * `stampTemplate(template, item)` — deep-clone a template Node,
//     substituting every `{{field}}` token in text content / TextRun
//     text / attribute values with the matching value from `item.data`.
//     Returns a fresh Node tree with unique ids so React can key it.
//   * `stringHasBinding(s)` + `extractBindings(s)` — cheap helpers the
//     Settings-tab picker uses to detect whether a field is already
//     bound and highlight it in the UI.
//
// Shared between editor and storefront — safe to import from either
// app because it's pure JS with no React / Supabase dependencies.
// =====================================================================

const TOKEN_RE = /\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g;

export function stringHasBinding(str) {
  if (typeof str !== 'string') return false;
  TOKEN_RE.lastIndex = 0;
  return TOKEN_RE.test(str);
}

export function extractBindings(str) {
  if (typeof str !== 'string') return [];
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(str)) !== null) {
    out.push(m[1]);
  }
  return out;
}

// Substitute every `{{field}}` occurrence in the string. Missing
// fields resolve to empty string so partial schemas don't blow up
// the render.
export function substituteString(str, item) {
  if (typeof str !== 'string' || !str.includes('{{')) return str;
  const data = item?.data || {};
  return str.replace(TOKEN_RE, (_, key) => {
    // Support dotted paths (e.g. `author.name`) for nested jsonb.
    const parts = key.split('.');
    let cursor = data;
    for (const p of parts) {
      if (cursor == null) return '';
      cursor = cursor[p];
    }
    if (cursor == null) return '';
    return String(cursor);
  });
}

// Mint a short random id for stamped nodes. Same pattern as the
// editor's other id generators so history / selection work cleanly.
function newStampId() {
  return 's_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
}

// Deep-clone a template tree, substituting bindings. The caller is
// responsible for giving each item a unique id the React renderer
// can key against — we derive one from the item's own id.
export function stampTemplate(template, item, itemIndex = 0) {
  if (!template) return null;
  return stampNode(template, item, itemIndex, 0);
}

function stampNode(node, item, itemIndex, depth) {
  if (!node || typeof node !== 'object') return node;

  // TextRun — substitute in `text` and `href`.
  if (typeof node.text === 'string' && !node.tag) {
    const next = {
      ...node,
      text: substituteString(node.text, item),
    };
    if (node.href) next.href = substituteString(node.href, item);
    return next;
  }

  // Regular Node. Fresh id is scoped per-item/depth so sibling items
  // don't collide and the editor still key-stable on re-render.
  const next = {
    ...node,
    id: `stamp_${item.id || itemIndex}_${depth}_${newStampId()}`,
  };

  // Substitute in textContent (legacy plain-text leaf).
  if (typeof node.textContent === 'string') {
    next.textContent = substituteString(node.textContent, item);
  }

  // Substitute in attribute values.
  if (node.attributes) {
    const attrs = {};
    for (const [k, v] of Object.entries(node.attributes)) {
      attrs[k] = typeof v === 'string' ? substituteString(v, item) : v;
    }
    next.attributes = attrs;
  }

  // Recurse children. Both plain Nodes and TextRuns pass through
  // stampNode, which branches on the shape.
  if (Array.isArray(node.children) && node.children.length) {
    next.children = node.children.map((c, i) => stampNode(c, item, itemIndex, depth + i + 1));
  }

  return next;
}

// Locate the closest ancestor that is a collection_list. Used by the
// Settings-tab binding picker to scope which collection's fields are
// available for the selected element. Returns null if not inside one.
export function findCollectionAncestor(root, targetId) {
  if (!root || !targetId) return null;
  const path = [];
  const walk = (n) => {
    if (!n) return false;
    path.push(n);
    if (n.id === targetId) return true;
    for (const c of n.children || []) {
      if (walk(c)) return true;
    }
    path.pop();
    return false;
  };
  walk(root);
  for (let i = path.length - 1; i >= 0; i -= 1) {
    if (path[i]?.tag === 'collection_list') return path[i];
  }
  return null;
}
