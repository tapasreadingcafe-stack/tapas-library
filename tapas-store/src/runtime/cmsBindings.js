// =====================================================================
// Storefront copy of src/utils/cmsBindings.js (Phase I3).
//
// Duplicated because the two CRA apps don't yet share a packages/
// folder. If the token syntax ever changes, update both files.
// =====================================================================

const TOKEN_RE = /\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g;

export function substituteString(str, item) {
  if (typeof str !== 'string' || !str.includes('{{')) return str;
  const data = item?.data || {};
  return str.replace(TOKEN_RE, (_, key) => {
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

function newStampId() {
  return 's_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
}

export function stampTemplate(template, item, itemIndex = 0) {
  if (!template) return null;
  return stampNode(template, item, itemIndex, 0);
}

function stampNode(node, item, itemIndex, depth) {
  if (!node || typeof node !== 'object') return node;
  if (typeof node.text === 'string' && !node.tag) {
    const next = { ...node, text: substituteString(node.text, item) };
    if (node.href) next.href = substituteString(node.href, item);
    return next;
  }
  const next = {
    ...node,
    id: `stamp_${item.id || itemIndex}_${depth}_${newStampId()}`,
  };
  if (typeof node.textContent === 'string') {
    next.textContent = substituteString(node.textContent, item);
  }
  if (node.attributes) {
    const attrs = {};
    for (const [k, v] of Object.entries(node.attributes)) {
      if (typeof v !== 'string') { attrs[k] = v; continue; }
      const hadBinding = v.includes('{{');
      const resolved = substituteString(v, item);
      const isUrlish = k === 'src' || k === 'href' || k === 'poster'
        || k === 'srcset' || k === 'data-src';
      if (hadBinding && isUrlish && resolved.trim() === '') continue;
      attrs[k] = resolved;
    }
    next.attributes = attrs;
  }
  if (Array.isArray(node.children) && node.children.length) {
    next.children = node.children.map((c, i) => stampNode(c, item, itemIndex, depth + i + 1));
  }
  return next;
}
