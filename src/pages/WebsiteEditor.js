// =====================================================================
// WebsiteEditor  —  /store/content-v2
//
// Webflow-parity editor shell. Phase 1 of Path A: this file owns the
// three-panel chrome (top bar, left rail, navigator, canvas, right
// panel) and nothing else. Selection, style panel, drag-drop, etc.
// are stubs — spec § 1 forbids feature work this phase.
//
// Reads from Supabase app_settings.store_content_v2 (populated by
// scripts/migrateBlocksToTree.mjs). Never writes; that lands in Phase 2.
//
// The legacy editor at /store/content keeps working while this route
// is under construction.
// =====================================================================

import React, { useEffect, useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Node as TreeNode } from './WebsiteEditor.node';
import { compileClassesToCSS } from './WebsiteEditor.css';
import {
  flattenTree, pathToNode, findNode, parentOf, firstChildOf,
  prevInFlat, nextInFlat, labelOf,
} from './WebsiteEditor.tree';
import {
  ensureNodeClass, setClassStyle, setClassBreakpointStyle, renameClass,
  setNodeTag, setNodeAttribute, renameNodeAttribute, setNodeTextContent,
  insertNode, duplicateNode, removeNode,
  insertNodeAfter, insertNodeBefore,
  cloneWithFreshIds, siblingOf,
  createPage,
} from './WebsiteEditor.mutations';
import { BLOCK_CATALOGUE } from './WebsiteEditor.library';
import { ANIM_CSS } from './WebsiteEditor.anim';
import StylePanel from './WebsiteEditor.style';
import SettingsPanel from './WebsiteEditor.settings';
import AddPanel from './WebsiteEditor.add';
import InteractionsPanel from './WebsiteEditor.interactions';

// =====================================================================
// Webflow palette — pulled straight from the spec. Every pixel and
// hex here is intentional; adjust only in polish passes, not ad-hoc.
// =====================================================================
const W = {
  // Chrome
  topbarBg:     '#1e1e1e',
  topbarBorder: '#2a2a2a',
  railBg:       '#1a1a1a',
  navBg:        '#2a2a2a',
  canvasBg:     '#3a3a3a',
  panelBg:      '#252525',
  panelBorder:  '#2a2a2a',
  // Text
  text:         '#e5e5e5',
  textDim:      '#a0a0a0',
  textFaint:    '#6a6a6a',
  // Accent — Webflow blue
  accent:       '#146ef5',
  accentDim:    '#146ef522',
  // States
  hoverBg:      '#333',
  selectionBg:  '#2b6fd6',
  // Typography
  labelSize:    '11px',
  labelLetter:  '0.05em',
};

// =====================================================================
// Top bar  —  spec § 1: 48 px tall, 4 tabs, breadcrumb, Publish
// =====================================================================
function TopBar({ breadcrumb, onBreadcrumbClick, page, onPageChange, onCreatePage, pages }) {
  return (
    <div style={{
      height: '48px', flexShrink: 0,
      background: W.topbarBg,
      borderBottom: `1px solid ${W.topbarBorder}`,
      display: 'flex', alignItems: 'center',
      color: W.text, fontSize: '12px',
    }}>
      {/* Logo slot — left edge */}
      <div style={{
        width: '48px', height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#111', borderRight: `1px solid ${W.topbarBorder}`,
      }}>
        <span style={{ color: W.accent, fontSize: '16px', fontWeight: 700 }}>◼</span>
      </div>
      {/* 4 top tabs */}
      <div style={{ display: 'flex', height: '100%' }}>
        {['Design', 'CMS', 'App Gen', 'Insights'].map((t, i) => (
          <button key={t}
            style={{
              height: '100%', padding: '0 16px',
              background: i === 0 ? '#111' : 'transparent',
              color: i === 0 ? W.text : W.textDim,
              border: 'none', borderBottom: i === 0 ? `2px solid ${W.accent}` : '2px solid transparent',
              cursor: 'pointer', fontSize: '12px', fontWeight: 500,
            }}
          >{t}</button>
        ))}
      </div>
      {/* Breadcrumb centered */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: '4px',
        padding: '0 16px', overflow: 'hidden',
        fontSize: '11px', color: W.textDim,
      }}>
        {breadcrumb.length === 0 && (
          <span style={{ color: W.textFaint, fontSize: '11px' }}>(no selection)</span>
        )}
        {breadcrumb.map((seg, i) => {
          const isLast = i === breadcrumb.length - 1;
          return (
            <React.Fragment key={seg.id || i}>
              {i > 0 && <span style={{ color: W.textFaint }}>›</span>}
              <button
                onClick={() => onBreadcrumbClick && onBreadcrumbClick(seg.id)}
                style={{
                  padding: '3px 7px', borderRadius: '3px',
                  background: isLast ? W.accentDim : 'transparent',
                  color: isLast ? W.accent : W.textDim,
                  fontFamily: 'ui-monospace, monospace',
                  whiteSpace: 'nowrap',
                  border: 'none', cursor: 'pointer',
                  fontSize: '11px',
                }}
                onMouseEnter={(e) => { if (!isLast) e.currentTarget.style.color = W.text; }}
                onMouseLeave={(e) => { if (!isLast) e.currentTarget.style.color = W.textDim; }}
              >{seg.label}</button>
            </React.Fragment>
          );
        })}
      </div>
      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}>
        <select
          value={page}
          onChange={(e) => onPageChange(e.target.value)}
          style={{
            height: '26px', padding: '0 8px',
            background: '#111', color: W.text,
            border: `1px solid ${W.topbarBorder}`, borderRadius: '3px',
            fontSize: '11px', cursor: 'pointer',
          }}
        >
          {pages.map(p => (
            <option key={p.key} value={p.key}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={onCreatePage}
          title="Create a new page"
          style={{
            height: '26px', padding: '0 9px',
            background: '#111', color: W.text,
            border: `1px solid ${W.topbarBorder}`, borderRadius: '3px',
            cursor: 'pointer', fontSize: '13px', lineHeight: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.accent; e.currentTarget.style.color = W.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.topbarBorder; e.currentTarget.style.color = W.text; }}
        >+</button>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: W.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700,
        }}>T</div>
        <button style={{
          height: '26px', padding: '0 14px',
          background: 'transparent', color: W.text,
          border: `1px solid ${W.topbarBorder}`, borderRadius: '3px',
          cursor: 'pointer', fontSize: '11px',
        }}>Share</button>
        <button style={{
          height: '26px', padding: '0 14px',
          background: W.accent, color: '#fff',
          border: 'none', borderRadius: '3px',
          cursor: 'pointer', fontSize: '11px', fontWeight: 600,
        }}>Publish</button>
      </div>
    </div>
  );
}

// =====================================================================
// Left rail  —  spec § 1: 48 px icon strip, #146ef5 active accent
// =====================================================================
const RAIL_ICONS = [
  { key: 'add',          label: 'Add',          glyph: '+' },
  { key: 'pages',        label: 'Pages',        glyph: '▤' },
  { key: 'navigator',    label: 'Navigator',    glyph: '▣' },
  { key: 'components',   label: 'Components',   glyph: '◆' },
  { key: 'styleguide',   label: 'Styleguide',   glyph: 'S' },
  { key: 'assets',       label: 'Assets',       glyph: '▸' },
  { key: 'interactions', label: 'Interactions', glyph: '⚡' },
  { key: 'variables',    label: 'Variables',    glyph: 'V' },
  { key: 'cms',          label: 'CMS',          glyph: '▦' },
  { key: 'ecommerce',    label: 'Ecommerce',    glyph: '$' },
  { key: 'accounts',     label: 'Accounts',     glyph: '◉' },
  { key: 'apps',         label: 'Apps',         glyph: '▥' },
];
const RAIL_FOOTER = [
  { key: 'settings', label: 'Settings', glyph: '⚙' },
  { key: 'search',   label: 'Search',   glyph: '⌕' },
  { key: 'help',     label: 'Help',     glyph: '?' },
];

function LeftRail({ active, onChange }) {
  const item = (ico) => {
    const isActive = ico.key === active;
    return (
      <button key={ico.key}
        onClick={() => onChange(ico.key)}
        title={ico.label}
        style={{
          width: '48px', height: '44px', padding: 0,
          background: isActive ? '#222' : 'transparent',
          color: isActive ? W.accent : W.textDim,
          border: 'none',
          borderLeft: isActive ? `2px solid ${W.accent}` : '2px solid transparent',
          cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: 500,
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = W.hoverBg; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >{ico.glyph}</button>
    );
  };
  return (
    <div style={{
      width: '48px', flexShrink: 0,
      background: W.railBg,
      borderRight: `1px solid ${W.topbarBorder}`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1 }}>{RAIL_ICONS.map(item)}</div>
      <div>{RAIL_FOOTER.map(item)}</div>
    </div>
  );
}

// =====================================================================
// Navigator  —  spec § 1: 240 px, element tree. Phase 1 = read-only.
// =====================================================================
function Navigator({ tree, selectedId, onSelect }) {
  const rows = useMemo(() => flattenTree(tree), [tree]);
  const selectedRef = useRef(null);

  // Scroll the selected row into view whenever selection changes —
  // covers clicks on canvas and Esc/Enter/Arrow key moves.
  useEffect(() => {
    if (selectedId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedId]);

  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: W.navBg,
      borderRight: `1px solid ${W.topbarBorder}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        height: '32px', flexShrink: 0,
        padding: '0 12px',
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${W.topbarBorder}`,
        color: W.textDim, fontSize: W.labelSize, fontWeight: 600,
        letterSpacing: W.labelLetter, textTransform: 'uppercase',
      }}>Navigator</div>
      {/* Tree list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {rows.length === 0 && (
          <div style={{ padding: '24px 12px', fontSize: '11px', color: W.textFaint, textAlign: 'center' }}>
            Empty page
          </div>
        )}
        {rows.map(({ node, depth }) => {
          const isSelected = node.id === selectedId;
          const label = node.classes?.[0] || node.tag || 'unnamed';
          return (
            <button key={node.id}
              ref={isSelected ? selectedRef : null}
              onClick={() => onSelect(node.id)}
              style={{
                width: '100%', height: '26px',
                paddingLeft: `${8 + depth * 16}px`, paddingRight: '12px',
                display: 'flex', alignItems: 'center', gap: '6px',
                background: isSelected ? W.selectionBg : 'transparent',
                color: isSelected ? '#fff' : W.text,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: '11.5px',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = W.hoverBg; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '10px', color: isSelected ? '#fff' : W.textFaint }}>
                {tagGlyph(node.tag)}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function tagGlyph(tag) {
  switch (tag) {
    case 'body':    return '▢';
    case 'section': return '▦';
    case 'div':     return '▫';
    case 'a':       return '⚲';
    case 'img':     return '◪';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
    case 'p':   return 'T';
    case 'button': case 'input': case 'form': return '⊞';
    default: return '▫';
  }
}

// =====================================================================
// Canvas  —  spec § 1: rendered page + device/zoom toolbar
// =====================================================================
const DEVICES = [
  { key: 'desktop',  label: 'Desktop',  width: '100%',   glyph: '▭' },
  { key: 'tablet',   label: 'Tablet',   width: '768px',  glyph: '▯' },
  { key: 'mobileL',  label: 'Mobile L', width: '600px',  glyph: '▯' },
  { key: 'mobileP',  label: 'Mobile P', width: '375px',  glyph: '▯' },
];

// Tags the Node renderer treats as void — a drop INSIDE them is
// nonsensical, so the drag handler rewrites "inside" to before/after
// when the cursor is over one of these.
const VOID_DROP_TAGS = new Set([
  'img', 'input', 'br', 'hr', 'video', 'audio', 'source',
  'area', 'embed', 'iframe',
]);

function Canvas({
  tree, classes, selectedId, onSelect, device, onDeviceChange,
  onDropBlock,
  editingNodeId, onStartEdit, onCommitEdit, onCancelEdit,
}) {
  const setDevice = onDeviceChange;
  const [zoom, setZoom] = useState(100);
  const [hoverId, setHoverId] = useState(null);
  const [dropHover, setDropHover] = useState(null); // { targetId, position }
  const vp = DEVICES.find(d => d.key === device) || DEVICES[0];
  const cssText = useMemo(() => compileClassesToCSS(classes || {}), [classes]);
  const surfaceRef = useRef(null);

  // Phase-8 runtime. For every element with data-tapas-anim:
  //   - mirror its timing data-* attributes into CSS variables so
  //     the ANIM_CSS var() lookups resolve;
  //   - observe the element; when it intersects the viewport, flip
  //     data-tapas-anim-in which triggers the keyframe animation.
  //
  // Re-runs on every tree change so newly added / reconfigured nodes
  // are picked up. Hover effects are pure CSS and need no JS hookup.
  useEffect(() => {
    if (!surfaceRef.current) return;
    const surface = surfaceRef.current;
    const els = surface.querySelectorAll('[data-tapas-anim]');
    els.forEach((el) => {
      const setVar = (attr, cssVar) => {
        const v = el.getAttribute(attr);
        if (v) el.style.setProperty(cssVar, v);
        else el.style.removeProperty(cssVar);
      };
      setVar('data-tapas-anim-duration', '--tapas-anim-duration');
      setVar('data-tapas-anim-delay',    '--tapas-anim-delay');
      setVar('data-tapas-anim-easing',   '--tapas-anim-easing');
    });

    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          // Sticky — fires once and stays, matching Webflow's default.
          e.target.setAttribute('data-tapas-anim-in', '');
        }
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tree]);

  // Walk from the event target up to the nearest node element, then
  // classify the cursor's vertical band into before / after / inside.
  // Returns null if the cursor isn't over any node (drop falls back
  // to append-to-root in the caller).
  const classifyDropTarget = (e) => {
    let el = e.target;
    while (el && el !== e.currentTarget) {
      if (el.dataset?.tapasNodeId) break;
      el = el.parentElement;
    }
    if (!el || el === e.currentTarget) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.height) return null;
    const relY = (e.clientY - rect.top) / rect.height;
    const tag = el.tagName.toLowerCase();
    const isVoid = VOID_DROP_TAGS.has(tag);
    let position;
    if (isVoid) position = relY < 0.5 ? 'before' : 'after';
    else if (relY < 0.25)      position = 'before';
    else if (relY > 0.75)      position = 'after';
    else                       position = 'inside';
    return { targetId: el.dataset.tapasNodeId, position };
  };

  const handleDragOver = (e) => {
    // Only accept drops carrying our custom type — other drag payloads
    // (text selection, file drop) pass through.
    const types = e.dataTransfer?.types;
    if (!types || !(types.contains ? types.contains('application/x-tapas-block') : Array.from(types).includes('application/x-tapas-block'))) {
      // Firefox's DataTransferItemList has contains(); Chrome has an array.
      if (!Array.from(types || []).includes('application/x-tapas-block')) return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const next = classifyDropTarget(e);
    setDropHover(next);
  };

  const handleDragLeave = (e) => {
    // Keep the indicator while moving between descendant elements.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropHover(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const blockKey =
      e.dataTransfer.getData('application/x-tapas-block') ||
      e.dataTransfer.getData('text/plain');
    const target = dropHover;
    setDropHover(null);
    if (!blockKey) return;
    if (!target) { onDropBlock?.(blockKey, null, 'append'); return; }
    onDropBlock?.(blockKey, target.targetId, target.position);
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: W.canvasBg, overflow: 'hidden',
    }}>
      {/* Secondary toolbar — device + zoom + preview + grid */}
      <div style={{
        height: '36px', flexShrink: 0,
        background: W.topbarBg,
        borderBottom: `1px solid ${W.topbarBorder}`,
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '0 12px',
      }}>
        <div style={{ display: 'flex', gap: '2px', background: W.railBg, padding: '2px', borderRadius: '4px' }}>
          {DEVICES.map(d => (
            <button key={d.key}
              onClick={() => setDevice(d.key)}
              title={d.label}
              style={{
                width: '28px', height: '22px', padding: 0,
                background: device === d.key ? W.panelBg : 'transparent',
                color: device === d.key ? W.accent : W.textDim,
                border: 'none', borderRadius: '3px', cursor: 'pointer',
                fontSize: '11px',
              }}
            >{d.glyph}</button>
          ))}
        </div>
        <div style={{ width: '1px', height: '16px', background: W.topbarBorder, margin: '0 6px' }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: W.textDim, fontSize: '11px',
        }}>
          <button
            onClick={() => setZoom(z => Math.max(25, z - 25))}
            style={{ width: '20px', height: '20px', background: 'transparent', color: W.textDim, border: 'none', cursor: 'pointer' }}
          >−</button>
          <span style={{ minWidth: '36px', textAlign: 'center' }}>{zoom}%</span>
          <button
            onClick={() => setZoom(z => Math.min(200, z + 25))}
            style={{ width: '20px', height: '20px', background: 'transparent', color: W.textDim, border: 'none', cursor: 'pointer' }}
          >+</button>
        </div>
        <div style={{ flex: 1 }} />
        <button style={toolbarBtn(W)} title="Preview">◉</button>
        <button style={toolbarBtn(W)} title="Grid overlay">▦</button>
      </div>
      {/* Canvas surface */}
      <div
        ref={surfaceRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          flex: 1, overflow: 'auto', position: 'relative',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '24px',
        }}
      >
        <div style={{
          width: vp.width, maxWidth: '100%',
          transform: `scale(${zoom / 100})`, transformOrigin: 'top center',
          background: '#fff', minHeight: '80vh',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.3)',
          transition: 'width 0.15s ease',
          position: 'relative',
        }}>
          <style>{ANIM_CSS}{cssText}</style>
          <CanvasSelectionShell
            tree={tree}
            selectedId={selectedId}
            onSelect={onSelect}
            onHover={setHoverId}
            editingNodeId={editingNodeId}
            onStartEdit={onStartEdit}
            onCommitText={onCommitEdit}
            onCancelEdit={onCancelEdit}
          />
        </div>
        {/* Overlays live in surface space so they scroll with the
            canvas. Rect measurements already account for the zoom
            transform because getBoundingClientRect returns visual
            pixels. While an inline edit is active, both overlays
            hide so they don't obscure the caret. */}
        <SelectionOverlay
          targetId={editingNodeId ? null : selectedId}
          surfaceRef={surfaceRef}
          tree={tree}
          kind="selected"
        />
        <SelectionOverlay
          targetId={!editingNodeId && hoverId && hoverId !== selectedId ? hoverId : null}
          surfaceRef={surfaceRef}
          tree={tree}
          kind="hover"
        />
        <DropIndicator
          drop={dropHover}
          surfaceRef={surfaceRef}
        />
      </div>
    </div>
  );
}

// =====================================================================
// Selection / hover overlay  —  spec § 2
// A 1px outline positioned absolutely over the canvas surface. Uses
// getBoundingClientRect on a data-tapas-node-id element, converted into
// surface-local coords. Re-measures on scroll, resize, and whenever the
// target changes.
// =====================================================================
function SelectionOverlay({ targetId, surfaceRef, tree, kind }) {
  const [rect, setRect] = useState(null);
  const [nodeLabel, setNodeLabel] = useState('');

  const measure = useCallback(() => {
    if (!targetId || !surfaceRef.current) { setRect(null); return; }
    const el = surfaceRef.current.querySelector(
      `[data-tapas-node-id="${targetId}"]`
    );
    if (!el) { setRect(null); return; }
    const er = el.getBoundingClientRect();
    const sr = surfaceRef.current.getBoundingClientRect();
    setRect({
      top: er.top - sr.top + surfaceRef.current.scrollTop,
      left: er.left - sr.left + surfaceRef.current.scrollLeft,
      width: er.width,
      height: er.height,
    });
    const n = findNode(tree, targetId);
    setNodeLabel(n ? labelOf(n) : '');
  }, [targetId, surfaceRef, tree]);

  useLayoutEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    if (!targetId) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const onScroll = () => measure();
    surface.addEventListener('scroll', onScroll);
    window.addEventListener('resize', measure);
    // Re-measure after layout settles — fonts, images, etc.
    const t = setTimeout(measure, 50);
    return () => {
      surface.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [targetId, surfaceRef, measure]);

  if (!rect) return null;

  const color = '#146ef5';
  const isSelected = kind === 'selected';

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: rect.top, left: rect.left,
          width: rect.width, height: rect.height,
          outline: `1px ${isSelected ? 'solid' : 'dashed'} ${color}`,
          outlineOffset: '-1px',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      {isSelected && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: rect.top - 18, left: rect.left,
            background: color, color: '#fff',
            fontSize: '11px', fontWeight: 500,
            letterSpacing: '0.01em',
            padding: '2px 6px',
            borderRadius: '2px 2px 0 0',
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 11,
          }}
        >{nodeLabel || 'element'}</div>
      )}
    </>
  );
}

function toolbarBtn(W) {
  return {
    width: '28px', height: '22px', padding: 0,
    background: 'transparent', color: W.textDim,
    border: 'none', borderRadius: '3px', cursor: 'pointer',
    fontSize: '12px',
  };
}

// Canvas click/hover dispatcher. Walks up from the event target to the
// nearest element with data-tapas-node-id; reports click → onSelect,
// mouseover → onHover, and null-out on mouseleave so the dashed overlay
// disappears when the cursor leaves the canvas.
// Drag-drop indicator. Two shapes:
//   before / after → thin blue bar across the top / bottom of target
//   inside         → blue dashed outline over the whole target rect
// Measures identically to SelectionOverlay so coordinates account for
// canvas zoom and scroll.
function DropIndicator({ drop, surfaceRef }) {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!drop?.targetId || !surfaceRef.current) { setRect(null); return; }
    const el = surfaceRef.current.querySelector(
      `[data-tapas-node-id="${drop.targetId}"]`
    );
    if (!el) { setRect(null); return; }
    const er = el.getBoundingClientRect();
    const sr = surfaceRef.current.getBoundingClientRect();
    setRect({
      top: er.top - sr.top + surfaceRef.current.scrollTop,
      left: er.left - sr.left + surfaceRef.current.scrollLeft,
      width: er.width,
      height: er.height,
    });
  }, [drop, surfaceRef]);

  if (!drop || !rect) return null;
  const color = '#146ef5';
  const { position } = drop;

  if (position === 'inside') {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: rect.top, left: rect.left,
          width: rect.width, height: rect.height,
          outline: `2px dashed ${color}`,
          outlineOffset: '-2px',
          background: 'rgba(20,110,245,0.08)',
          pointerEvents: 'none',
          zIndex: 12,
        }}
      />
    );
  }

  const barTop = position === 'before' ? rect.top - 1 : rect.top + rect.height - 1;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: barTop, left: rect.left,
        width: rect.width, height: '2px',
        background: color,
        boxShadow: `0 0 0 2px ${color}33`,
        pointerEvents: 'none',
        zIndex: 12,
      }}
    />
  );
}

function CanvasSelectionShell({
  tree, selectedId, onSelect, onHover,
  editingNodeId, onStartEdit, onCommitText, onCancelEdit,
}) {
  const nearestNodeId = (target, stopAt) => {
    let el = target;
    while (el && el !== stopAt) {
      if (el.dataset?.tapasNodeId) return el.dataset.tapasNodeId;
      el = el.parentElement;
    }
    return null;
  };
  const onClick = (e) => {
    // Clicks inside the editable element are already stopped by
    // EditableText; this only fires for clicks elsewhere on the canvas.
    const id = nearestNodeId(e.target, e.currentTarget);
    if (id) { onSelect(id); e.preventDefault(); e.stopPropagation(); }
  };
  const onDoubleClick = (e) => {
    // Double-click enters inline edit mode. Only text-leaf-ish nodes
    // (those without children) get editable; the Node renderer gates
    // non-leaves, but we still fire onStartEdit for the id closest to
    // the cursor and let Node decide.
    if (!onStartEdit) return;
    const id = nearestNodeId(e.target, e.currentTarget);
    if (id) { onStartEdit(id); e.preventDefault(); e.stopPropagation(); }
  };
  const onMouseOver = (e) => {
    const id = nearestNodeId(e.target, e.currentTarget);
    if (onHover) onHover(id);
  };
  const onMouseLeave = () => { if (onHover) onHover(null); };
  return (
    <div onClick={onClick} onDoubleClick={onDoubleClick} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}>
      <TreeNode
        node={tree}
        selectedId={selectedId}
        editingNodeId={editingNodeId}
        onCommitText={onCommitText}
        onCancelEdit={onCancelEdit}
      />
    </div>
  );
}

// =====================================================================
// Right panel  —  spec § 1: 280 px, Style / Settings / Interactions tabs
// Style tab is live in Phase 3. Settings + Interactions still stubbed.
// =====================================================================
function RightPanel({
  selectedNode, className, classDef,
  state, onStateChange,
  device,
  onCreateClass, onRenameClass, onSetStyle,
  onSetTag, onSetAttribute, onRenameAttribute,
}) {
  const [tab, setTab] = useState('style');
  const tabs = [
    { key: 'style',        label: 'Style' },
    { key: 'settings',     label: 'Settings' },
    { key: 'interactions', label: 'Interactions' },
  ];
  return (
    <div style={{
      width: '280px', flexShrink: 0,
      background: W.panelBg,
      borderLeft: `1px solid ${W.panelBorder}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${W.panelBorder}` }}>
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, height: '32px',
              background: 'transparent',
              color: tab === t.key ? W.text : W.textDim,
              border: 'none',
              borderBottom: tab === t.key ? `2px solid ${W.accent}` : '2px solid transparent',
              cursor: 'pointer',
              fontSize: W.labelSize, fontWeight: 600,
              letterSpacing: W.labelLetter, textTransform: 'uppercase',
            }}
          >{t.label}</button>
        ))}
      </div>
      {/* Selection strip */}
      <div style={{
        padding: '10px 12px',
        borderBottom: `1px solid ${W.panelBorder}`,
        color: W.textDim, fontSize: '11px',
        fontFamily: 'ui-monospace, monospace',
      }}>
        {selectedNode
          ? <>{selectedNode.tag}{selectedNode.classes?.[0] ? `.${selectedNode.classes[0]}` : ''}</>
          : <span style={{ color: W.textFaint }}>Select an element on the canvas</span>}
      </div>
      {/* Tab body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'style' && (
          <StylePanel
            node={selectedNode}
            className={className}
            classDef={classDef}
            state={state}
            onStateChange={onStateChange}
            device={device}
            onCreateClass={onCreateClass}
            onRenameClass={onRenameClass}
            onSetStyle={onSetStyle}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            node={selectedNode}
            onSetTag={onSetTag}
            onSetAttribute={onSetAttribute}
            onRenameAttribute={onRenameAttribute}
          />
        )}
        {tab === 'interactions' && (
          <InteractionsPanel
            node={selectedNode}
            onSetAttribute={onSetAttribute}
          />
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Page  —  loads v2 content, wires the four panels together
// =====================================================================
const V2_KEY = 'store_content_v2';

export default function WebsiteEditor() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [pageKey, setPageKey] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [railActive, setRailActive] = useState('navigator');
  const [styleState, setStyleState] = useState('base');
  // Active breakpoint / device frame. Drives both the canvas width and
  // where style writes land (desktop → styles.<state>, others →
  // breakpoints.<bp>). Lives on the main editor so the Style panel can
  // read from the right bucket.
  const [device, setDevice] = useState('desktop');
  // Inline text edit. When set, the Node renderer makes that node's
  // element contentEditable and hides the selection/hover overlays so
  // the caret isn't obscured. Commit on blur / Enter, cancel on Esc.
  const [editingNodeId, setEditingNodeId] = useState(null);

  const loadedRef = useRef(null);      // last server blob we loaded (no re-save)
  const saveTimerRef = useRef(null);

  // Undo/redo history. Snapshot-based, capped at 50 entries each way.
  // Autosave still observes content changes identically — undoing just
  // flips content to a prior snapshot and the next debounced save
  // persists it. No server-side history; this is purely client-local.
  const historyRef = useRef({ past: [], future: [] });
  const HISTORY_CAP = 50;
  const clipboardRef = useRef(null);   // last Cmd+C'd node subtree

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const { data, error: err } = await supabase
          .from('app_settings').select('value').eq('key', V2_KEY).maybeSingle();
        if (err) throw err;
        if (!data?.value) {
          throw new Error(`No ${V2_KEY} row. Run scripts/migrateBlocksToTree.mjs.`);
        }
        setContent(data.value);
        loadedRef.current = data.value;
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- Autosave: debounced upsert back to app_settings.store_content_v2 --
  // Mirrors the legacy editor's pattern: 900 ms after the last edit, push
  // the whole blob. Skips if we haven't drifted from what we loaded.
  useEffect(() => {
    if (loading || !content) return;
    if (content === loadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true); setSaveError('');
      try {
        const { error: err } = await supabase.from('app_settings').upsert({
          key: V2_KEY, value: content, updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
        if (err) throw err;
        loadedRef.current = content;
      } catch (err) {
        setSaveError(err.message || 'Failed to save.');
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [content, loading]);

  const pages = useMemo(() => {
    if (!content?.pages) return [];
    return Object.entries(content.pages).map(([key, p]) => ({ key, name: p.name || key }));
  }, [content]);

  const tree = content?.pages?.[pageKey]?.tree || null;
  const classes = content?.classes || {};

  const breadcrumb = useMemo(
    () => pathToNode(tree, selectedId),
    [tree, selectedId]
  );
  const selectedNode = useMemo(
    () => findNode(tree, selectedId),
    [tree, selectedId]
  );
  const flat = useMemo(() => flattenTree(tree), [tree]);

  // The Style panel edits the primary class on the selected node. If
  // there isn't one yet, the Selector shows a "give this element a
  // class" CTA (handled below via handleCreateClass).
  const primaryClass = selectedNode?.classes?.[0] || null;
  const classDef = primaryClass ? classes[primaryClass] : null;

  // Core edit wrapper. Every user-initiated mutation flows through
  // here so the history stack stays honest. updater: content → content.
  // If the updater is a no-op (returns the same reference or an equal
  // blob) we skip the history push to avoid dead entries.
  const applyEdit = useCallback((updater) => {
    setContent((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!next || next === prev) return prev;
      const past = historyRef.current.past;
      historyRef.current = {
        past: [...past, prev].slice(-HISTORY_CAP),
        future: [], // any new edit invalidates redo stack
      };
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (past.length === 0) return;
    setContent((prev) => {
      if (!prev) return prev;
      const last = past[past.length - 1];
      historyRef.current = {
        past: past.slice(0, -1),
        future: [prev, ...future].slice(0, HISTORY_CAP),
      };
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return;
    setContent((prev) => {
      if (!prev) return prev;
      const first = future[0];
      historyRef.current = {
        past: [...past, prev].slice(-HISTORY_CAP),
        future: future.slice(1),
      };
      return first;
    });
  }, []);

  const handleCreateClass = useCallback(() => {
    if (!selectedId) return;
    applyEdit((c) => {
      const { content: next } = ensureNodeClass(c, pageKey, selectedId);
      return next;
    });
  }, [selectedId, pageKey, applyEdit]);

  const handleRenameClass = useCallback((newName) => {
    if (!primaryClass || !newName) return;
    applyEdit((c) => renameClass(c, primaryClass, newName));
  }, [primaryClass, applyEdit]);

  // onSet from Layout/Spacing: routes the CSS property/value through
  // the class-only pipeline. Auto-creates a class on the selected node
  // if this is the first style edit (spec § 7).
  // Writes route based on the active device. Desktop → per-state
  // styles (supports :hover, :focused, etc). Non-desktop → a flat
  // StyleBlock under breakpoints.<bp>. This is deliberate: per-state
  // breakpoint overrides aren't in the v2 schema yet, and adding them
  // now costs a migration. Callers (Style panel) already force state
  // back to 'base' when device is non-desktop so this branch is safe.
  const handleSetStyle = useCallback((prop, value) => {
    if (!selectedId) return;
    applyEdit((c) => {
      const { content: withClass, className } = ensureNodeClass(c, pageKey, selectedId);
      if (!className) return c;
      if (device === 'desktop') {
        return setClassStyle(withClass, className, styleState, prop, value);
      }
      return setClassBreakpointStyle(withClass, className, device, prop, value);
    });
  }, [selectedId, pageKey, styleState, device, applyEdit]);

  const handleSetTag = useCallback((tag) => {
    if (!selectedId) return;
    applyEdit((c) => setNodeTag(c, pageKey, selectedId, tag));
  }, [selectedId, pageKey, applyEdit]);

  const handleSetAttribute = useCallback((key, value) => {
    if (!selectedId) return;
    applyEdit((c) => setNodeAttribute(c, pageKey, selectedId, key, value));
  }, [selectedId, pageKey, applyEdit]);

  const handleRenameAttribute = useCallback((oldKey, newKey) => {
    if (!selectedId) return;
    applyEdit((c) => renameNodeAttribute(c, pageKey, selectedId, oldKey, newKey));
  }, [selectedId, pageKey, applyEdit]);

  // Insert a block from the Add panel. For this MVP we always append
  // to the page root; drag-to-precise-position lands in Phase 7b.
  // Selecting the freshly inserted node is a small UX win — it puts
  // the Inspector on the new element so users can style immediately.
  const handleInsertBlock = useCallback((blockKey) => {
    const entry = BLOCK_CATALOGUE.find((b) => b.key === blockKey);
    if (!entry) return;
    const newNode = entry.create();
    applyEdit((c) => insertNode(c, pageKey, null, newNode));
    setSelectedId(newNode.id);
  }, [pageKey, applyEdit]);

  // Drag-drop insert. `position` ∈ { 'before', 'after', 'inside', 'append' }.
  // 'append' is the "dropped on empty canvas" fallback and just pushes
  // onto the page root's children.
  // Inline text editor. handleStartEdit just flips a state flag; the
  // Node renderer does the actual DOM work. handleCommitEdit writes
  // back through applyEdit so it lands on the history stack — so
  // Cmd+Z undoes an inline edit just like any other mutation.
  const handleStartEdit = useCallback((nodeId) => {
    if (!nodeId) return;
    setEditingNodeId(nodeId);
    setSelectedId(nodeId);
  }, []);

  const handleCommitEdit = useCallback((nodeId, text) => {
    if (!nodeId) { setEditingNodeId(null); return; }
    applyEdit((c) => setNodeTextContent(c, pageKey, nodeId, text));
    setEditingNodeId(null);
  }, [pageKey, applyEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  // Create a brand-new v2 page from a user-supplied slug. Uses the
  // native prompt for MVP — a proper modal can land with Phase 10b
  // polish. Normalization and collision detection live in createPage().
  const handleCreatePage = useCallback(() => {
    if (typeof window === 'undefined') return;
    const slugInput = window.prompt(
      'New page slug (e.g. /promo-2026 or /about/team):',
      '/new-page'
    );
    if (!slugInput) return;
    const nameInput = window.prompt(
      'Display name for the new page:',
      ''
    );
    let newKey = null;
    let reason = null;
    applyEdit((c) => {
      const { content: next, key, reason: r } = createPage(c, {
        slug: slugInput,
        name: nameInput || undefined,
      });
      if (key) newKey = key;
      if (r) reason = r;
      return next || c;
    });
    if (reason === 'exists') {
      window.alert(`A page already exists at that slug.`);
      return;
    }
    if (newKey) {
      setPageKey(newKey);
      setSelectedId(null);
    }
  }, [applyEdit]);

  const handleDropBlock = useCallback((blockKey, targetId, position) => {
    const entry = BLOCK_CATALOGUE.find((b) => b.key === blockKey);
    if (!entry) return;
    const newNode = entry.create();
    applyEdit((c) => {
      if (!targetId || position === 'append') {
        return insertNode(c, pageKey, null, newNode);
      }
      if (position === 'inside') {
        return insertNode(c, pageKey, targetId, newNode);
      }
      if (position === 'before') {
        const { content: next } = insertNodeBefore(c, pageKey, targetId, newNode);
        return next;
      }
      // after
      const { content: next } = insertNodeAfter(c, pageKey, targetId, newNode);
      return next;
    });
    setSelectedId(newNode.id);
  }, [pageKey, applyEdit]);

  // --- Phase 9 mutation handlers (duplicate / remove / paste) ---------
  const handleDuplicate = useCallback(() => {
    if (!selectedId || !tree || selectedId === tree.id) return;
    let created = null;
    applyEdit((c) => {
      const { content: next, newId } = duplicateNode(c, pageKey, selectedId);
      if (newId) created = newId;
      return next;
    });
    if (created) setSelectedId(created);
  }, [selectedId, tree, pageKey, applyEdit]);

  const handleDelete = useCallback(() => {
    if (!selectedId || !tree || selectedId === tree.id) return;
    let fallbackParent = null;
    applyEdit((c) => {
      const { content: next, parentId } = removeNode(c, pageKey, selectedId);
      fallbackParent = parentId;
      return next;
    });
    // Move selection to the parent so the Inspector has something to show.
    setSelectedId(fallbackParent);
  }, [selectedId, tree, pageKey, applyEdit]);

  const handleCopy = useCallback(() => {
    if (!selectedId || !tree) return;
    const node = findNode(tree, selectedId);
    if (!node) return;
    // Deep-clone on capture so later edits to the live tree don't
    // mutate the clipboard. Fresh IDs are minted at paste time.
    clipboardRef.current = JSON.parse(JSON.stringify(node));
  }, [selectedId, tree]);

  const handlePaste = useCallback(() => {
    const src = clipboardRef.current;
    if (!src) return;
    const fresh = cloneWithFreshIds(src);
    let created = null;
    applyEdit((c) => {
      if (selectedId && tree && selectedId !== tree.id) {
        // Paste as next sibling of the current selection.
        const { content: next, newId } = insertNodeAfter(c, pageKey, selectedId, fresh);
        if (newId) created = newId;
        return next;
      }
      // Nothing selected (or root) → append to page root.
      created = fresh.id;
      return insertNode(c, pageKey, null, fresh);
    });
    if (created) setSelectedId(created);
  }, [selectedId, tree, pageKey, applyEdit]);

  // Keyboard — spec § 2 + § 10.
  // Selection-only moves (Esc, Enter, Arrow keys, Tab) work without the
  // meta key. Mutation shortcuts require Cmd/Ctrl:
  //   Cmd+Z / Cmd+Shift+Z (or Cmd+Y) — undo / redo
  //   Cmd+D — duplicate selected
  //   Cmd+C / Cmd+V         — copy / paste element
  //   Delete / Backspace    — remove selected
  //
  // Typing inside INPUT / TEXTAREA / contentEditable never hijacks —
  // the Style panel and Settings forms own those keys. Undo/redo still
  // fires inside inputs so Cmd+Z undoes the last tree edit even if
  // the user's focus is in an input; browsers will swallow Cmd+Z for
  // the input's own text history first, which is the right behavior.
  useEffect(() => {
    if (!tree) return;
    const isTyping = (t) =>
      t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;

      // Undo / redo — fires regardless of focus so keyboard still
      // rescues users when they're editing inside the Inspector.
      if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        undo(); e.preventDefault(); return;
      }
      if (mod && ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || e.key === 'y' || e.key === 'Y')) {
        redo(); e.preventDefault(); return;
      }

      // Everything else defers to input focus.
      if (isTyping(e.target)) return;
      if (!selectedId) return;

      // Selection moves (no meta key)
      if (!mod) {
        if (e.key === 'Escape') {
          const p = parentOf(tree, selectedId);
          if (p) { setSelectedId(p.id); e.preventDefault(); }
          return;
        }
        if (e.key === 'Enter') {
          const c = firstChildOf(tree, selectedId);
          if (c) { setSelectedId(c.id); e.preventDefault(); }
          return;
        }
        if (e.key === 'ArrowUp') {
          const p = prevInFlat(flat, selectedId);
          if (p) { setSelectedId(p.id); e.preventDefault(); }
          return;
        }
        if (e.key === 'ArrowDown') {
          const n = nextInFlat(flat, selectedId);
          if (n) { setSelectedId(n.id); e.preventDefault(); }
          return;
        }
        if (e.key === 'Tab') {
          const dir = e.shiftKey ? 'prev' : 'next';
          const sib = siblingOf(content, pageKey, selectedId, dir);
          if (sib) { setSelectedId(sib.id); e.preventDefault(); }
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          handleDelete(); e.preventDefault(); return;
        }
      }

      // Mutation shortcuts (meta + letter)
      if (mod && (e.key === 'd' || e.key === 'D')) {
        handleDuplicate(); e.preventDefault(); return;
      }
      if (mod && (e.key === 'c' || e.key === 'C')) {
        handleCopy(); e.preventDefault(); return;
      }
      if (mod && (e.key === 'v' || e.key === 'V')) {
        handlePaste(); e.preventDefault(); return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tree, flat, selectedId, content, pageKey, undo, redo, handleDelete, handleDuplicate, handleCopy, handlePaste]);

  if (loading) {
    return <div style={fullScreenMessage(W, 'Loading v2 content…')} />;
  }
  if (error) {
    return <div style={fullScreenMessage(W, `⚠ ${error}`)} />;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2001,
      display: 'flex', flexDirection: 'column',
      background: W.canvasBg, color: W.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
    }}>
      <TopBar
        breadcrumb={breadcrumb}
        onBreadcrumbClick={(id) => setSelectedId(id)}
        page={pageKey}
        onPageChange={(k) => { setPageKey(k); setSelectedId(null); }}
        onCreatePage={handleCreatePage}
        pages={pages}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftRail active={railActive} onChange={setRailActive} />
        {railActive === 'add'
          ? <AddPanel onInsert={handleInsertBlock} />
          : <Navigator tree={tree} selectedId={selectedId} onSelect={setSelectedId} />}
        <Canvas
          tree={tree}
          classes={classes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          device={device}
          onDeviceChange={setDevice}
          onDropBlock={handleDropBlock}
          editingNodeId={editingNodeId}
          onStartEdit={handleStartEdit}
          onCommitEdit={handleCommitEdit}
          onCancelEdit={handleCancelEdit}
        />
        <RightPanel
          selectedNode={selectedNode}
          className={primaryClass}
          classDef={classDef}
          state={styleState}
          onStateChange={setStyleState}
          device={device}
          onCreateClass={handleCreateClass}
          onRenameClass={handleRenameClass}
          onSetStyle={handleSetStyle}
          onSetTag={handleSetTag}
          onSetAttribute={handleSetAttribute}
          onRenameAttribute={handleRenameAttribute}
        />
      </div>
      {(saving || saveError) && (
        <div style={{
          position: 'absolute', bottom: 8, right: 12,
          padding: '6px 10px', borderRadius: '4px',
          background: saveError ? '#4b1d1d' : '#1d2a3a',
          color: saveError ? '#ff9a9a' : '#9ccfff',
          fontSize: '11px', fontFamily: 'ui-monospace, monospace',
          border: `1px solid ${saveError ? '#7a2d2d' : '#2a5a8a'}`,
          zIndex: 20,
        }}>
          {saveError ? `⚠ ${saveError}` : 'Saving…'}
        </div>
      )}
    </div>
  );
}

function fullScreenMessage(W, msg) {
  return {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: W.canvasBg, color: W.text, fontSize: '13px',
    fontFamily: 'ui-monospace, monospace',
  };
}
