// =====================================================================
// Mutations — pure immutable helpers that return a new SiteContent.
//
// The editor keeps the entire draft in memory as one SiteContent blob
// and debounces saves. Every edit goes through one of these helpers so
// the autosave hook can observe content changes via reference identity,
// undo/redo (Phase 9) can snapshot the blob, and publish (Phase 10)
// can diff against the live row.
//
// Spec § 7 class-only rule: style writes never touch node.style — they
// target classes. If the selected node has no class yet, callers first
// auto-create one (see ensureNodeClass below) then route the write.
// =====================================================================

// --- Low-level tree walk / rewrite ------------------------------------
// We deliberately reconstruct only the spine from the root down to the
// edited node; everything else keeps its reference identity. That way
// React.memo / useMemo downstream can skip work for untouched subtrees.
function mapNode(node, targetId, fn) {
  if (!node) return node;
  if (node.id === targetId) return fn(node);
  if (!node.children || node.children.length === 0) return node;
  let changed = false;
  const next = node.children.map((c) => {
    const nc = mapNode(c, targetId, fn);
    if (nc !== c) changed = true;
    return nc;
  });
  return changed ? { ...node, children: next } : node;
}

// --- Page helpers -----------------------------------------------------
export function withPage(content, pageKey, updater) {
  const page = content?.pages?.[pageKey];
  if (!page) return content;
  const nextPage = updater(page);
  if (nextPage === page) return content;
  return {
    ...content,
    pages: { ...content.pages, [pageKey]: nextPage },
  };
}

export function withNode(content, pageKey, nodeId, updater) {
  return withPage(content, pageKey, (page) => {
    const nextTree = mapNode(page.tree, nodeId, updater);
    return nextTree === page.tree ? page : { ...page, tree: nextTree };
  });
}

// --- Class helpers ----------------------------------------------------
// Webflow generates class names from tag + slug of surrounding text.
// We settle for tag + short random id so auto-created classes sort
// predictably and don't collide across pages.
function randId() {
  return Math.random().toString(36).slice(2, 7);
}

export function defaultClassName(tag) {
  const base = (tag || 'el').toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${base}-${randId()}`;
}

export function ensureClassDef(content, className, seed) {
  const cls = content?.classes?.[className];
  if (cls) return content;
  const next = {
    ...content,
    classes: {
      ...content?.classes,
      [className]: seed || { name: className, styles: { base: {} }, breakpoints: { desktop: {} }, modes: {} },
    },
  };
  return next;
}

// Attach a class name to a node (append, not replace — spec § 7 combo
// class support. Caller can pass index 0 to force primary class.)
export function attachClassToNode(content, pageKey, nodeId, className) {
  return withNode(content, pageKey, nodeId, (node) => {
    const existing = node.classes || [];
    if (existing.includes(className)) return node;
    return { ...node, classes: [...existing, className] };
  });
}

// Auto-create a class for a node if it has none, return { content, className }.
// This is the bridge the Style panel calls on first edit per spec § 7.
export function ensureNodeClass(content, pageKey, nodeId) {
  const page = content?.pages?.[pageKey];
  if (!page) return { content, className: null };
  // Find the node, pick its first class or mint a new one.
  let hit = null;
  const walk = (n) => {
    if (hit || !n) return;
    if (n.id === nodeId) { hit = n; return; }
    for (const c of n.children || []) walk(c);
  };
  walk(page.tree);
  if (!hit) return { content, className: null };
  if (hit.classes?.[0]) return { content, className: hit.classes[0] };
  const name = defaultClassName(hit.tag);
  const withClass = ensureClassDef(content, name);
  const withAttach = attachClassToNode(withClass, pageKey, nodeId, name);
  return { content: withAttach, className: name };
}

// --- Style writes -----------------------------------------------------
// Write (or clear — value === '' || null) a single CSS property on a
// class's style block. `state` keys: base, hover, pressed, focused,
// focus-visible, focus-within, visited.
export function setClassStyle(content, className, state, prop, value) {
  const cls = content?.classes?.[className];
  if (!cls) return content;
  const bucket = cls.styles?.[state] || {};
  let nextBucket;
  if (value === '' || value === null || value === undefined) {
    if (!(prop in bucket)) return content;
    nextBucket = { ...bucket };
    delete nextBucket[prop];
  } else {
    if (bucket[prop] === value) return content;
    nextBucket = { ...bucket, [prop]: value };
  }
  const nextCls = {
    ...cls,
    styles: { ...cls.styles, [state]: nextBucket },
  };
  return { ...content, classes: { ...content.classes, [className]: nextCls } };
}

// --- Node-level writes (Phase 5 Settings tab) -------------------------
// Change the HTML tag of a node. The Node renderer silently falls back
// to <div> for unknown tags, so invalid writes are non-destructive —
// but we still validate here to keep the stored tree clean.
const SAFE_TAGS = new Set([
  'div', 'section', 'header', 'nav', 'aside', 'main', 'article', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'a', 'ul', 'ol', 'li',
  'img', 'video', 'iframe', 'picture',
  'button', 'form', 'input', 'textarea', 'select', 'option', 'label',
  'blockquote', 'code', 'pre', 'em', 'strong', 'small',
]);

export function setNodeTag(content, pageKey, nodeId, tag) {
  const safe = String(tag || '').toLowerCase();
  if (!SAFE_TAGS.has(safe)) return content;
  return withNode(content, pageKey, nodeId, (node) => {
    if (node.tag === safe) return node;
    return { ...node, tag: safe };
  });
}

// Set textContent on a node. Empty string clears the key rather than
// leaving `""` around — the renderer treats absence and empty-string
// identically but the stored blob stays tidier. Called by the inline
// text editor on blur.
export function setNodeTextContent(content, pageKey, nodeId, text) {
  return withNode(content, pageKey, nodeId, (node) => {
    const next = text || '';
    if ((node.textContent || '') === next) return node;
    if (!next) {
      const { textContent: _gone, ...rest } = node;
      return rest;
    }
    return { ...node, textContent: next };
  });
}

// Set / clear a single attribute on a node. Empty-string and null
// values delete the key so the stored blob stays tidy.
export function setNodeAttribute(content, pageKey, nodeId, key, value) {
  if (!key) return content;
  return withNode(content, pageKey, nodeId, (node) => {
    const attrs = node.attributes || {};
    if (value === '' || value === null || value === undefined) {
      if (!(key in attrs)) return node;
      const { [key]: _gone, ...rest } = attrs;
      return { ...node, attributes: rest };
    }
    if (attrs[key] === value) return node;
    return { ...node, attributes: { ...attrs, [key]: value } };
  });
}

// Rename an attribute key (preserves value + ordering position). Used
// when editing the left cell of a key/value row.
export function renameNodeAttribute(content, pageKey, nodeId, oldKey, newKey) {
  if (!oldKey || !newKey || oldKey === newKey) return content;
  return withNode(content, pageKey, nodeId, (node) => {
    const attrs = node.attributes || {};
    if (!(oldKey in attrs) || newKey in attrs) return node;
    const next = {};
    for (const [k, v] of Object.entries(attrs)) {
      next[k === oldKey ? newKey : k] = v;
    }
    return { ...node, attributes: next };
  });
}

// Fresh node id for inserts. Short enough for DOM attribute use,
// random enough that collisions are negligible across a single page.
export function newNodeId() {
  return 'n-' + Math.random().toString(36).slice(2, 10);
}

// Deep-clone a subtree, minting fresh ids everywhere. Attributes,
// classes, textContent, tag are preserved — classes[] intentionally
// stays as-is so duplicated elements share styling with the original.
export function cloneWithFreshIds(node) {
  if (!node) return null;
  const next = { ...node, id: newNodeId() };
  if (node.children && node.children.length) {
    next.children = node.children.map(cloneWithFreshIds);
  } else {
    next.children = [];
  }
  return next;
}

// Locate a node's parent + index within that parent's children. Used
// by duplicate / remove / insert-after without exposing the walker
// to callers. Returns null if nodeId isn't reachable from the root.
function locateWithParent(root, nodeId) {
  if (!root) return null;
  let hit = null;
  const rec = (node) => {
    if (hit) return;
    const kids = node.children || [];
    for (let i = 0; i < kids.length; i++) {
      if (kids[i].id === nodeId) { hit = { parent: node, index: i, node: kids[i] }; return; }
      rec(kids[i]);
    }
  };
  rec(root);
  return hit;
}

// Duplicate a node — clone with fresh ids, insert after the original
// in its parent's children. Returns { content, newId } so the caller
// can select the clone.
export function duplicateNode(content, pageKey, nodeId) {
  const page = content?.pages?.[pageKey];
  if (!page) return { content, newId: null };
  const loc = locateWithParent(page.tree, nodeId);
  if (!loc) return { content, newId: null };
  const clone = cloneWithFreshIds(loc.node);
  const next = withNode(content, pageKey, loc.parent.id, (parent) => {
    const kids = parent.children || [];
    return {
      ...parent,
      children: [
        ...kids.slice(0, loc.index + 1),
        clone,
        ...kids.slice(loc.index + 1),
      ],
    };
  });
  return { content: next, newId: clone.id };
}

// Insert a prepared node BEFORE an anchor node (same parent). Mirror
// of insertNodeAfter. Used by drag-drop when the cursor is above the
// midpoint of the hover target.
export function insertNodeBefore(content, pageKey, beforeId, newNode) {
  const page = content?.pages?.[pageKey];
  if (!page || !newNode) return { content, newId: null };
  const loc = locateWithParent(page.tree, beforeId);
  if (!loc) return { content, newId: null };
  const next = withNode(content, pageKey, loc.parent.id, (parent) => {
    const kids = parent.children || [];
    return {
      ...parent,
      children: [
        ...kids.slice(0, loc.index),
        newNode,
        ...kids.slice(loc.index),
      ],
    };
  });
  return { content: next, newId: newNode.id };
}

// Insert a prepared node after an anchor node (same parent). Returns
// { content, newId }. If afterId isn't reachable, no-op.
export function insertNodeAfter(content, pageKey, afterId, newNode) {
  const page = content?.pages?.[pageKey];
  if (!page || !newNode) return { content, newId: null };
  const loc = locateWithParent(page.tree, afterId);
  if (!loc) return { content, newId: null };
  const next = withNode(content, pageKey, loc.parent.id, (parent) => {
    const kids = parent.children || [];
    return {
      ...parent,
      children: [
        ...kids.slice(0, loc.index + 1),
        newNode,
        ...kids.slice(loc.index + 1),
      ],
    };
  });
  return { content: next, newId: newNode.id };
}

// Remove a node from its parent's children. Refuses to remove the
// page root because there's no parent to host the result. Returns
// the new content plus the removed node's parent id so callers can
// pick a sensible next selection.
export function removeNode(content, pageKey, nodeId) {
  const page = content?.pages?.[pageKey];
  if (!page) return { content, parentId: null };
  if (page.tree?.id === nodeId) return { content, parentId: null };
  const loc = locateWithParent(page.tree, nodeId);
  if (!loc) return { content, parentId: null };
  const next = withNode(content, pageKey, loc.parent.id, (parent) => ({
    ...parent,
    children: (parent.children || []).filter((c) => c.id !== nodeId),
  }));
  return { content: next, parentId: loc.parent.id };
}

// Sibling lookup for Tab / Shift+Tab — returns the node just before
// or after the current selection inside the same parent. Null if
// there is no sibling in that direction.
export function siblingOf(content, pageKey, nodeId, direction) {
  const page = content?.pages?.[pageKey];
  if (!page) return null;
  const loc = locateWithParent(page.tree, nodeId);
  if (!loc) return null;
  const kids = loc.parent.children || [];
  const target = direction === 'next' ? loc.index + 1 : loc.index - 1;
  return kids[target] || null;
}

// Insert a node as a child of parentId at the given index (defaults to
// end). Used by the Phase-7 Add panel. If parentId is null or not
// found, inserts at the end of the page root.
export function insertNode(content, pageKey, parentId, newNode, index) {
  const page = content?.pages?.[pageKey];
  if (!page) return content;
  const targetParentId = parentId || page.tree?.id;
  if (!targetParentId) return content;
  return withNode(content, pageKey, targetParentId, (parent) => {
    const kids = parent.children || [];
    const safe = typeof index === 'number'
      ? Math.max(0, Math.min(index, kids.length))
      : kids.length;
    const next = [...kids.slice(0, safe), newNode, ...kids.slice(safe)];
    return { ...parent, children: next };
  });
}

// --- Page-level mutations (Phase 10 cutover enablement) -------------
// Create / rename / delete pages so users can build marketing pages
// that don't exist in the v1 blob. Each page ships with a blank body
// root so selection, breadcrumb, and the Add panel all work on day one.
//
// Slugs are normalized to a leading `/`; names default to the slug's
// basename, title-cased. Keys are derived from the slug so they're
// stable across renames that change the display name only.

function slugToKey(slug) {
  const s = String(slug || '').trim();
  const cleaned = s.replace(/^\/+/, '').replace(/\/+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'page';
  return cleaned.toLowerCase();
}

function normalizeSlug(slug) {
  const s = String(slug || '').trim();
  if (!s) return '/';
  if (s === '/') return '/';
  return ('/' + s.replace(/^\/+/, '').replace(/\/+$/, '')).toLowerCase();
}

export function createPage(content, { slug, name } = {}) {
  const normalizedSlug = normalizeSlug(slug);
  const key = slugToKey(normalizedSlug);
  if (content?.pages?.[key]) return { content, key: null, reason: 'exists' };
  const bodyId = 'body_' + Math.random().toString(36).slice(2, 10);
  const pretty = name?.trim() || (normalizedSlug === '/'
    ? 'Home'
    : normalizedSlug.slice(1).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  const nextPage = {
    id: 'p_' + key,
    name: pretty,
    slug: normalizedSlug,
    tree: { id: bodyId, tag: 'body', classes: [], attributes: {}, children: [] },
    meta: {
      title: pretty,
      description: '',
      og_image: '',
      canonical_url: '',
      robots_noindex: false,
    },
  };
  return {
    content: { ...content, pages: { ...(content?.pages || {}), [key]: nextPage } },
    key,
  };
}

export function deletePage(content, pageKey) {
  if (!content?.pages?.[pageKey]) return content;
  if (pageKey === 'home') return content; // protect the home page
  const { [pageKey]: _gone, ...rest } = content.pages;
  return { ...content, pages: rest };
}

// Patch page.meta fields (title / description / og_image / canonical_url
// / robots_noindex). Accepts a partial — only the provided keys get
// written. Empty string drops the key to keep the stored blob tidy.
export function updatePageMeta(content, pageKey, patch) {
  const page = content?.pages?.[pageKey];
  if (!page || !patch) return content;
  const prev = page.meta || {};
  const next = { ...prev };
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    const normalized = typeof v === 'string' ? v : v;
    if (normalized === '' || normalized === null || normalized === undefined) {
      if (k in next) { delete next[k]; changed = true; }
    } else if (next[k] !== normalized) {
      next[k] = normalized;
      changed = true;
    }
  }
  if (!changed) return content;
  return {
    ...content,
    pages: {
      ...content.pages,
      [pageKey]: { ...page, meta: next },
    },
  };
}

export function renamePage(content, pageKey, { name, slug } = {}) {
  const page = content?.pages?.[pageKey];
  if (!page) return content;
  const next = { ...page };
  if (typeof name === 'string' && name.trim()) next.name = name.trim();
  if (typeof slug === 'string' && slug.trim()) next.slug = normalizeSlug(slug);
  return { ...content, pages: { ...content.pages, [pageKey]: next } };
}

// Breakpoint-scoped write. Writes into cls.breakpoints[bp][prop]. The
// 'desktop' breakpoint is a no-op here because the CSS compiler treats
// breakpoints.desktop as an ignored shim — callers should route
// desktop writes through setClassStyle so they land in styles.<state>.
export function setClassBreakpointStyle(content, className, breakpoint, prop, value) {
  const cls = content?.classes?.[className];
  if (!cls) return content;
  const bucket = cls.breakpoints?.[breakpoint] || {};
  let nextBucket;
  if (value === '' || value === null || value === undefined) {
    if (!(prop in bucket)) return content;
    nextBucket = { ...bucket };
    delete nextBucket[prop];
  } else {
    if (bucket[prop] === value) return content;
    nextBucket = { ...bucket, [prop]: value };
  }
  const nextCls = {
    ...cls,
    breakpoints: { ...cls.breakpoints, [breakpoint]: nextBucket },
  };
  return { ...content, classes: { ...content.classes, [className]: nextCls } };
}

// Rename a class across the classes map AND every node's classes[] on
// every page's tree. Used when the user edits the class badge.
export function renameClass(content, oldName, newName) {
  if (!oldName || !newName || oldName === newName) return content;
  if (!content?.classes?.[oldName]) return content;
  if (content.classes[newName]) return content; // don't overwrite
  const { [oldName]: oldDef, ...rest } = content.classes;
  const nextClasses = { ...rest, [newName]: { ...oldDef, name: newName } };
  const rewriteClasses = (arr) =>
    (arr || []).map((c) => (c === oldName ? newName : c));
  const rewriteTree = (node) => {
    if (!node) return node;
    const nc = node.classes?.includes(oldName)
      ? { ...node, classes: rewriteClasses(node.classes) }
      : node;
    const children = node.children || [];
    let changed = nc !== node;
    const nextChildren = children.map((c) => {
      const r = rewriteTree(c);
      if (r !== c) changed = true;
      return r;
    });
    return changed ? { ...nc, children: nextChildren } : node;
  };
  const nextPages = {};
  for (const [k, p] of Object.entries(content.pages || {})) {
    nextPages[k] = { ...p, tree: rewriteTree(p.tree) };
  }
  return { ...content, classes: nextClasses, pages: nextPages };
}
