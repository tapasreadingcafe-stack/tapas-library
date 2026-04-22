// =====================================================================
// CollectionList — storefront runtime for <collection_list> nodes
// (Phase I2 + I3).
//
// The editor emits:
//   { tag: 'collection_list',
//     attributes: { collection_slug, limit, order_by, filter? },
//     children: [ templateNode ] }
//
// At runtime we:
//   1. resolve the collection (by slug) against store_collections
//   2. fetch published items from store_collection_items
//   3. stamp the first child (template) once per item, with
//      {{field}} bindings substituted from item.data
//   4. render the stamped Nodes through the same Node walker so
//      nested composites / rich-text / styles keep working
//
// renderChild is passed in to dodge a Node ↔ CollectionList circular
// import — same pattern as Slider / Lightbox.
// =====================================================================

import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { stampTemplate } from '../runtime/cmsBindings';

function parsePositiveInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// order_by is stored as "column:direction", e.g. "created_at:desc".
// Parse defensively so an empty / malformed value doesn't break the
// page — just falls back to newest-first.
function parseOrderBy(raw) {
  const [col, dir] = String(raw || '').split(':');
  return {
    column: col && col.match(/^[a-z_]+$/) ? col : 'created_at',
    ascending: dir === 'asc',
  };
}

// Parse the filter attribute — querystring-style pairs. Each accepted
// pair applies a `data->>key eq value` filter to the Supabase query.
// Example: "category=fiction&featured=true".
// We only accept simple alphanumeric+underscore keys and equality for
// the MVP; PostgREST injection isn't a concern because .filter() uses
// a parameterised string, but we still lock down the key shape.
function parseFilter(raw) {
  if (!raw) return [];
  const out = [];
  try {
    const params = new URLSearchParams(raw);
    for (const [k, v] of params) {
      if (!/^[a-zA-Z_][\w]*$/.test(k)) continue;
      out.push([k, v]);
    }
  } catch {
    /* malformed filter string — ignore */
  }
  return out;
}

// 30-second in-memory cache so a page with 5 collection_list blocks
// hits Supabase once per unique (slug, limit, order, filter) tuple
// instead of 5 times. Keyed by a stable string; entries expire on TTL
// or on invalidateCollectionCache().
const COLLECTION_CACHE_TTL_MS = 30_000;
const _collectionCache = new Map();
function cacheKey(slug, limit, order, filter) {
  return `${slug}|${limit}|${order.column}:${order.ascending ? 'asc' : 'desc'}|${filter}`;
}
function cacheGet(key) {
  const hit = _collectionCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > COLLECTION_CACHE_TTL_MS) {
    _collectionCache.delete(key);
    return null;
  }
  return hit.items;
}
function cacheSet(key, items) {
  _collectionCache.set(key, { at: Date.now(), items });
}
export function invalidateCollectionCache() { _collectionCache.clear(); }

export default function CollectionList({ node, renderChild, components }) {
  const attrs = node?.attributes || {};
  const slug = String(attrs.collection_slug || '').trim();
  const limit = parsePositiveInt(attrs.limit, 8);
  const order = parseOrderBy(attrs.order_by);
  const filterRaw = String(attrs.filter || '').trim();
  const filterPairs = parseFilter(filterRaw);
  const template = (node.children || [])[0] || null;

  const [state, setState] = useState(() => {
    if (!slug) return { status: 'missing-slug', items: [], error: '' };
    const cached = cacheGet(cacheKey(slug, limit, order, filterRaw));
    return cached
      ? { status: 'ready', items: cached, error: '' }
      : { status: 'idle', items: [], error: '' };
  });

  useEffect(() => {
    if (!slug) {
      setState({ status: 'missing-slug', items: [], error: '' });
      return;
    }
    const key = cacheKey(slug, limit, order, filterRaw);
    const cached = cacheGet(key);
    if (cached) {
      setState({ status: 'ready', items: cached, error: '' });
      return;
    }
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, status: 'loading' }));
      try {
        const { data: col, error: colErr } = await supabase
          .from('store_collections')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (colErr) throw colErr;
        if (!col) {
          if (!cancelled) setState({ status: 'missing-collection', items: [], error: '' });
          return;
        }
        let query = supabase
          .from('store_collection_items')
          .select('*')
          .eq('collection_id', col.id)
          .eq('status', 'published')
          .order(order.column, { ascending: order.ascending })
          .limit(limit);
        for (const [k, v] of filterPairs) {
          // PostgREST `data->>key=eq.value`. Values come straight from
          // the attribute; Supabase parameterises them so SQLi is a
          // non-concern. Booleans come through as the literal strings
          // "true" / "false" which is what json ->> returns anyway.
          query = query.filter(`data->>${k}`, 'eq', v);
        }
        const { data, error } = await query;
        if (error) throw error;
        const items = data || [];
        cacheSet(key, items);
        if (!cancelled) setState({ status: 'ready', items, error: '' });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: 'error',
            items: [],
            error: e.message || String(e),
          });
        }
      }
    })();
    return () => { cancelled = true; };
    // filterPairs is derived each render; filterRaw is the stable key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, limit, order.column, order.ascending, filterRaw]);

  const Tag = 'section';
  const className = (node.classes || []).join(' ') || undefined;
  const renderAttrs = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    // Strip template-only attributes from the wrapper so they don't
    // end up as spurious DOM attributes at runtime.
    if (k === 'collection_slug' || k === 'limit' || k === 'order_by' || k === 'filter') continue;
    renderAttrs[k] = v;
  }

  if (!template) {
    return (
      <Tag className={className} {...renderAttrs}>
        {/* No template yet — staff hasn't configured the row. */}
      </Tag>
    );
  }

  if (state.status === 'loading' || state.status === 'idle') {
    return <Tag className={className} {...renderAttrs} />;
  }
  if (state.status === 'missing-slug' || state.status === 'missing-collection') {
    return (
      <Tag className={className} {...renderAttrs}>
        <div style={{
          padding: '18px 20px', background: '#FEF3C7',
          border: '1px dashed #F59E0B', color: '#92400E',
          fontSize: '13px', borderRadius: '4px',
          fontFamily: 'ui-monospace, monospace',
        }}>
          Collection "{slug || '(none)'}" not found. Add it in the CMS panel of the editor.
        </div>
      </Tag>
    );
  }
  if (state.status === 'error') {
    return (
      <Tag className={className} {...renderAttrs}>
        <div style={{ padding: '12px 14px', color: '#b91c1c', fontSize: '13px' }}>
          Couldn't load items: {state.error}
        </div>
      </Tag>
    );
  }

  return (
    <Tag className={className} {...renderAttrs}>
      {state.items.length === 0 ? (
        <div style={{
          padding: '18px 20px', color: '#6B7280', fontSize: '13px',
          fontStyle: 'italic',
        }}>
          No items published in this collection yet.
        </div>
      ) : (
        state.items.map((item, i) => {
          const stamped = stampTemplate(template, item, i);
          if (!stamped) return null;
          return (
            <React.Fragment key={item.id || i}>
              {renderChild(stamped, { components })}
            </React.Fragment>
          );
        })
      )}
    </Tag>
  );
}
