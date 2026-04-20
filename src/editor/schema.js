// =====================================================================
// Webflow-parity v2 schema
//
// This is the NEW data model introduced for the Path A migration.
// Lives alongside the existing siteContentSchema.js so production
// rendering stays on the current path during Phase 0-10. Becomes the
// single source of truth after cutover.
//
// Shape matches § 8 of the spec.
// =====================================================================

// A node in a page's DOM-like tree. Every element the user can see on
// the canvas is a Node. Leaf nodes carry textContent; branches hold
// children. Component instances set componentRef and defer to the
// component's own tree at render time.
export function makeNode({
  id,
  tag,
  classes = [],
  attributes = {},
  children = [],
  textContent,
  componentRef,
} = {}) {
  return {
    id: id || newId(),
    tag,
    classes,
    attributes,
    children,
    ...(textContent !== undefined ? { textContent } : {}),
    ...(componentRef ? { componentRef } : {}),
  };
}

// Cheap nanoid-style id generator — short enough to read in JSON, random
// enough to avoid collisions across a single session. Replace with
// nanoid package once the migration is live.
let _idCounter = 0;
export function newId(prefix = 'n') {
  const t = Date.now().toString(36);
  const c = (_idCounter++).toString(36);
  const r = Math.floor(Math.random() * 36 * 36).toString(36);
  return `${prefix}_${t}${c}${r}`;
}

// A class definition. Global classes share across the site; breakpoint
// overrides and pseudo-states are nested so the compiler can emit them
// in a single CSS string.
export function makeClass({
  name,
  parent,
  isGlobal = false,
  styles = { base: {} },
  breakpoints = { desktop: {} },
  modes = {},
} = {}) {
  return { name, parent, isGlobal, styles, breakpoints, modes };
}

// The root content object stored in Supabase app_settings.
// Keys match what the new editor will read/write.
export function emptySiteContent() {
  return {
    schema_version: 2,
    pages: {},
    classes: {},
    variables: {},
    components: {},
    interactions: {},
    brand: {
      name: 'TAPAS reading cafe',
      logo_url: '',
      primary_color: '#CFF389',
      accent_color: '#EF3D7B',
    },
  };
}

// A single page. Mutates through the editor; nothing else touches it.
export function makePage({ id, name, slug, tree, meta = {} } = {}) {
  return {
    id: id || newId('p'),
    name: name || slug || 'Page',
    slug: slug || '/',
    tree: tree || makeNode({ tag: 'body', children: [] }),
    meta: {
      title: meta.title || name || '',
      description: meta.description || '',
      og_image: meta.og_image || '',
      canonical_url: meta.canonical_url || '',
      robots_noindex: !!meta.robots_noindex,
    },
  };
}

// Walker — visit every node in a tree, parent-first. Return false from
// `visit` to stop descending into children.
export function walkTree(node, visit) {
  if (!node) return;
  const keepGoing = visit(node) !== false;
  if (!keepGoing) return;
  for (const child of node.children || []) walkTree(child, visit);
}

// Find the first node matching a predicate. Depth-first pre-order.
export function findNode(root, predicate) {
  let hit = null;
  walkTree(root, (n) => {
    if (hit) return false;
    if (predicate(n)) { hit = n; return false; }
    return true;
  });
  return hit;
}

// Get the ordered path of ancestors from root to `targetId`. Used to
// power the breadcrumb in § 1. Empty array when not found.
export function nodePath(root, targetId) {
  const stack = [];
  let found = null;
  const rec = (node) => {
    if (found) return;
    stack.push(node);
    if (node.id === targetId) { found = [...stack]; return; }
    for (const child of node.children || []) rec(child);
    stack.pop();
  };
  rec(root);
  return found || [];
}
