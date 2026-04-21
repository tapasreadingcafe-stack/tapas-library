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

export default function CollectionList({ node, renderChild, components }) {
  const attrs = node?.attributes || {};
  const slug = String(attrs.collection_slug || '').trim();
  const limit = parsePositiveInt(attrs.limit, 8);
  const order = parseOrderBy(attrs.order_by);
  const template = (node.children || [])[0] || null;

  const [state, setState] = useState({ status: 'idle', items: [], error: '' });

  useEffect(() => {
    if (!slug) {
      setState({ status: 'missing-slug', items: [], error: '' });
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
        const { data, error } = await supabase
          .from('store_collection_items')
          .select('*')
          .eq('collection_id', col.id)
          .eq('status', 'published')
          .order(order.column, { ascending: order.ascending })
          .limit(limit);
        if (error) throw error;
        if (!cancelled) setState({ status: 'ready', items: data || [], error: '' });
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
  }, [slug, limit, order.column, order.ascending]);

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
