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
function TopBar({ breadcrumb, onBreadcrumbClick, page, onPageChange, pages }) {
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

function Canvas({ tree, classes, selectedId, onSelect }) {
  const [device, setDevice] = useState('desktop');
  const [zoom, setZoom] = useState(100);
  const [hoverId, setHoverId] = useState(null);
  const vp = DEVICES.find(d => d.key === device) || DEVICES[0];
  const cssText = useMemo(() => compileClassesToCSS(classes || {}), [classes]);
  const surfaceRef = useRef(null);

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
          <style>{cssText}</style>
          <CanvasSelectionShell
            tree={tree}
            selectedId={selectedId}
            onSelect={onSelect}
            onHover={setHoverId}
          />
        </div>
        {/* Overlays live in surface space so they scroll with the
            canvas. Rect measurements already account for the zoom
            transform because getBoundingClientRect returns visual
            pixels. */}
        <SelectionOverlay
          targetId={selectedId}
          surfaceRef={surfaceRef}
          tree={tree}
          kind="selected"
        />
        <SelectionOverlay
          targetId={hoverId && hoverId !== selectedId ? hoverId : null}
          surfaceRef={surfaceRef}
          tree={tree}
          kind="hover"
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
function CanvasSelectionShell({ tree, selectedId, onSelect, onHover }) {
  const nearestNodeId = (target, stopAt) => {
    let el = target;
    while (el && el !== stopAt) {
      if (el.dataset?.tapasNodeId) return el.dataset.tapasNodeId;
      el = el.parentElement;
    }
    return null;
  };
  const onClick = (e) => {
    const id = nearestNodeId(e.target, e.currentTarget);
    if (id) { onSelect(id); e.preventDefault(); e.stopPropagation(); }
  };
  const onMouseOver = (e) => {
    const id = nearestNodeId(e.target, e.currentTarget);
    if (onHover) onHover(id);
  };
  const onMouseLeave = () => { if (onHover) onHover(null); };
  return (
    <div onClick={onClick} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}>
      <TreeNode node={tree} selectedId={selectedId} />
    </div>
  );
}

// =====================================================================
// Right panel  —  spec § 1: 280 px, Style / Settings / Interactions tabs
// Phase 1 stubs each tab with a "coming in phase N" placeholder.
// =====================================================================
function RightPanel({ selectedNode }) {
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
      {/* Tab body — stubs for Phase 1 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', color: W.textDim, fontSize: '11px', lineHeight: 1.6 }}>
        {tab === 'style'        && <div>Selector, Variable modes, Layout, Spacing, Size, Position, Typography, Backgrounds, Borders, Effects land in <b style={{ color: W.text }}>Phase 3–4</b>.</div>}
        {tab === 'settings'     && <div>Tag, ID, attributes, ARIA, link, embed fields land in <b style={{ color: W.text }}>Phase 5</b>.</div>}
        {tab === 'interactions' && <div>Trigger + timeline editor lands in <b style={{ color: W.text }}>Phase 8</b>.</div>}
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
  const [pageKey, setPageKey] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [railActive, setRailActive] = useState('navigator');

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
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  // Keyboard — spec § 2. Selection-only moves ship here; mutation
  // shortcuts (Cmd+D duplicate, Delete, Cmd+Shift+D reset) land with
  // the write pipeline in Phase 3.
  useEffect(() => {
    if (!tree) return;
    const onKey = (e) => {
      // Don't hijack keys while the user is typing in an input.
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      if (!selectedId) return;
      if (e.key === 'Escape') {
        const p = parentOf(tree, selectedId);
        if (p) { setSelectedId(p.id); e.preventDefault(); }
      } else if (e.key === 'Enter') {
        const c = firstChildOf(tree, selectedId);
        if (c) { setSelectedId(c.id); e.preventDefault(); }
      } else if (e.key === 'ArrowUp') {
        const p = prevInFlat(flat, selectedId);
        if (p) { setSelectedId(p.id); e.preventDefault(); }
      } else if (e.key === 'ArrowDown') {
        const n = nextInFlat(flat, selectedId);
        if (n) { setSelectedId(n.id); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tree, flat, selectedId]);

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
        pages={pages}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftRail active={railActive} onChange={setRailActive} />
        <Navigator tree={tree} selectedId={selectedId} onSelect={setSelectedId} />
        <Canvas tree={tree} classes={classes} selectedId={selectedId} onSelect={setSelectedId} />
        <RightPanel selectedNode={selectedNode} />
      </div>
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
