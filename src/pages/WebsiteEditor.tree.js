// =====================================================================
// Tree walkers for the Phase-2 selection model.
//
// The v2 schema stores a page as a single Node tree. The editor needs
// to resolve selection state — ancestors for breadcrumb, parent for
// Esc, first child for Enter, prev/next sibling for Arrow keys — from
// a node id. These helpers do pre-order traversal; keep them pure so
// they're cheap to call from memos on every selection change.
// =====================================================================

// Flatten to pre-order [{ node, depth, parentId }] so Arrow Up/Down
// can walk the visible list the same way the Navigator renders it.
export function flattenTree(root) {
  const out = [];
  const rec = (n, depth, parentId) => {
    if (!n) return;
    out.push({ node: n, depth, parentId });
    for (const c of n.children || []) rec(c, depth + 1, n.id);
  };
  rec(root, 0, null);
  return out;
}

// Return [{ id, label }, …] from root to the selected node (inclusive).
// Used by the top-bar breadcrumb — each segment clickable to scope up.
export function pathToNode(root, id) {
  if (!root || !id) return [];
  const out = [];
  const rec = (n, acc) => {
    if (!n) return false;
    const next = [...acc, { id: n.id, label: labelOf(n) }];
    if (n.id === id) { out.push(...next); return true; }
    for (const c of n.children || []) if (rec(c, next)) return true;
    return false;
  };
  rec(root, []);
  return out;
}

export function findNode(root, id) {
  if (!root || !id) return null;
  let hit = null;
  const rec = (n) => {
    if (hit || !n) return;
    if (n.id === id) { hit = n; return; }
    for (const c of n.children || []) rec(c);
  };
  rec(root);
  return hit;
}

export function parentOf(root, id) {
  const path = pathToNode(root, id);
  return path.length >= 2 ? findNode(root, path[path.length - 2].id) : null;
}

export function firstChildOf(root, id) {
  const node = findNode(root, id);
  return node?.children?.[0] || null;
}

// Sibling navigation uses the flattened pre-order list so that Arrow Up
// from a child crosses into the previous section automatically, the
// same way Webflow's Navigator behaves.
export function prevInFlat(flat, id) {
  const idx = flat.findIndex(r => r.node.id === id);
  return idx > 0 ? flat[idx - 1].node : null;
}

export function nextInFlat(flat, id) {
  const idx = flat.findIndex(r => r.node.id === id);
  return idx >= 0 && idx < flat.length - 1 ? flat[idx + 1].node : null;
}

export function labelOf(n) {
  if (!n) return '';
  if (n.classes?.[0]) return `.${n.classes[0]}`;
  return n.tag || '?';
}
