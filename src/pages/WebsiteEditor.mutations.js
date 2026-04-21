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
// A "page key" of `__c:<componentId>` routes the existing tree /
// mutation infrastructure at a component definition instead of a
// page, so every helper that takes pageKey works unchanged while the
// staff is editing a component in-canvas. Callers who specifically
// need a page (createPage, updatePageMeta, etc.) keep rejecting
// component keys because their own lookup misses.
export const COMPONENT_PAGE_PREFIX = '__c:';

export function isComponentScope(pageKey) {
  return typeof pageKey === 'string' && pageKey.startsWith(COMPONENT_PAGE_PREFIX);
}

export function componentIdFromScope(pageKey) {
  return isComponentScope(pageKey) ? pageKey.slice(COMPONENT_PAGE_PREFIX.length) : null;
}

export function componentScopeKey(componentId) {
  return COMPONENT_PAGE_PREFIX + componentId;
}

// Returns a "page-shaped" view over a component definition so tree
// walkers / pathToNode / flattenTree keep working when the edit target
// is a component. The shape mirrors a real page: { id, tree, ... }.
export function getEffectivePage(content, pageKey) {
  if (isComponentScope(pageKey)) {
    const id = componentIdFromScope(pageKey);
    const def = content?.components?.[id];
    if (!def) return null;
    return {
      id: def.id,
      name: def.name || 'Component',
      slug: '',
      tree: def.root,
      meta: {},
      __component: true,
    };
  }
  return content?.pages?.[pageKey] || null;
}

export function withPage(content, pageKey, updater) {
  if (isComponentScope(pageKey)) {
    const id = componentIdFromScope(pageKey);
    const def = content?.components?.[id];
    if (!def) return content;
    const shim = { id: def.id, tree: def.root, meta: {}, name: def.name, slug: '' };
    const next = updater(shim);
    if (next === shim || !next) return content;
    if (next.tree === def.root) return content;
    return {
      ...content,
      components: {
        ...content.components,
        [id]: { ...def, root: next.tree, updated_at: new Date().toISOString() },
      },
    };
  }
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
  const page = getEffectivePage(content, pageKey);
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

// Phase D — write rich-text runs to a leaf node. Clears textContent
// so a migrated node never carries stale string data; the renderer
// sees children[] and walks the runs. Empty / all-blank runs fall
// through to the same empty-leaf shape as setNodeTextContent(''):
// the stored blob stays tidy.
export function setNodeRuns(content, pageKey, nodeId, runs) {
  const cleaned = normalizeRuns(runs);
  return withNode(content, pageKey, nodeId, (node) => {
    const before = Array.isArray(node.children) && node.children.length && typeof node.children[0]?.text === 'string'
      ? node.children
      : null;
    if (before && sameRuns(before, cleaned)) return node;
    const { textContent: _gone, ...rest } = node;
    if (cleaned.length === 0) {
      const { children: _c, ...stripped } = rest;
      return stripped;
    }
    return { ...rest, children: cleaned };
  });
}

// Merge runs that share identical marks (post-execCommand the browser
// often emits chained <strong><strong>… pairs) and drop zero-length
// runs. Ensures the stored shape is canonical so equality checks
// short-circuit correctly.
function normalizeRuns(runs) {
  const out = [];
  for (const r of runs || []) {
    if (!r || typeof r.text !== 'string' || r.text.length === 0) continue;
    const marks = Array.from(new Set(r.marks || [])).sort();
    const href = r.href || undefined;
    const prev = out[out.length - 1];
    if (prev && sameMarks(prev.marks, marks) && (prev.href || undefined) === href) {
      prev.text += r.text;
      continue;
    }
    const next = { text: r.text, marks };
    if (href) next.href = href;
    out.push(next);
  }
  return out;
}

function sameMarks(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function sameRuns(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.text !== b[i]?.text) return false;
    if ((a[i]?.href || undefined) !== (b[i]?.href || undefined)) return false;
    if (!sameMarks(a[i]?.marks || [], b[i]?.marks || [])) return false;
  }
  return true;
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
  const page = getEffectivePage(content, pageKey);
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
  const page = getEffectivePage(content, pageKey);
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
  const page = getEffectivePage(content, pageKey);
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
  const page = getEffectivePage(content, pageKey);
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
  const page = getEffectivePage(content, pageKey);
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
  const page = getEffectivePage(content, pageKey);
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

// Count how many times each class is referenced across every tree.
// Used by the Class browser to surface dead classes staff can clean up.
export function classUsageMap(content) {
  const counts = {};
  const walk = (node) => {
    if (!node) return;
    for (const c of node.classes || []) {
      counts[c] = (counts[c] || 0) + 1;
    }
    for (const ch of node.children || []) walk(ch);
  };
  for (const p of Object.values(content?.pages || {})) walk(p.tree);
  return counts;
}

// Remove a class from content.classes AND strip every reference to it
// across every node's classes[] on every page. Idempotent on missing
// classes. No-op if the class is a combo prerequisite; the caller
// should check combo-class dependencies before invoking.
export function deleteClass(content, className) {
  if (!content?.classes?.[className]) return content;
  const { [className]: _gone, ...restClasses } = content.classes;
  const rewriteClasses = (arr) => (arr || []).filter((n) => n !== className);
  const rewriteTree = (node) => {
    if (!node) return node;
    const hasIt = node.classes?.includes(className);
    const nc = hasIt ? { ...node, classes: rewriteClasses(node.classes) } : node;
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
  return { ...content, classes: restClasses, pages: nextPages };
}

// Bulk-delete all classes whose usage count is zero. Returns new
// content plus the list of removed names so the UI can toast.
export function deleteUnusedClasses(content) {
  const counts = classUsageMap(content);
  const removed = [];
  let next = content;
  for (const name of Object.keys(content?.classes || {})) {
    if (!counts[name]) {
      next = deleteClass(next, name);
      removed.push(name);
    }
  }
  return { content: next, removed };
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

// =====================================================================
// Phase E — Components (a.k.a. Symbols).
//
// A component is a named, reusable subtree stored site-wide at
// content.components[<id>] = { id, name, root: Node, created_at, updated_at }.
// Pages reference them via nodes that carry `componentRef: <id>` in
// place of children. Changing the definition updates every instance
// at once.
// =====================================================================

function newComponentId() {
  return 'c_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
}

function defaultComponentName(root) {
  const firstClass = root?.classes?.[0];
  if (firstClass) return firstClass.replace(/^tapas-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return root?.tag ? `${root.tag} component` : 'Component';
}

// Save the selected subtree as a new component. Two moves in one:
//   1. clone the subtree (fresh ids) into content.components as the def
//   2. replace the selected node with an instance node that references
//      the new component id
// Returns { content, componentId, instanceId }.
//
// Idempotent-ish: if the selection is already an instance, we no-op
// rather than nesting a component inside itself.
export function saveAsComponent(content, pageKey, nodeId, { name } = {}) {
  const page = getEffectivePage(content, pageKey);
  if (!page) return { content, componentId: null, instanceId: null };
  const loc = locateWithParent(page.tree, nodeId);
  if (!loc) return { content, componentId: null, instanceId: null };
  if (loc.node.componentRef) {
    return { content, componentId: loc.node.componentRef, instanceId: loc.node.id };
  }

  const defRoot = cloneWithFreshIds(loc.node);
  // Strip componentRef from descendants just in case — a component def
  // should own its whole subtree.
  stripComponentRefs(defRoot);

  const componentId = newComponentId();
  const now = new Date().toISOString();
  const def = {
    id: componentId,
    name: (name && name.trim()) || defaultComponentName(defRoot),
    root: defRoot,
    created_at: now,
    updated_at: now,
  };

  const instance = {
    id: newNodeId(),
    tag: loc.node.tag || 'div',
    classes: [],
    attributes: {},
    children: [],
    componentRef: componentId,
  };

  // Rewire: replace selected node with instance + register def.
  const withDef = {
    ...content,
    components: { ...(content.components || {}), [componentId]: def },
  };
  const withInstance = withNode(withDef, pageKey, loc.parent.id, (parent) => {
    const kids = parent.children || [];
    return {
      ...parent,
      children: kids.map((c) => (c.id === nodeId ? instance : c)),
    };
  });
  return { content: withInstance, componentId, instanceId: instance.id };
}

function stripComponentRefs(node) {
  if (!node) return;
  if (node.componentRef) delete node.componentRef;
  for (const c of node.children || []) stripComponentRefs(c);
}

// Detach a component instance — replaces the componentRef node with
// a deep clone of the component's current def.root (fresh ids). The
// def itself is left intact; other instances keep resolving against it.
export function detachComponent(content, pageKey, nodeId) {
  const page = getEffectivePage(content, pageKey);
  if (!page) return { content, newId: null };
  const loc = locateWithParent(page.tree, nodeId);
  if (!loc || !loc.node.componentRef) return { content, newId: null };
  const def = content?.components?.[loc.node.componentRef];
  if (!def?.root) return { content, newId: null };
  const clone = cloneWithFreshIds(def.root);
  const next = withNode(content, pageKey, loc.parent.id, (parent) => {
    const kids = parent.children || [];
    return {
      ...parent,
      children: kids.map((c) => (c.id === nodeId ? clone : c)),
    };
  });
  return { content: next, newId: clone.id };
}

// Insert a new instance of a component under parentId (or at page root).
// Mirrors insertNode so the Add-panel-style flow works identically.
export function insertComponentInstance(content, pageKey, parentId, componentId) {
  if (!content?.components?.[componentId]) return { content, newId: null };
  const def = content.components[componentId];
  const instance = {
    id: newNodeId(),
    tag: def.root?.tag || 'div',
    classes: [],
    attributes: {},
    children: [],
    componentRef: componentId,
  };
  return { content: insertNode(content, pageKey, parentId, instance), newId: instance.id };
}

// Rename a component. Idempotent when the name is unchanged.
export function renameComponent(content, componentId, name) {
  const def = content?.components?.[componentId];
  if (!def) return content;
  const next = (name || '').trim() || def.name;
  if (next === def.name) return content;
  return {
    ...content,
    components: {
      ...content.components,
      [componentId]: { ...def, name: next, updated_at: new Date().toISOString() },
    },
  };
}

// Delete a component — refuses if any page still references it. The
// caller can detach instances first (bulk-detach is a later pass).
// Returns { content, deleted: bool, reason?: 'in-use' }.
export function deleteComponent(content, componentId) {
  if (!content?.components?.[componentId]) return { content, deleted: false };
  const usage = componentUsage(content)[componentId] || 0;
  if (usage > 0) return { content, deleted: false, reason: 'in-use' };
  const { [componentId]: _gone, ...rest } = content.components;
  return { content: { ...content, components: rest }, deleted: true };
}

// Replace the component's root via the supplied updater. Editing a
// subtree of def.root is the common case, so the updater receives the
// old root and returns the new one. Updates the timestamp so staff can
// sort / audit component history later.
export function updateComponentRoot(content, componentId, updater) {
  const def = content?.components?.[componentId];
  if (!def) return content;
  const nextRoot = typeof updater === 'function' ? updater(def.root) : updater;
  if (!nextRoot || nextRoot === def.root) return content;
  return {
    ...content,
    components: {
      ...content.components,
      [componentId]: { ...def, root: nextRoot, updated_at: new Date().toISOString() },
    },
  };
}

// Count how many tree nodes (across every page) point at each
// component id. Used by the Components panel's usage column and by
// deleteComponent to gate destructive ops.
export function componentUsage(content) {
  const counts = {};
  const walk = (n) => {
    if (!n) return;
    if (n.componentRef) counts[n.componentRef] = (counts[n.componentRef] || 0) + 1;
    for (const c of n.children || []) walk(c);
  };
  for (const page of Object.values(content?.pages || {})) {
    walk(page?.tree);
  }
  return counts;
}
