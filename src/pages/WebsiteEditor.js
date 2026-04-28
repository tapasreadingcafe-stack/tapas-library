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
  flattenTree, pathToNode, findNode, findNodeIn, buildNodeIndex,
  parentOf, firstChildOf, prevInFlat, nextInFlat, labelOf,
} from './WebsiteEditor.tree';
import {
  ensureNodeClass, setClassStyle, setClassBreakpointStyle, renameClass,
  setNodeTag, setNodeAttribute, renameNodeAttribute, setNodeTextContent,
  setNodeRuns,
  insertNode, duplicateNode, removeNode,
  insertNodeAfter, insertNodeBefore,
  cloneWithFreshIds, siblingOf,
  createPage, updatePageMeta, deletePage, renamePage,
  classUsageMap, deleteClass, deleteUnusedClasses,
  saveAsComponent, detachComponent, insertComponentInstance,
  renameComponent, deleteComponent, componentUsage,
  getEffectivePage, componentScopeKey,
} from './WebsiteEditor.mutations';
import {
  FloatingTextToolbar, toggleMark, clearFormatting, applyLink,
} from './WebsiteEditor.richtext';
import {
  compileTimeline, parseTimelineAttr, timelineAttrName,
  driveTimeline,
} from './WebsiteEditor.timeline';
import { ensureSiteDefaults } from '../editor/compileBlocksToTree';
import { BLOCK_CATALOGUE } from './WebsiteEditor.library';
import { ANIM_CSS } from './WebsiteEditor.anim';
import StylePanel from './WebsiteEditor.style';
import SettingsPanel from './WebsiteEditor.settings';
import AddPanel from './WebsiteEditor.add';
import InteractionsPanel from './WebsiteEditor.interactions';
import PagePanel from './WebsiteEditor.page';
import PagesPanel from './WebsiteEditor.pages';
import ClassBrowser from './WebsiteEditor.classes';
import {
  InteractionsListPanel,
  VariablesPanel, EcommercePanel,
  SiteSettingsPanel, SearchPanel, HelpPanel, CommandPalette,
} from './WebsiteEditor.stubs';
import AssetsPanel from './WebsiteEditor.assets';
import ComponentsPanel from './WebsiteEditor.components';
import CMSPanel from './WebsiteEditor.cms';
import AccessibilityPanel from './WebsiteEditor.a11y';

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
function TopBar({ breadcrumb, onBreadcrumbClick, page, onPageChange, onCreatePage, onDeletePage, onRenamePage, pages, unsavedCount, onSave, onForceSave, onPublish, saving, savedFlash, conflict }) {
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
      {/* 4 top tabs — only Design ships in this build. The other three
          are placeholders mirrored from the spec; mark them disabled
          until the features actually land so they don't look broken. */}
      <div style={{ display: 'flex', height: '100%' }}>
        {['Design', 'CMS', 'App Gen', 'Insights'].map((t, i) => {
          const active = i === 0;
          return (
            <button key={t}
              disabled={!active}
              title={active ? undefined : `${t} — coming soon`}
              style={{
                height: '100%', padding: '0 16px',
                background: active ? '#111' : 'transparent',
                color: active ? W.text : W.textFaint,
                border: 'none', borderBottom: active ? `2px solid ${W.accent}` : '2px solid transparent',
                cursor: active ? 'pointer' : 'not-allowed',
                fontSize: '12px', fontWeight: 500,
                opacity: active ? 1 : 0.55,
              }}
            >{t}</button>
          );
        })}
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
        {unsavedCount > 0 && (
          <span
            title="Edits pending autosave — saved within 900ms of your last change"
            style={{
              padding: '2px 8px',
              background: 'rgba(20, 110, 245, 0.12)',
              color: W.accent,
              border: `1px solid ${W.accent}`,
              borderRadius: '999px',
              fontSize: '10.5px', fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            {unsavedCount} unsaved {unsavedCount === 1 ? 'edit' : 'edits'}
          </span>
        )}
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
        <button
          onClick={onRenamePage}
          title="Rename this page"
          style={{
            height: '26px', padding: '0 9px',
            background: '#111', color: W.text,
            border: `1px solid ${W.topbarBorder}`, borderRadius: '3px',
            cursor: 'pointer', fontSize: '12px', lineHeight: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.accent; e.currentTarget.style.color = W.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.topbarBorder; e.currentTarget.style.color = W.text; }}
        >✎</button>
        <button
          onClick={onDeletePage}
          disabled={page === 'home'}
          title={page === 'home' ? 'The home page cannot be deleted' : 'Delete this page'}
          style={{
            height: '26px', padding: '0 9px',
            background: '#111',
            color: page === 'home' ? W.textFaint : W.text,
            border: `1px solid ${W.topbarBorder}`, borderRadius: '3px',
            cursor: page === 'home' ? 'not-allowed' : 'pointer',
            fontSize: '12px', lineHeight: 1,
            opacity: page === 'home' ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (page !== 'home') { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.topbarBorder; e.currentTarget.style.color = page === 'home' ? W.textFaint : W.text; }}
        >🗑</button>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: W.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700,
        }}>T</div>
        {conflict ? (
          <>
            <button
              onClick={() => onForceSave && onForceSave()}
              disabled={saving}
              title="Persist this tab's version and discard the other tab's newer changes."
              style={{
                height: '26px', padding: '0 12px',
                background: saving ? 'rgba(239,68,68,0.15)' : '#ef4444',
                color: '#fff',
                border: '1px solid #ef4444', borderRadius: '3px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '11px', fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >{saving ? 'Saving…' : 'Save anyway'}</button>
            <button
              onClick={() => window.location.reload()}
              title="Discard this tab's edits and reload the newer version from the other tab."
              style={{
                height: '26px', padding: '0 12px',
                background: '#b91c1c', color: '#fff',
                border: '1px solid #ef4444', borderRadius: '3px',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
              }}
            >Reload</button>
          </>
        ) : (() => {
          const canSave = unsavedCount > 0 && !saving;
          const label = saving ? 'Saving…' : (savedFlash && unsavedCount === 0 ? 'Saved ✓' : 'Save');
          return (
            <button
              onClick={canSave ? onSave : undefined}
              disabled={!canSave}
              title={unsavedCount > 0 ? 'Save pending edits now (autosave runs every ~1s)' : 'Nothing to save — autosave keeps edits in sync'}
              style={{
                height: '26px', padding: '0 14px',
                background: 'transparent',
                color: canSave ? W.text : W.textFaint,
                border: `1px solid ${canSave ? W.accent : W.topbarBorder}`,
                borderRadius: '3px',
                cursor: canSave ? 'pointer' : 'default',
                fontSize: '11px', fontWeight: 600,
                opacity: canSave || savedFlash ? 1 : 0.7,
              }}
            >{label}</button>
          );
        })()}
        <button
          disabled
          title="Share — coming soon"
          style={{
            height: '26px', padding: '0 14px',
            background: 'transparent', color: W.textFaint,
            border: `1px solid ${W.topbarBorder}`, borderRadius: '3px',
            cursor: 'not-allowed', fontSize: '11px',
            opacity: 0.55,
          }}
        >Share</button>
        <button
          onClick={saving ? undefined : onPublish}
          disabled={saving}
          title={conflict
            ? 'Publish this tab\'s version — overwrites the other tab\'s newer changes.'
            : 'Publish: flushes pending edits to the live storefront.'}
          style={{
            height: '26px', padding: '0 14px',
            background: saving ? 'rgba(20,110,245,0.45)' : (conflict ? '#ef4444' : W.accent),
            color: '#fff',
            border: 'none', borderRadius: '3px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '11px', fontWeight: 600,
            opacity: saving ? 0.7 : 1,
          }}
        >{conflict ? 'Publish anyway' : 'Publish'}</button>
      </div>
    </div>
  );
}

// =====================================================================
// Left rail  —  spec § 1: 48 px icon strip, #146ef5 active accent
// =====================================================================
// Webflow-parity 13-icon rail. Order matches the spec.
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
];
const RAIL_FOOTER = [
  { key: 'a11y',     label: 'Accessibility', glyph: '♿' },
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
  const [collapsed, setCollapsed] = useState(() => new Set());
  const selectedRef = useRef(null);

  // Auto-expand ancestors of the selected node so it stays visible after
  // clicks on canvas or Arrow-key moves. pathToNode is inclusive — drop
  // the last entry so the selected row itself keeps its current state.
  useEffect(() => {
    if (!selectedId || collapsed.size === 0) return;
    const path = pathToNode(tree, selectedId);
    const ancestors = path.slice(0, -1).map(p => p.id);
    let changed = false;
    for (const id of ancestors) if (collapsed.has(id)) { changed = true; break; }
    if (!changed) return;
    setCollapsed(prev => {
      const next = new Set(prev);
      for (const id of ancestors) next.delete(id);
      return next;
    });
  }, [selectedId, tree, collapsed]);

  const rows = useMemo(() => {
    const out = [];
    const rec = (n, depth) => {
      if (!n) return;
      const hasChildren = (n.children?.length || 0) > 0;
      out.push({ node: n, depth, hasChildren });
      if (hasChildren && !collapsed.has(n.id)) {
        for (const c of n.children) rec(c, depth + 1);
      }
    };
    rec(tree, 0);
    return out;
  }, [tree, collapsed]);

  const toggleCollapse = (id) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
        {rows.map(({ node, depth, hasChildren }) => {
          const isSelected = node.id === selectedId;
          const isCollapsed = collapsed.has(node.id);
          const label = node.classes?.[0] || node.tag || 'unnamed';
          return (
            <button key={node.id}
              ref={isSelected ? selectedRef : null}
              onClick={() => onSelect(node.id)}
              style={{
                width: '100%', height: '26px',
                paddingLeft: `${8 + depth * 16}px`, paddingRight: '12px',
                display: 'flex', alignItems: 'center', gap: '4px',
                background: isSelected ? W.selectionBg : 'transparent',
                color: isSelected ? '#fff' : W.text,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: '11.5px',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = W.hoverBg; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <span
                onClick={(e) => { if (hasChildren) { e.stopPropagation(); toggleCollapse(node.id); } }}
                aria-label={hasChildren ? (isCollapsed ? 'Expand' : 'Collapse') : undefined}
                style={{
                  width: '12px', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', lineHeight: 1,
                  color: isSelected ? '#fff' : W.textFaint,
                  cursor: hasChildren ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                {hasChildren ? (isCollapsed ? '▸' : '▾') : ''}
              </span>
              <span style={{ fontSize: '10px', color: isSelected ? '#fff' : W.textFaint, flexShrink: 0 }}>
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

// Grid / flex overlay CSS. Activates only on elements carrying
// data-tapas-grid-overlay (the scanning useEffect sets it whenever
// the toolbar ▦ toggle is on). Draws a subtle accent-colored outline
// on direct children so staff see cell boundaries.
const GRID_OVERLAY_CSS = `
[data-tapas-grid-overlay] {
  outline: 1px dashed rgba(20, 110, 245, 0.55);
  outline-offset: -1px;
}
[data-tapas-grid-overlay] > * {
  outline: 1px dashed rgba(20, 110, 245, 0.35);
  outline-offset: -1px;
}
`;

// Tags the Node renderer treats as void — a drop INSIDE them is
// nonsensical, so the drag handler rewrites "inside" to before/after
// when the cursor is over one of these.
const VOID_DROP_TAGS = new Set([
  'img', 'input', 'br', 'hr', 'video', 'audio', 'source',
  'area', 'embed', 'iframe',
]);

// Escape a value so it can be embedded inside
// `[data-tapas-node-id="…"]` selectors without breaking out of the
// attribute context. Current node ids come from newId() (alphanumeric
// + underscore), so this is mostly insurance against ids pasted from
// other systems or future schema changes. Inside a quoted attribute
// value selector only "\" and '"' need escaping.
function escapeAttrValue(v) {
  return String(v ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function Canvas({
  tree, classes, selectedId, onSelect, device, onDeviceChange,
  onDropBlock, onDropAsset,
  editingNodeId, onStartEdit, onCommitEdit, onCommitRuns, onCancelEdit,
  editableRef, components, onContextMenu, previewSliderId,
  selectedElementSel, onSelectElement,
}) {
  const setDevice = onDeviceChange;
  const [zoom, setZoom] = useState(100);
  const [hoverId, setHoverId] = useState(null);
  const [dropHover, setDropHover] = useState(null); // { targetId, position }
  // Preview interactions — when on, the editor canvas installs the
  // runtime for scroll-drive + mouse triggers so staff can sanity-
  // check parallax / tilt effects. Off by default because drive
  // triggers on the hovered element make it impossible to style
  // (the element tilts away every time you try to click it).
  const [previewInteractions, setPreviewInteractions] = useState(false);
  // Grid overlay — when on, the canvas injects outlines on direct
  // children of every element whose computed display is `grid` or
  // `flex`. Lets staff see row + column layout without inspecting
  // DOM. Toolbar ▦ button toggles it.
  const [gridOverlay, setGridOverlay] = useState(false);
  const vp = DEVICES.find(d => d.key === device) || DEVICES[0];
  const cssText = useMemo(() => compileClassesToCSS(classes || {}), [classes]);
  const surfaceRef = useRef(null);
  // Overlays (selection outline, drop indicator) are mounted inside
  // this ref so they share the zoomed canvas's coord space.
  const canvasInnerRef = useRef(null);

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

    // --- scroll-into-view ----------------------------------------
    const scrollEls = surface.querySelectorAll('[data-tapas-anim]');
    scrollEls.forEach((el) => {
      const setVar = (attr, cssVar) => {
        const v = el.getAttribute(attr);
        if (v) el.style.setProperty(cssVar, v);
        else el.style.removeProperty(cssVar);
      };
      setVar('data-tapas-anim-duration', '--tapas-anim-duration');
      setVar('data-tapas-anim-delay',    '--tapas-anim-delay');
      setVar('data-tapas-anim-easing',   '--tapas-anim-easing');
    });

    let io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute('data-tapas-anim-in', '');
          }
        }
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      scrollEls.forEach((el) => io.observe(el));
    }

    // --- click ---------------------------------------------------
    // One-shot: adds data-tapas-click-playing, removes on animationend.
    // Delegated from the surface so dynamically-added elements don't
    // need re-binding. Capture phase so user-defined click handlers
    // (e.g. navigation <a> clicks) don't stop propagation before us.
    const clickEls = surface.querySelectorAll('[data-tapas-click-anim]');
    clickEls.forEach((el) => {
      const setVar = (attr, cssVar) => {
        const v = el.getAttribute(attr);
        if (v) el.style.setProperty(cssVar, v);
        else el.style.removeProperty(cssVar);
      };
      setVar('data-tapas-click-duration', '--tapas-click-duration');
      setVar('data-tapas-click-easing',   '--tapas-click-easing');
    });
    const onSurfaceClick = (e) => {
      // Navbar toggle: walk up looking for data-tapas-navbar-toggle,
      // then walk up once more to the nav root and flip the open
      // attribute. Runs before the click-anim branch so the hamburger
      // can also carry a click animation without one canceling the
      // other.
      let tgl = e.target;
      while (tgl && tgl !== surface) {
        if (tgl.hasAttribute?.('data-tapas-navbar-toggle')) break;
        tgl = tgl.parentElement;
      }
      if (tgl && tgl !== surface) {
        let nav = tgl.parentElement;
        while (nav && nav !== surface) {
          if (nav.hasAttribute?.('data-tapas-navbar')) break;
          nav = nav.parentElement;
        }
        if (nav && nav !== surface) {
          if (nav.hasAttribute('data-tapas-navbar-open')) {
            nav.removeAttribute('data-tapas-navbar-open');
          } else {
            nav.setAttribute('data-tapas-navbar-open', '');
          }
        }
      }

      // Click-anim branch.
      let el = e.target;
      while (el && el !== surface) {
        if (el.hasAttribute?.('data-tapas-click-anim')) break;
        el = el.parentElement;
      }
      if (!el || el === surface) return;
      // Restart animation: remove then re-add on next frame.
      el.removeAttribute('data-tapas-click-playing');
      requestAnimationFrame(() => {
        el.setAttribute('data-tapas-click-playing', '');
      });
    };
    surface.addEventListener('click', onSurfaceClick);
    const onAnimEnd = (e) => {
      const el = e.target;
      if (el?.hasAttribute?.('data-tapas-click-playing')) {
        el.removeAttribute('data-tapas-click-playing');
      }
    };
    surface.addEventListener('animationend', onAnimEnd);

    // --- page-load ----------------------------------------------
    // Fires once per tree render. Using requestAnimationFrame so the
    // element gets its initial opacity:0 state painted before we flip
    // it, otherwise browsers skip the transition.
    const loadEls = surface.querySelectorAll('[data-tapas-load-anim]');
    loadEls.forEach((el) => {
      const setVar = (attr, cssVar) => {
        const v = el.getAttribute(attr);
        if (v) el.style.setProperty(cssVar, v);
        else el.style.removeProperty(cssVar);
      };
      setVar('data-tapas-load-duration', '--tapas-load-duration');
      setVar('data-tapas-load-delay',    '--tapas-load-delay');
      setVar('data-tapas-load-easing',   '--tapas-load-easing');
      el.removeAttribute('data-tapas-load-in');
    });
    const loadFrame = requestAnimationFrame(() => {
      loadEls.forEach((el) => el.setAttribute('data-tapas-load-in', ''));
    });

    // --- Phase G timelines ---------------------------------------
    // Scroll-into-view timelines: compile once, reset to initial so
    // elements don't flash their final state, then play when the
    // observer first intersects the viewport.
    const timelineControllers = [];
    const scrollTimelineEls = surface.querySelectorAll('[data-tapas-timeline-scroll]');
    let timelineIo = null;
    if (scrollTimelineEls.length && typeof IntersectionObserver !== 'undefined') {
      scrollTimelineEls.forEach((el) => {
        const steps = parseTimelineAttr(el.getAttribute('data-tapas-timeline-scroll'));
        if (!steps.length) return;
        const ctrl = compileTimeline(steps, el, { resetToInitial: true });
        el.__tapasTimelineCtrl = ctrl;
        timelineControllers.push(ctrl);
      });
      timelineIo = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.__tapasTimelineCtrl?.play();
          timelineIo.unobserve(e.target);
        }
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      scrollTimelineEls.forEach((el) => {
        if (el.__tapasTimelineCtrl) timelineIo.observe(el);
      });
    }

    // Page-load timelines fire once on the next frame, after the
    // reset-to-initial paint so the transition is visible.
    const loadTimelineEls = surface.querySelectorAll('[data-tapas-timeline-load]');
    const loadTimelineCtrls = [];
    loadTimelineEls.forEach((el) => {
      const steps = parseTimelineAttr(el.getAttribute('data-tapas-timeline-load'));
      if (!steps.length) return;
      const ctrl = compileTimeline(steps, el, { resetToInitial: true });
      loadTimelineCtrls.push(ctrl);
      timelineControllers.push(ctrl);
    });
    const loadTimelineFrame = requestAnimationFrame(() => {
      loadTimelineCtrls.forEach((ctrl) => ctrl.play());
    });

    // --- Phase H drive triggers ----------------------------------
    // scroll-drive and mouse triggers are continuous — they install
    // rAF loops and listener cleanup functions instead of playing
    // once. Gated behind the Preview-interactions toolbar button:
    // running them by default means a mouse-tilt card tilts away
    // whenever staff hover it to click, which makes editing
    // impossible. Opt-in previewing is the saner default.
    const driveCleanups = [];
    if (previewInteractions) {
      surface.querySelectorAll('[data-tapas-timeline-scroll-drive]').forEach((el) => {
        const steps = parseTimelineAttr(el.getAttribute('data-tapas-timeline-scroll-drive'));
        if (steps.length) driveCleanups.push(driveTimeline('scroll-drive', steps, el));
      });
      surface.querySelectorAll('[data-tapas-timeline-mouse]').forEach((el) => {
        const steps = parseTimelineAttr(el.getAttribute('data-tapas-timeline-mouse'));
        if (steps.length) driveCleanups.push(driveTimeline('mouse', steps, el));
      });
    }

    return () => {
      if (io) io.disconnect();
      if (timelineIo) timelineIo.disconnect();
      surface.removeEventListener('click', onSurfaceClick);
      surface.removeEventListener('animationend', onAnimEnd);
      cancelAnimationFrame(loadFrame);
      cancelAnimationFrame(loadTimelineFrame);
      timelineControllers.forEach((ctrl) => ctrl.cancel());
      driveCleanups.forEach((fn) => fn());
    };
  }, [tree, previewInteractions]);

  // Grid / flex overlay — toolbar ▦. Walk the rendered DOM, tag
  // containers whose computed display is grid/flex, and let CSS
  // outline their children. Runs on every tree change *and* on
  // toggle; on unmount / toggle-off we strip the tags so the outlines
  // disappear cleanly.
  useEffect(() => {
    if (!surfaceRef.current) return undefined;
    const surface = surfaceRef.current;
    if (!gridOverlay) {
      surface.querySelectorAll('[data-tapas-grid-overlay]').forEach((el) => {
        el.removeAttribute('data-tapas-grid-overlay');
      });
      return undefined;
    }
    const nodes = surface.querySelectorAll('[data-tapas-node-id]');
    const tagged = [];
    nodes.forEach((el) => {
      const disp = window.getComputedStyle(el).display;
      if (disp === 'grid' || disp === 'flex' || disp === 'inline-grid' || disp === 'inline-flex') {
        el.setAttribute('data-tapas-grid-overlay', '');
        tagged.push(el);
      }
    });
    return () => {
      tagged.forEach((el) => el.removeAttribute('data-tapas-grid-overlay'));
    };
  }, [tree, gridOverlay]);

  // Walk from the event target up to the nearest node element, then
  // classify the cursor's vertical band into before / after / inside.
  // Returns null if the cursor isn't over any node (drop falls back
  // to append-to-root in the caller).
  //
  // Void tags (img, input, br, hr, video, iframe, …) can't carry
  // children, so hovering one anchors the drop to its *parent*
  // with a before/after position relative to the void element's
  // bounds — that way the indicator never claims "inside" for a
  // target that couldn't accept it, and the user sees a meaningful
  // preview (a thin bar at the side of the image / input).
  const classifyDropTarget = (e) => {
    let el = e.target;
    while (el && el !== e.currentTarget) {
      if (el.dataset?.tapasNodeId) break;
      el = el.parentElement;
    }
    if (!el || el === e.currentTarget) return null;
    const tag = el.tagName.toLowerCase();
    if (VOID_DROP_TAGS.has(tag)) {
      // Anchor to the parent node so "inside" can never happen; the
      // side of the void element the cursor is on decides before vs
      // after.
      let parent = el.parentElement;
      while (parent && parent !== e.currentTarget) {
        if (parent.dataset?.tapasNodeId) break;
        parent = parent.parentElement;
      }
      if (!parent || parent === e.currentTarget) return null;
      const rect = el.getBoundingClientRect();
      if (!rect.height) return null;
      const relY = (e.clientY - rect.top) / rect.height;
      // Use the void element's own rect as the visual anchor target
      // so the indicator draws beside the image / input.
      return {
        targetId: el.dataset.tapasNodeId,
        position: relY < 0.5 ? 'before' : 'after',
      };
    }
    const rect = el.getBoundingClientRect();
    if (!rect.height) return null;
    const relY = (e.clientY - rect.top) / rect.height;
    let position;
    if (relY < 0.25)      position = 'before';
    else if (relY > 0.75) position = 'after';
    else                  position = 'inside';
    return { targetId: el.dataset.tapasNodeId, position };
  };

  const handleDragOver = (e) => {
    // Accept drops carrying either a block-catalogue key (AddPanel) or
    // an asset-library payload (AssetsPanel). Other drags pass through.
    const types = Array.from(e.dataTransfer?.types || []);
    const accepts = types.includes('application/x-tapas-block')
                 || types.includes('application/x-tapas-asset');
    if (!accepts) return;
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
    const assetData = e.dataTransfer.getData('application/x-tapas-asset');
    const blockKey =
      e.dataTransfer.getData('application/x-tapas-block') ||
      (!assetData ? e.dataTransfer.getData('text/plain') : '');
    const target = dropHover;
    setDropHover(null);
    if (assetData) {
      try {
        const payload = JSON.parse(assetData);
        onDropAsset?.(payload, target?.targetId ?? null, target?.position ?? 'append');
      } catch { /* malformed — ignore */ }
      return;
    }
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
        <button
          onClick={() => setPreviewInteractions((p) => !p)}
          title={previewInteractions ? 'Interactions running — click to pause' : 'Preview interactions (runs scroll-drive + mouse triggers)'}
          style={{
            ...toolbarBtn(W),
            background: previewInteractions ? W.accentDim : 'transparent',
            color:      previewInteractions ? W.accent    : W.textDim,
            border: `1px solid ${previewInteractions ? W.accent : 'transparent'}`,
            width: 'auto', padding: '0 8px',
          }}
        >
          {previewInteractions ? '◼ Preview on' : '▶ Preview'}
        </button>
        <button
          onClick={() => setGridOverlay((g) => !g)}
          title={gridOverlay ? 'Hide grid / flex outlines' : 'Show grid / flex outlines'}
          style={{
            ...toolbarBtn(W),
            background: gridOverlay ? W.accentDim : 'transparent',
            color:      gridOverlay ? W.accent    : W.textDim,
            border: `1px solid ${gridOverlay ? W.accent : 'transparent'}`,
          }}
        >▦</button>
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
        <div
          ref={canvasInnerRef}
          style={{
            width: vp.width, maxWidth: '100%',
            transform: `scale(${zoom / 100})`, transformOrigin: 'top center',
            background: '#fff', minHeight: '80vh',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.3)',
            transition: 'width 0.15s ease',
            position: 'relative',
          }}
        >
          <style>{ANIM_CSS}{cssText}{GRID_OVERLAY_CSS}</style>
          <CanvasSelectionShell
            tree={tree}
            selectedId={selectedId}
            onSelect={onSelect}
            onSelectElement={onSelectElement}
            onHover={setHoverId}
            editingNodeId={editingNodeId}
            onStartEdit={onStartEdit}
            onCommitText={onCommitEdit}
            onCommitRuns={onCommitRuns}
            onCancelEdit={onCancelEdit}
            editableRef={editableRef}
            components={components}
            onContextMenu={onContextMenu}
            previewSliderId={previewSliderId}
          />
          {/* Overlays live *inside* the zoomed canvas so they share
              the same coord space as the rendered tree. Using
              element.offsetTop / offsetLeft (unscaled CSS pixels
              relative to the canvas inner div) means the outlines
              stay pixel-perfect at every zoom level. While an
              inline edit is active, both overlays hide so they
              don't obscure the caret. */}
          <SelectionOverlay
            targetId={editingNodeId ? null : selectedId}
            rootRef={canvasInnerRef}
            tree={tree}
            kind="selected"
          />
          <SelectionOverlay
            targetId={!editingNodeId && hoverId && hoverId !== selectedId ? hoverId : null}
            rootRef={canvasInnerRef}
            tree={tree}
            kind="hover"
          />
          {/* Sub-element selection overlay — drawn TIGHTER (orange) inside
              the block selection (blue) to show exactly which DOM element
              the user clicked. Only renders when the user has drilled
              into a block; clears on next block selection or ESC. */}
          {!editingNodeId && selectedId && selectedElementSel && (
            <ElementSelectionOverlay
              blockId={selectedId}
              selector={selectedElementSel}
              rootRef={canvasInnerRef}
            />
          )}
          <DropIndicator
            drop={dropHover}
            rootRef={canvasInnerRef}
          />
        </div>
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
function SelectionOverlay({ targetId, rootRef, tree, kind }) {
  const [rect, setRect] = useState(null);
  const [nodeLabel, setNodeLabel] = useState('');

  const measure = useCallback(() => {
    if (!targetId || !rootRef?.current) { setRect(null); return; }
    const root = rootRef.current;
    const el = root.querySelector(
      `[data-tapas-node-id="${escapeAttrValue(targetId)}"]`
    );
    if (!el) { setRect(null); return; }
    // offsetLeft / offsetTop are unscaled CSS pixels relative to the
    // nearest positioned ancestor. The canvas inner div is position:
    // relative, so these stay accurate at every zoom level. Walk up
    // manually in case an offsetParent boundary (e.g. a transformed
    // composite) sits between the element and the root.
    let top = 0, left = 0;
    let cur = el;
    while (cur && cur !== root) {
      top  += cur.offsetTop;
      left += cur.offsetLeft;
      cur = cur.offsetParent;
    }
    setRect({ top, left, width: el.offsetWidth, height: el.offsetHeight });
    const n = findNode(tree, targetId);
    setNodeLabel(n ? labelOf(n) : '');
  }, [targetId, rootRef, tree]);

  useLayoutEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    if (!targetId) return;
    const root = rootRef?.current;
    if (!root) return;
    const onScroll = () => measure();
    // Scroll happens on the outer surface, not the inner canvas —
    // but offset-based math is unaffected by scroll. Listen anyway
    // so re-measures happen if layout shifts (e.g. lazy images
    // finish loading while the user is scrolled).
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', measure);
    // Re-measure after layout settles — fonts, images, etc.
    const t = setTimeout(measure, 50);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [targetId, rootRef, measure]);

  if (!rect) return null;

  const color = '#146ef5';
  const isSelected = kind === 'selected';

  // Body-root selection is a special case — drawing a 1px outline
  // around the entire page makes it visually noisy and near-invisible
  // at the top + left corners. Show only the label chip so the user
  // still gets confirmation that the root is selected.
  const isBodyRoot = !!(tree && targetId && tree.id === targetId);

  return (
    <>
      {!isBodyRoot && (
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
      )}
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

// =====================================================================
// Element-level sub-selection (Webflow-feature 1: select any DOM
// element inside a block, not just the block as a whole).
//
// Path format: a CSS-ish selector relative to the block root, using
// `tag:nth-of-type(n)` segments. Stable across re-renders as long as
// the block's internal JSX doesn't change. Future style-panel slices
// will use this as the key under content.element_styles for per-
// element CSS overrides. SiteContent.js already applies element_styles
// keyed by [data-editable] paths, so the same plumbing scales here
// once we generate matching data-editable attrs.
// =====================================================================
function computeElementSelector(rootEl, targetEl) {
  if (!rootEl || !targetEl || rootEl === targetEl) return null;
  if (!rootEl.contains(targetEl)) return null;
  const segments = [];
  let cur = targetEl;
  while (cur && cur !== rootEl) {
    const parent = cur.parentElement;
    if (!parent) break;
    const tag = cur.tagName.toLowerCase();
    const sameTag = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
    const idx = sameTag.indexOf(cur) + 1;
    segments.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
    cur = parent;
  }
  return segments.join(' > ') || null;
}

function ElementSelectionOverlay({ blockId, selector, rootRef }) {
  const [rect, setRect] = useState(null);
  const [label, setLabel] = useState('');

  const measure = useCallback(() => {
    if (!blockId || !selector || !rootRef?.current) { setRect(null); return; }
    const root = rootRef.current;
    const blockEl = root.querySelector(`[data-tapas-node-id="${escapeAttrValue(blockId)}"]`);
    if (!blockEl) { setRect(null); return; }
    let el;
    try { el = blockEl.querySelector(selector); }
    catch { el = null; }
    if (!el) { setRect(null); return; }
    let top = 0, left = 0;
    let cur = el;
    while (cur && cur !== root) {
      top  += cur.offsetTop;
      left += cur.offsetLeft;
      cur = cur.offsetParent;
    }
    setRect({ top, left, width: el.offsetWidth, height: el.offsetHeight });
    setLabel(el.tagName.toLowerCase());
  }, [blockId, selector, rootRef]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    if (!blockId || !selector) return;
    const onScroll = () => measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 50);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [blockId, selector, measure]);

  if (!rect) return null;
  const color = '#f97316'; // orange — distinct from block-selection blue
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: rect.top, left: rect.left,
          width: rect.width, height: rect.height,
          outline: `1px solid ${color}`,
          outlineOffset: '-1px',
          pointerEvents: 'none',
          zIndex: 12,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: rect.top - 18, left: rect.left + rect.width - 80,
          width: 80, textAlign: 'right',
          background: color, color: '#fff',
          fontSize: '10px', fontWeight: 500,
          padding: '2px 6px',
          borderRadius: '2px 2px 0 0',
          fontFamily: 'ui-monospace, monospace',
          whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          pointerEvents: 'none',
          zIndex: 13,
        }}
      >&lt;{label}&gt;</div>
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
function DropIndicator({ drop, rootRef }) {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!drop?.targetId || !rootRef?.current) { setRect(null); return; }
    const root = rootRef.current;
    const el = root.querySelector(
      `[data-tapas-node-id="${escapeAttrValue(drop.targetId)}"]`
    );
    if (!el) { setRect(null); return; }
    let top = 0, left = 0;
    let cur = el;
    while (cur && cur !== root) {
      top  += cur.offsetTop;
      left += cur.offsetLeft;
      cur = cur.offsetParent;
    }
    setRect({ top, left, width: el.offsetWidth, height: el.offsetHeight });
  }, [drop, rootRef]);

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
  tree, selectedId, onSelect, onSelectElement, onHover,
  editingNodeId, onStartEdit, onCommitText, onCommitRuns, onCancelEdit,
  editableRef, components, onContextMenu, previewSliderId,
}) {
  const nearestNodeId = (target, stopAt) => {
    let el = target;
    while (el && el !== stopAt) {
      if (el.dataset?.tapasNodeId) return el.dataset.tapasNodeId;
      el = el.parentElement;
    }
    return null;
  };
  // Find the DOM element that owns the given block id, scanning down
  // from the surface root.
  const findBlockEl = (rootEl, id) => {
    if (!rootEl || !id) return null;
    return rootEl.querySelector(`[data-tapas-node-id="${escapeAttrValue(id)}"]`);
  };
  const onClick = (e) => {
    // Clicks inside the editable element are already stopped by
    // EditableText; this only fires for clicks elsewhere on the canvas.
    const id = nearestNodeId(e.target, e.currentTarget);
    if (!id) return;
    // Alt+Click escalates to the parent of the clicked node — matches
    // Webflow's "click into parent" escape hatch. Falls back to the
    // clicked id if no parent exists (e.g. clicking the body root).
    if (e.altKey) {
      const parent = parentOf(tree, id);
      onSelect(parent?.id || id);
    } else {
      onSelect(id);
    }
    // Capture the deeper DOM element selector inside the block so the
    // editor can draw a tighter sub-selection rect. If the click landed
    // exactly on the block root, clear the sub-selection (the block-
    // level rect is enough). Skip on alt+click — that's a parent jump,
    // not a drill-down.
    if (!e.altKey && onSelectElement) {
      const blockEl = findBlockEl(e.currentTarget, id);
      const sel = blockEl && blockEl !== e.target
        ? computeElementSelector(blockEl, e.target)
        : null;
      onSelectElement(sel);
    }
    e.preventDefault(); e.stopPropagation();
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
  const onRightClick = (e) => {
    if (!onContextMenu) return;
    const id = nearestNodeId(e.target, e.currentTarget);
    if (id) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(id);
      onContextMenu(id, e.clientX, e.clientY);
    }
  };
  return (
    <div onClick={onClick} onDoubleClick={onDoubleClick} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} onContextMenu={onRightClick}>
      <TreeNode
        node={tree}
        selectedId={selectedId}
        editingNodeId={editingNodeId}
        onCommitText={onCommitText}
        onCommitRuns={onCommitRuns}
        onCancelEdit={onCancelEdit}
        editableRef={editableRef}
        components={components}
        previewSliderId={previewSliderId}
      />
    </div>
  );
}

// =====================================================================
// Right panel  —  spec § 1: 280 px, Style / Settings / Interactions tabs
// Style tab is live in Phase 3. Settings + Interactions still stubbed.
// =====================================================================
function ElementInspector({ selector, onClear, onSetStyle, getValue, W }) {
  const [openSection, setOpenSection] = useState('typography');
  const tag = (() => {
    const last = String(selector || '').split('>').pop().trim();
    return last.split(':')[0].split('.')[0].toLowerCase() || 'element';
  })();

  const inputBase = {
    marginTop: 4, width: '100%', boxSizing: 'border-box',
    height: 26, padding: '0 8px',
    background: W.inputBg || '#1a1a1a',
    color: W.text || '#eee',
    border: `1px solid ${W.panelBorder}`,
    borderRadius: 3,
    fontSize: 12, fontFamily: 'inherit',
    textTransform: 'none', letterSpacing: 'normal',
  };
  const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 600,
    color: W.textDim, marginBottom: 10,
    letterSpacing: '0.06em', textTransform: 'uppercase',
  };

  const Field = ({ label, prop, placeholder = '', type = 'text' }) => (
    <label style={labelStyle}>
      {label}
      <input
        type={type}
        value={getValue(prop)}
        placeholder={placeholder}
        onChange={(e) => onSetStyle(prop, e.target.value)}
        style={inputBase}
      />
    </label>
  );

  // Side-by-side: e.g. color + alpha or two related fields.
  const FieldRow = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>{children}</div>
  );

  const SelectField = ({ label, prop, options }) => (
    <label style={labelStyle}>
      {label}
      <select
        value={getValue(prop)}
        onChange={(e) => onSetStyle(prop, e.target.value)}
        style={{ ...inputBase, padding: '0 6px' }}
      >
        <option value="">—</option>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );

  const ColorField = ({ label, prop, placeholder = '' }) => {
    const v = String(getValue(prop) || '');
    const isHex = /^#([0-9a-f]{3}){1,2}$/i.test(v);
    return (
      <label style={labelStyle}>
        {label}
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <input
            type="color"
            value={isHex ? v : '#000000'}
            onChange={(e) => onSetStyle(prop, e.target.value)}
            style={{ width: 26, height: 26, padding: 0, border: `1px solid ${W.panelBorder}`, borderRadius: 3, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
          />
          <input
            type="text"
            value={v}
            placeholder={placeholder || '#000 / red / rgba(...)'}
            onChange={(e) => onSetStyle(prop, e.target.value)}
            style={{ ...inputBase, marginTop: 0 }}
          />
        </div>
      </label>
    );
  };

  const Section = ({ id, title, children }) => {
    const open = openSection === id;
    return (
      <div style={{ borderBottom: `1px solid ${W.panelBorder}` }}>
        <button
          type="button"
          onClick={() => setOpenSection(open ? null : id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: W.text || '#eee', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
        >
          <span>{title}</span>
          <span style={{ color: W.textDim, fontSize: 10 }}>{open ? '▾' : '▸'}</span>
        </button>
        {open && <div style={{ padding: '4px 14px 14px' }}>{children}</div>}
      </div>
    );
  };

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: `1px solid ${W.panelBorder}`,
      background: 'rgba(249, 115, 22, 0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.text || '#eee', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Element &lt;{tag}&gt;</div>
            <div style={{
              fontSize: 10, color: W.textDim, fontFamily: 'ui-monospace, monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={selector}>{selector}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          title="Clear element selection (ESC)"
          style={{
            width: 20, height: 20, lineHeight: '20px',
            border: 'none', background: 'transparent',
            color: W.textDim, cursor: 'pointer', fontSize: 14,
            padding: 0, flexShrink: 0,
          }}
        >×</button>
      </div>

      <Section id="typography" title="Typography">
        <ColorField label="Text color" prop="color" />
        <FieldRow>
          <Field label="Size" prop="fontSize" placeholder="18px" />
          <SelectField label="Weight" prop="fontWeight" options={['300','400','500','600','700','800','900']} />
        </FieldRow>
        <FieldRow>
          <Field label="Line height" prop="lineHeight" placeholder="1.4" />
          <Field label="Letter spacing" prop="letterSpacing" placeholder="0" />
        </FieldRow>
        <FieldRow>
          <SelectField label="Align" prop="textAlign" options={['left','center','right','justify']} />
          <SelectField label="Transform" prop="textTransform" options={['none','uppercase','lowercase','capitalize']} />
        </FieldRow>
        <SelectField label="Style" prop="fontStyle" options={['normal','italic']} />
      </Section>

      <Section id="spacing" title="Spacing">
        <Field label="Padding" prop="padding" placeholder="12px 16px" />
        <Field label="Margin"  prop="margin"  placeholder="0 0 16px" />
      </Section>

      <Section id="background" title="Background">
        <ColorField label="Background color" prop="backgroundColor" />
        <Field label="Background image" prop="backgroundImage" placeholder="url(/cover.png)" />
        <FieldRow>
          <SelectField label="Size" prop="backgroundSize" options={['cover','contain','auto','100% 100%']} />
          <SelectField label="Position" prop="backgroundPosition" options={['center','top','bottom','left','right']} />
        </FieldRow>
      </Section>

      <Section id="border" title="Border">
        <Field label="Radius" prop="borderRadius" placeholder="8px / 50%" />
        <FieldRow>
          <Field label="Width" prop="borderWidth" placeholder="1px" />
          <SelectField label="Style" prop="borderStyle" options={['none','solid','dashed','dotted']} />
        </FieldRow>
        <ColorField label="Border color" prop="borderColor" />
      </Section>

      <Section id="effects" title="Effects">
        <Field label="Opacity" prop="opacity" placeholder="0.0–1.0" />
        <Field label="Box shadow" prop="boxShadow" placeholder="0 4px 12px rgba(0,0,0,0.1)" />
        <Field label="Transform" prop="transform" placeholder="rotate(2deg) scale(1.05)" />
        <Field label="Cursor" prop="cursor" placeholder="pointer" />
      </Section>

      <div style={{ fontSize: 10, color: W.textDim, padding: '8px 14px 12px', lineHeight: 1.45 }}>
        Saves to <code style={{ fontFamily: 'ui-monospace, monospace' }}>element_styles</code>. Reload the storefront to see changes.
      </div>
    </div>
  );
}

function RightPanel({
  selectedNode, className, classDef,
  state, onStateChange,
  device, onDeviceChange,
  onCreateClass, onRenameClass, onSetStyle,
  sharedClassNotice,
  onSetTag, onSetAttribute, onRenameAttribute,
  page, pageKey, siteUrl, onUpdatePageMeta,
  previewSliderId, onTogglePreviewSlider,
  onPlayTimeline,
  tree, onSetTextContent,
  selectedElementSel, onClearElementSel, onSetElementStyle, elementStyleValue,
}) {
  const [tab, setTab] = useState('style');
  const tabs = [
    { key: 'style',        label: 'Style' },
    { key: 'settings',     label: 'Settings' },
    { key: 'interactions', label: 'Interactions' },
    { key: 'page',         label: 'Page' },
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
      {/* Element-level inspector — Webflow features 2 + 3.
          Shown only when staff have drilled into a sub-element of the
          currently-selected block (orange outline on canvas). Three
          minimal CSS controls: text color, font size, padding. Writes
          land in content.element_styles[blockPath]["::"+selector] and
          flow to the storefront via SiteContent.applyElementStyles. */}
      {selectedElementSel && onSetElementStyle && (
        <ElementInspector
          selector={selectedElementSel}
          onClear={onClearElementSel}
          onSetStyle={onSetElementStyle}
          getValue={elementStyleValue}
          W={W}
        />
      )}
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
            onDeviceChange={onDeviceChange}
            onCreateClass={onCreateClass}
            onRenameClass={onRenameClass}
            onSetStyle={onSetStyle}
            sharedClassNotice={sharedClassNotice}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            node={selectedNode}
            pageId={pageKey}
            onSetTag={onSetTag}
            onSetAttribute={onSetAttribute}
            onRenameAttribute={onRenameAttribute}
            previewSliderId={previewSliderId}
            onTogglePreviewSlider={onTogglePreviewSlider}
            tree={tree}
            onSetTextContent={onSetTextContent}
          />
        )}
        {tab === 'interactions' && (
          <InteractionsPanel
            node={selectedNode}
            onSetAttribute={onSetAttribute}
            onPlayTimeline={onPlayTimeline}
          />
        )}
        {tab === 'page' && (
          <PagePanel
            page={page}
            pageKey={pageKey}
            siteUrl={siteUrl}
            onUpdateMeta={onUpdatePageMeta}
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
// Bump whenever the content tree shape changes in a way older
// editor bundles can't read. The load effect warns the user if the
// row's schema_version exceeds what this build supports, so a
// newer staff tab doesn't silently clobber fields an older tab
// will drop on next save.
const SCHEMA_VERSION = 2;

const CONTENT_SYSTEM_KEY = 'content_system';

export default function WebsiteEditor() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  // Which of {v1, v2} the live storefront is currently reading. Editor
  // writes v2, but unless this flag is 'v2' the customer site keeps
  // rendering legacy v1 content — the "published" toast would lie.
  const [contentSystem, setContentSystem] = useState(null);
  const [flippingFlag, setFlippingFlag] = useState(false);
  const [pageKey, setPageKey] = useState('home');
  // When set, the canvas renders the component's definition tree and
  // every tree edit routes through withPage's component-scope branch
  // (which rewrites the component def in place). Set via the
  // Components panel's Edit button; cleared via the Done chip in the
  // top bar.
  const [editingComponentId, setEditingComponentId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  // Sub-selection: when the user clicks DEEP inside a block (e.g. on
  // the headline of a tapas_hero), this captures a relative CSS
  // selector pointing at that exact DOM element. Lets the canvas
  // render a tighter highlight around the clicked element on top of
  // the block-level selection. Future style-panel slices will use
  // this path to scope element_styles overrides per-element rather
  // than per-block. null = no sub-selection (block selection only).
  const [selectedElementSel, setSelectedElementSel] = useState(null);
  const [railActive, setRailActive] = useState('navigator');
  const [styleState, setStyleState] = useState('base');
  // Active breakpoint / device frame. Drives both the canvas width and
  // where style writes land (desktop → styles.<state>, others →
  // breakpoints.<bp>). Lives on the main editor so the Style panel can
  // read from the right bucket.
  const [device, setDevice] = useState('desktop');
  // State tabs (None / Hover / Pressed / Focused) are only meaningful
  // at the Desktop breakpoint because non-desktop writes land in a
  // flat breakpoints.<bp> bucket that has no per-state slots. When
  // the user switches to a non-desktop device, collapse state back
  // to 'base' so subsequent writes can't silently target the wrong
  // bucket and the Style panel UI matches what's being stored.
  useEffect(() => {
    if (device !== 'desktop' && styleState !== 'base') setStyleState('base');
  }, [device, styleState]);

  // Inline text edit. When set, the Node renderer makes that node's
  // element contentEditable and hides the selection/hover overlays so
  // the caret isn't obscured. Commit on blur / Enter, cancel on Esc.
  const [editingNodeId, setEditingNodeId] = useState(null);
  // Command palette overlay (Cmd+K). Mounted at the editor root so it
  // overlays everything including the right panel.
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Context menu state — { x, y, nodeId }. Opened on right-click via
  // the CanvasSelectionShell; closed on outside click or Esc.
  const [contextMenu, setContextMenu] = useState(null);
  // Phase G — active timeline controller. Kept in a ref so the Play
  // preview button can cancel the previous run before starting a new
  // one, and so scroll / load observers can own their own controllers
  // without stepping on each other.
  const timelinePreviewRef = useRef(null);

  const handlePlayTimeline = useCallback((triggerKey) => {
    if (!selectedId || typeof document === 'undefined') return;
    const el = document.querySelector(`[data-tapas-node-id="${escapeAttrValue(selectedId)}"]`);
    if (!el) return;
    const raw = el.getAttribute(timelineAttrName(triggerKey));
    const steps = parseTimelineAttr(raw);
    if (steps.length === 0) return;
    if (timelinePreviewRef.current) {
      timelinePreviewRef.current.cancel();
    }
    const controller = compileTimeline(steps, el, { resetToInitial: true });
    timelinePreviewRef.current = controller;
    // Defer one frame so the reset paints before the animation starts,
    // otherwise the browser may fold the two into a single commit and
    // the user sees no transition on the first step.
    requestAnimationFrame(() => controller.play());
  }, [selectedId]);

  // Phase F — "Preview slider" toggle in the Settings tab. When set
  // to a slider node's id, the editor canvas swaps that node from
  // stacked-edit mode into a lightweight runtime carousel so staff
  // can sanity-check autoplay / arrows / swipe without leaving the
  // editor.
  const [previewSliderId, setPreviewSliderId] = useState(null);

  const loadedRef = useRef(null);      // last server blob we loaded (no re-save)
  const saveTimerRef = useRef(null);
  // Tracks the row's updated_at timestamp from the last successful
  // load / save. Used as an optimistic lock: before upserting, we
  // re-check the remote value and abort if someone else persisted a
  // newer row (i.e. another tab beat us).
  const lastUpdatedAtRef = useRef(null);
  const [conflict, setConflict] = useState(false);
  // Pending-edits count for the topbar chip. Incremented by
  // applyEdit, zeroed by autosave success.
  const [unsavedCount, setUnsavedCount] = useState(0);
  // Transient ✓ shown right after a successful autosave so staff
  // get an explicit "done" signal. Auto-clears after ~1500ms.
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (!savedFlash) return undefined;
    const t = setTimeout(() => setSavedFlash(false), 1500);
    return () => clearTimeout(t);
  }, [savedFlash]);

  // Guard against accidental tab close / reload while edits are
  // pending autosave. Browsers ignore the returned string (they
  // show their own generic prompt), but we still need to call
  // preventDefault + set returnValue for the dialog to appear.
  useEffect(() => {
    if (unsavedCount === 0) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [unsavedCount]);
  // Transient toast shown at the bottom-right. Used for "can't do
  // that on the page body" and similar soft blocks — previously the
  // app just silently ignored the shortcut.
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const flashToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2400);
  }, []);

  // Undo/redo history. Snapshot-based, capped at 50 entries each way.
  // Autosave still observes content changes identically — undoing just
  // flips content to a prior snapshot and the next debounced save
  // persists it. No server-side history; this is purely client-local.
  const historyRef = useRef({ past: [], future: [] });
  const HISTORY_CAP = 50;
  // Coalescing: edits made within COALESCE_MS of each other share a
  // single history entry. Dragging a slider, typing a class name, or
  // scrubbing opacity now collapse into one Cmd+Z step instead of
  // flooding the stack with intermediates.
  const COALESCE_MS = 500;
  const lastPushAtRef = useRef(0);
  const clipboardRef = useRef(null);   // last Cmd+C'd node subtree

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const { data: rows, error: err } = await supabase
          .from('app_settings')
          .select('key, value, updated_at')
          .in('key', [V2_KEY, CONTENT_SYSTEM_KEY]);
        if (err) throw err;
        const byKey = Object.fromEntries((rows || []).map(r => [r.key, r]));
        const v2Row = byKey[V2_KEY];
        if (!v2Row?.value) {
          throw new Error(`No ${V2_KEY} row. Run scripts/migrateBlocksToTree.mjs.`);
        }
        const flagRaw = byKey[CONTENT_SYSTEM_KEY]?.value;
        const flag = typeof flagRaw === 'string'
          ? flagRaw
          : (flagRaw?.value || null);
        setContentSystem(flag === 'v2' ? 'v2' : (flag === 'v1' ? 'v1' : null));
        lastUpdatedAtRef.current = v2Row.updated_at || null;
        // Future-schema warning: if the stored row advertises a
        // schema_version we don't understand yet, another staff tab
        // (or a deployed future build) wrote it. Loading it here and
        // saving would downgrade. Warn; still load so staff can see
        // their page, but skip autosave until the user confirms.
        const rowVersion = Number(v2Row.value?.schema_version) || 1;
        if (rowVersion > SCHEMA_VERSION) {
          // eslint-disable-next-line no-console
          console.warn(
            `[WebsiteEditor] Stored schema is v${rowVersion} but this build reads v${SCHEMA_VERSION}. `
            + 'Reload or update the editor before saving to avoid clobbering newer fields.'
          );
          setSaveError(`Read-only: stored schema v${rowVersion} is newer than editor v${SCHEMA_VERSION}. Reload the editor.`);
        }
        setContent(v2Row.value);
        loadedRef.current = v2Row.value;
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Flip app_settings.content_system → 'v2' so the live storefront
  // starts rendering what the editor writes. Until this runs, every
  // "Publish" click persists v2 but customers keep seeing the legacy
  // v1 content — the banner below surfaces that state.
  const handleEnableLiveStorefront = useCallback(async () => {
    setFlippingFlag(true);
    try {
      const { error: err } = await supabase.from('app_settings').upsert({
        key: CONTENT_SYSTEM_KEY,
        value: 'v2',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (err) throw err;
      setContentSystem('v2');
      flashToast('Live storefront now reads the editor output.');
    } catch (err) {
      flashToast(`Switch failed: ${err.message || 'unknown error'}`);
    } finally {
      setFlippingFlag(false);
    }
  }, [flashToast]);

  // Core persist step. Shared by the 900ms debounce and the manual
  // Save button so both paths stay in lockstep on conflict detection,
  // schema stamping, and the loadedRef/updatedAt bookkeeping.
  const persistSnapshot = useCallback(async (snapshot, { overwrite = false } = {}) => {
    if (!snapshot) return { ok: false, reason: 'no-content' };
    setSaving(true); setSaveError('');
    try {
      // Optimistic lock: fetch the row's current updated_at and
      // compare against what we saw at load / last successful save.
      // If a second tab (or someone else's session) beat us, we
      // refuse to clobber their work — surface a banner + lock
      // further saves until the user reloads. `overwrite` is the
      // explicit user-confirmed escape hatch (Save-anyway button).
      const { data: remote, error: headErr } = await supabase
        .from('app_settings').select('updated_at').eq('key', V2_KEY).maybeSingle();
      if (headErr) throw headErr;
      const remoteAhead = remote?.updated_at
        && lastUpdatedAtRef.current
        && remote.updated_at !== lastUpdatedAtRef.current;
      if (remoteAhead && !overwrite) {
        setConflict(true);
        setSaveError('Another tab saved newer changes. Reload before editing to avoid overwriting their work.');
        return { ok: false, reason: 'conflict' };
      }
      if (remoteAhead && overwrite) {
        // User chose to overwrite. Adopt the remote timestamp as our
        // baseline so the upsert below isn't itself blocked as a drift.
        lastUpdatedAtRef.current = remote.updated_at;
      }
      // Stamp the schema version on every save. A future breaking
      // change (e.g. children[] shape) can read this on load and
      // run a just-in-time migration instead of corrupting data.
      const stamped = snapshot.schema_version !== SCHEMA_VERSION
        ? { ...snapshot, schema_version: SCHEMA_VERSION }
        : snapshot;
      const nextUpdatedAt = new Date().toISOString();
      const { error: err } = await supabase.from('app_settings').upsert({
        key: V2_KEY, value: stamped, updated_at: nextUpdatedAt,
      }, { onConflict: 'key' });
      if (err) throw err;
      loadedRef.current = snapshot;
      lastUpdatedAtRef.current = nextUpdatedAt;
      setUnsavedCount(0);
      setSavedFlash(true);
      setSaveError('');           // clear any prior failure banner on success
      if (overwrite) setConflict(false);
      return { ok: true };
    } catch (err) {
      setSaveError(err.message || 'Failed to save.');
      return { ok: false, reason: 'error', error: err };
    } finally {
      setSaving(false);
    }
  }, []);

  // Save-anyway — user-confirmed overwrite of a remote-ahead row. Used
  // when the other tab's changes are known-stale or intentional trash.
  const handleForceSave = useCallback(async () => {
    if (!content) {
      flashToast('Nothing to save — content still loading.');
      return;
    }
    const rowVersion = Number(content?.schema_version) || 1;
    if (rowVersion > SCHEMA_VERSION) {
      flashToast('Read-only: stored schema is newer than this editor build.');
      return;
    }
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    const result = await persistSnapshot(content, { overwrite: true });
    if (result?.ok) {
      flashToast('Saved (overwrote other tab\'s changes).');
    } else {
      flashToast(`Save failed: ${result?.error?.message || 'unknown error — check DevTools.'}`);
    }
  }, [content, persistSnapshot, flashToast]);

  // Manual Save — cancels the pending debounce and flushes the current
  // content immediately. Guarded against the same conflict + schema
  // lockouts as autosave so the button can't be used to bypass them.
  const handleSaveNow = useCallback(async () => {
    if (!content) {
      flashToast('Nothing to save — content still loading.');
      return;
    }
    if (conflict) return; // TopBar swaps to Save-anyway/Reload in this state
    if (content === loadedRef.current) {
      flashToast('Already saved — no pending edits.');
      return;
    }
    const rowVersion = Number(content?.schema_version) || 1;
    if (rowVersion > SCHEMA_VERSION) {
      flashToast('Read-only: stored schema is newer than this editor build.');
      return;
    }
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    const result = await persistSnapshot(content);
    if (!result?.ok && result?.reason === 'error') {
      flashToast(`Save failed: ${result.error?.message || 'unknown error'}`);
    }
  }, [content, conflict, persistSnapshot, flashToast]);

  // Publish — in this schema the storefront reads store_content_v2
  // directly, so "publish" is a confirmed save-now. When a remote-ahead
  // conflict is latched we still let the user publish, but they're
  // explicitly overwriting (button label becomes "Publish anyway").
  const handlePublish = useCallback(async () => {
    if (!content) {
      flashToast('Nothing to publish — content still loading.');
      return;
    }
    const rowVersion = Number(content?.schema_version) || 1;
    if (rowVersion > SCHEMA_VERSION) {
      flashToast('Read-only: stored schema is newer than this editor build.');
      return;
    }
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    const nothingToFlush = content === loadedRef.current && !conflict;
    if (nothingToFlush) {
      flashToast('Already published — storefront has the latest version.');
      return;
    }
    const result = await persistSnapshot(content, { overwrite: conflict });
    if (result?.ok) {
      flashToast(conflict
        ? 'Published (overwrote other tab\'s changes).'
        : 'Published to the live storefront.');
    } else {
      flashToast(`Publish failed: ${result?.error?.message || 'unknown error — check DevTools.'}`);
    }
  }, [content, conflict, persistSnapshot, flashToast]);

  // --- Autosave: debounced upsert back to app_settings.store_content_v2 --
  // Mirrors the legacy editor's pattern: 900 ms after the last edit, push
  // the whole blob. Skips if we haven't drifted from what we loaded.
  //
  // Epoch guard: if `content` is replaced between scheduling the save
  // and the 900 ms timer firing, we abandon the stale snapshot instead
  // of persisting the wrong value. This stops a fast page-swap from
  // racing with an in-flight save and overwriting the wrong row.
  const contentEpochRef = useRef(0);
  useEffect(() => { contentEpochRef.current += 1; }, [content]);
  useEffect(() => {
    if (loading || !content) return;
    if (content === loadedRef.current) return;
    if (conflict) return;
    const rowVersion = Number(content?.schema_version) || 1;
    if (rowVersion > SCHEMA_VERSION) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const snapshotEpoch = contentEpochRef.current;
    const snapshot = content;
    saveTimerRef.current = setTimeout(() => {
      if (snapshotEpoch !== contentEpochRef.current) return; // stale
      persistSnapshot(snapshot);
    }, 900);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [content, loading, conflict, persistSnapshot]);

  const pages = useMemo(() => {
    if (!content?.pages) return [];
    return Object.entries(content.pages).map(([key, p]) => ({ key, name: p.name || key }));
  }, [content]);

  // Active scope key — what mutations actually target. Equals pageKey
  // normally; switches to a component-shim key while editing a
  // component so withPage / withNode rewrite content.components[id]
  // instead of content.pages[pageKey].
  const activePageKey = editingComponentId
    ? componentScopeKey(editingComponentId)
    : pageKey;

  const tree = getEffectivePage(content, activePageKey)?.tree || null;
  const classes = content?.classes || {};

  // Re-usable id → node index. Built once per tree reference so
  // every downstream lookup (selectedNode, findNode-based callbacks)
  // resolves in O(1) instead of walking the whole tree.
  const nodeIndex = useMemo(() => buildNodeIndex(tree), [tree]);
  const breadcrumb = useMemo(
    () => pathToNode(tree, selectedId),
    [tree, selectedId]
  );
  const selectedNode = useMemo(
    () => findNodeIn(nodeIndex, selectedId),
    [nodeIndex, selectedId]
  );
  const flat = useMemo(() => flattenTree(tree), [tree]);

  // The Style panel edits the primary class on the selected node. If
  // there isn't one yet, the Selector shows a "give this element a
  // class" CTA (handled below via handleCreateClass).
  const primaryClass = selectedNode?.classes?.[0] || null;
  const classDef = primaryClass ? classes[primaryClass] : null;

  // Shared-class detector. When staff edit a class inside a component
  // scope, they often expect edits to stay local — but classes are
  // site-wide, so any page also using the class picks up the change.
  // Surface a chip in the Style panel so the shared nature is obvious.
  // Only relevant while in component-edit scope; on a page it's
  // implied.
  const sharedClassNotice = useMemo(() => {
    if (!editingComponentId || !primaryClass) return null;
    const pages = content?.pages || {};
    const walk = (n) => {
      if (!n) return false;
      if (Array.isArray(n.classes) && n.classes.includes(primaryClass)) return true;
      for (const c of n.children || []) if (walk(c)) return true;
      return false;
    };
    for (const page of Object.values(pages)) {
      if (walk(page?.tree)) return 'Used on a page too — edits apply everywhere.';
    }
    return null;
  }, [editingComponentId, primaryClass, content]);

  // Core edit wrapper. Every user-initiated mutation flows through
  // here so the history stack stays honest. updater: content → content.
  // If the updater is a no-op (returns the same reference or an equal
  // blob) we skip the history push to avoid dead entries.
  //
  // Coalescing: if this edit lands within COALESCE_MS of the previous
  // push, we keep `past` as-is and only update current content. Effect:
  // dragging a number input or typing a class name produces ONE history
  // entry covering the entire burst, not one entry per keystroke. A
  // pause of ≥COALESCE_MS (500ms) opens a new history step naturally.
  const applyEdit = useCallback((updater) => {
    setContent((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!next || next === prev) return prev;
      const now = Date.now();
      const recent = now - lastPushAtRef.current < COALESCE_MS;
      const { past } = historyRef.current;
      historyRef.current = {
        past: recent ? past : [...past, prev].slice(-HISTORY_CAP),
        future: [], // any new edit invalidates redo stack
      };
      lastPushAtRef.current = now;
      setUnsavedCount((n) => n + 1);
      return next;
    });
  }, []);

  // Self-heal runs exactly once per load, not on every content
  // change. If staff delete a navbar manually, we must NOT re-insert
  // it the moment the content ref changes — the heal would fight
  // the user on every undo / redo / edit. Gated via a ref that gets
  // cleared only when a fresh Supabase row lands (see load effect).
  const healRunRef = useRef(false);
  useEffect(() => {
    if (healRunRef.current) return;
    if (!content || loading) return;
    const healed = ensureSiteDefaults(content);
    healRunRef.current = true;
    if (healed === content) return;
    // eslint-disable-next-line no-console
    console.log('[WebsiteEditor] Self-heal: seeding navbar/footer and any missing standard pages');
    applyEdit(() => healed);
  }, [content, loading, applyEdit]);

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
      // Force the next edit to start a fresh history entry rather
      // than coalescing into one that was just undone.
      lastPushAtRef.current = 0;
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
      lastPushAtRef.current = 0;
      return first;
    });
  }, []);

  const handleCreateClass = useCallback(() => {
    if (!selectedId) return;
    applyEdit((c) => {
      const { content: next } = ensureNodeClass(c, activePageKey, selectedId);
      return next;
    });
  }, [selectedId, activePageKey, applyEdit]);

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
      const { content: withClass, className } = ensureNodeClass(c, activePageKey, selectedId);
      if (!className) return c;
      if (device === 'desktop') {
        return setClassStyle(withClass, className, styleState, prop, value);
      }
      return setClassBreakpointStyle(withClass, className, device, prop, value);
    });
  }, [selectedId, activePageKey, styleState, device, applyEdit]);

  // Element-level style write — Webflow feature 2/3. Writes a CSS
  // override at content.element_styles[BLOCK_PATH]["::"+selector][prop]
  // where BLOCK_PATH matches the data-editable attribute on the block
  // root. Storefront SiteContent.applyElementStyles emits a CSS rule of
  // the form `[data-editable="${BLOCK_PATH}"] ${selector} { … }`.
  // Empty / null value clears the property; if the override object
  // becomes empty, the parent ::selector key is removed too.
  const handleSetElementStyle = useCallback((prop, value) => {
    if (!selectedId || !selectedElementSel || !pageKey) return;
    const blockPath = `pages.${pageKey}.blocks.${selectedId}`;
    const subKey = `::${selectedElementSel}`;
    applyEdit((c) => {
      const styles = { ...(c?.element_styles || {}) };
      const blockBucket = { ...(styles[blockPath] || {}) };
      const subBucket = { ...(blockBucket[subKey] || {}) };
      if (value === '' || value == null) delete subBucket[prop];
      else subBucket[prop] = value;
      if (Object.keys(subBucket).length === 0) {
        delete blockBucket[subKey];
      } else {
        blockBucket[subKey] = subBucket;
      }
      if (Object.keys(blockBucket).length === 0) {
        delete styles[blockPath];
      } else {
        styles[blockPath] = blockBucket;
      }
      return { ...c, element_styles: styles };
    });
  }, [selectedId, selectedElementSel, pageKey, applyEdit]);

  // Read the current value of an element-style prop so the inspector
  // controls can show what's already saved.
  const elementStyleValue = useCallback((prop) => {
    if (!selectedId || !selectedElementSel || !pageKey) return '';
    const blockPath = `pages.${pageKey}.blocks.${selectedId}`;
    const subKey = `::${selectedElementSel}`;
    return content?.element_styles?.[blockPath]?.[subKey]?.[prop] ?? '';
  }, [selectedId, selectedElementSel, pageKey, content]);

  const handleSetTag = useCallback((tag) => {
    if (!selectedId) return;
    applyEdit((c) => setNodeTag(c, activePageKey, selectedId, tag));
  }, [selectedId, activePageKey, applyEdit]);

  const handleSetAttribute = useCallback((key, value) => {
    if (!selectedId) return;
    applyEdit((c) => setNodeAttribute(c, activePageKey, selectedId, key, value));
  }, [selectedId, activePageKey, applyEdit]);

  // Node-explicit attribute setter — needed by surfaces like the
  // AccessibilityPanel's bulk alt editor where the target node isn't
  // the current selection (staff are editing several images without
  // clicking each on the canvas first).
  const handleSetAttributeOn = useCallback((nodeId, key, value) => {
    if (!nodeId) return;
    applyEdit((c) => setNodeAttribute(c, activePageKey, nodeId, key, value));
  }, [activePageKey, applyEdit]);

  const handleRenameAttribute = useCallback((oldKey, newKey) => {
    if (!selectedId) return;
    applyEdit((c) => renameNodeAttribute(c, activePageKey, selectedId, oldKey, newKey));
  }, [selectedId, activePageKey, applyEdit]);

  // Lane A item 3: Page-level meta (SEO) updates. Partial patch; the
  // mutation drops empty-string values so the stored blob stays tidy.
  const handleUpdatePageMeta = useCallback((patch) => {
    if (!pageKey) return;
    applyEdit((c) => updatePageMeta(c, pageKey, patch));
  }, [pageKey, applyEdit]);

  // Site-level patch. Used by the Settings rail panel to write
  // brand.* and global_css.* fields through the same history-aware
  // applyEdit so Cmd+Z unwinds them.
  const handleSitePatch = useCallback((path, value) => {
    if (!Array.isArray(path) || path.length === 0) return;
    applyEdit((c) => {
      const next = { ...c };
      let cursor = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        const k = path[i];
        cursor[k] = { ...(cursor[k] || {}) };
        cursor = cursor[k];
      }
      cursor[path[path.length - 1]] = value;
      return next;
    });
  }, [applyEdit]);

  // Phase E — component usage map. Re-derives on every content change
  // (single tree walk; no keyed memo needed).
  const componentUsageMap = useMemo(() => componentUsage(content), [content]);

  const handleSaveAsComponent = useCallback(() => {
    if (!selectedId || typeof window === 'undefined') return;
    const name = window.prompt('Component name:', '');
    if (name === null) return;
    let newInstanceId = null;
    applyEdit((c) => {
      const { content: next, instanceId } = saveAsComponent(c, activePageKey, selectedId, { name });
      if (!instanceId) return c;
      newInstanceId = instanceId;
      return next;
    });
    if (newInstanceId) setSelectedId(newInstanceId);
  }, [selectedId, activePageKey, applyEdit]);

  const handleDetachComponent = useCallback(() => {
    if (!selectedId) return;
    let newChildId = null;
    applyEdit((c) => {
      const { content: next, newId } = detachComponent(c, activePageKey, selectedId);
      if (!newId) return c;
      newChildId = newId;
      return next;
    });
    if (newChildId) setSelectedId(newChildId);
  }, [selectedId, activePageKey, applyEdit]);

  const handleInsertComponent = useCallback((componentId) => {
    let newInstanceId = null;
    applyEdit((c) => {
      const { content: next, newId } = insertComponentInstance(c, activePageKey, null, componentId);
      if (!newId) return c;
      newInstanceId = newId;
      return next;
    });
    if (newInstanceId) setSelectedId(newInstanceId);
  }, [activePageKey, applyEdit]);

  const handleRenameComponent = useCallback((componentId, name) => {
    applyEdit((c) => renameComponent(c, componentId, name));
  }, [applyEdit]);

  const handleDeleteComponent = useCallback((componentId) => {
    applyEdit((c) => {
      const { content: next, deleted } = deleteComponent(c, componentId);
      return deleted ? next : c;
    });
  }, [applyEdit]);

  // Enter / exit component-scope edit mode. When entering, selection +
  // editing-node state resets so the user lands in a clean canvas. The
  // actual tree swap happens transparently via activePageKey.
  const handleEditComponent = useCallback((componentId) => {
    setEditingComponentId(componentId || null);
    setSelectedId(null);
    setEditingNodeId(null);
  }, []);

  // Lane G4 — class browser. Usage map re-derives on every content
  // change; cheap (flat walk, same cost as compileClassesToCSS).
  const usageMap = useMemo(() => classUsageMap(content), [content]);
  const handleRenameClassByName = useCallback((oldName) => {
    if (!oldName || typeof window === 'undefined') return;
    const next = window.prompt(`Rename .${oldName} to:`, oldName);
    if (!next || next === oldName) return;
    if (!/^[a-zA-Z][\w-]*$/.test(next)) {
      window.alert('Class name must start with a letter and contain only letters, digits, - and _.');
      return;
    }
    applyEdit((c) => renameClass(c, oldName, next));
  }, [applyEdit]);
  const handleDeleteClass = useCallback((name) => {
    if (!name) return;
    applyEdit((c) => deleteClass(c, name));
  }, [applyEdit]);
  const handleCleanupClasses = useCallback(() => {
    applyEdit((c) => {
      const { content: nc } = deleteUnusedClasses(c);
      return nc;
    });
  }, [applyEdit]);

  // Insert a block from the Add panel. For this MVP we always append
  // to the page root; drag-to-precise-position lands in Phase 7b.
  // Selecting the freshly inserted node is a small UX win — it puts
  // the Inspector on the new element so users can style immediately.
  const handleInsertBlock = useCallback((blockKey) => {
    const entry = BLOCK_CATALOGUE.find((b) => b.key === blockKey);
    if (!entry) return;
    const newNode = entry.create();
    applyEdit((c) => insertNode(c, activePageKey, null, newNode));
    setSelectedId(newNode.id);
  }, [activePageKey, applyEdit]);

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
    applyEdit((c) => setNodeTextContent(c, activePageKey, nodeId, text));
    setEditingNodeId(null);
  }, [activePageKey, applyEdit]);

  // Phase D — inline rich-text edit commits TextRun[] instead of a
  // plain string. Normalisation + strip-textContent happens inside
  // setNodeRuns so the caller stays simple.
  const handleCommitRuns = useCallback((nodeId, runs) => {
    if (!nodeId) { setEditingNodeId(null); return; }
    applyEdit((c) => setNodeRuns(c, activePageKey, nodeId, runs));
    setEditingNodeId(null);
  }, [activePageKey, applyEdit]);

  // Phase I3 — used by the Settings-tab "Bind to CMS field" picker
  // to overwrite a leaf's text with a single {{field}} run. Writes
  // via setNodeRuns because every Phase-D-migrated leaf stores runs,
  // not plain textContent; using setNodeTextContent would leave a
  // stale run shadowing the new value.
  const handleSetLeafText = useCallback((nodeId, text) => {
    if (!nodeId) return;
    applyEdit((c) => setNodeRuns(c, activePageKey, nodeId, [
      { text: String(text ?? ''), marks: [] },
    ]));
  }, [activePageKey, applyEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  // Ref to the currently-editing contentEditable element. Populated
  // by the Node renderer on mount, nulled on unmount. The floating
  // text toolbar anchors off it so selections outside the editable
  // never surface a rogue toolbar.
  const editableRef = useRef(null);

  // Fires when the user clicks a toolbar button (or presses a
  // Cmd+B/I/U/K shortcut). The contentEditable owns the DOM, so we
  // just call execCommand and let blur parse the result later.
  const runRichTextCommand = useCallback((cmd) => {
    if (!editingNodeId) return;
    if (cmd === 'clear') { clearFormatting(); return; }
    if (cmd === 'link') {
      // Inline prompt — the toolbar has its own inline input; this
      // path is used by the ⌘K shortcut inside edit mode.
      if (typeof window === 'undefined') return;
      const href = window.prompt('Link URL (empty to remove):', '');
      if (href === null) return;
      applyLink(href.trim());
      return;
    }
    toggleMark(cmd);
  }, [editingNodeId]);

  // Create a brand-new v2 page from a user-supplied slug. Uses the
  // native prompt for MVP — a proper modal can land with Phase 10b
  // polish. Normalization and collision detection live in createPage().
  // Rename a page's display name and slug. Defaults to the current
  // page when no explicit key is passed (top-bar button flow). A
  // live slug change invalidates inbound links — the prompt warns
  // about that; a proper redirect-mapping flow can land later. The
  // page's key stays the same so undo/redo history doesn't go stale.
  const handleRenamePage = useCallback((key) => {
    const targetKey = key || pageKey;
    if (!targetKey || typeof window === 'undefined') return;
    const page = content?.pages?.[targetKey];
    if (!page) return;
    const nextName = window.prompt('Display name:', page.name || '');
    if (nextName === null) return; // cancel
    const nextSlug = window.prompt(
      'Slug (changing a live slug can break inbound links — add redirects separately):',
      page.slug || '/'
    );
    if (nextSlug === null) return;
    let reason = null;
    applyEdit((c) => {
      const { content: next, reason: r } = renamePage(c, targetKey, { name: nextName, slug: nextSlug });
      reason = r;
      return next || c;
    });
    if (reason === 'slug-collision') {
      flashToast(`Slug "${nextSlug}" is already in use by another page.`);
    } else if (reason === 'missing') {
      flashToast("That page no longer exists.");
    }
  }, [pageKey, content, applyEdit, flashToast]);

  // Delete the current page. Refuses on 'home' (the mutation also
  // defends this invariant, but the UI disables the button anyway).
  // After delete, jump to home so the editor doesn't linger on a
  // now-missing pageKey.
  const handleDeletePage = useCallback((key) => {
    const targetKey = key || pageKey;
    if (!targetKey || targetKey === 'home') return;
    if (typeof window === 'undefined') return;
    const ok = window.confirm(
      `Delete this page? Its tree and any styles unique to it will be removed from v2. Other v2 pages keep their class references intact; this is undoable with Cmd+Z.`
    );
    if (!ok) return;
    applyEdit((c) => deletePage(c, targetKey));
    // Only move selection if we were editing the page we just deleted.
    if (targetKey === pageKey) {
      setPageKey('home');
      setSelectedId(null);
      setEditingNodeId(null);
    }
  }, [pageKey, applyEdit]);

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
        return insertNode(c, activePageKey, null, newNode);
      }
      if (position === 'inside') {
        return insertNode(c, activePageKey, targetId, newNode);
      }
      if (position === 'before') {
        const { content: next } = insertNodeBefore(c, activePageKey, targetId, newNode);
        return next;
      }
      // after
      const { content: next } = insertNodeAfter(c, activePageKey, targetId, newNode);
      return next;
    });
    setSelectedId(newNode.id);
  }, [activePageKey, applyEdit]);

  // Drop-from-asset-library onto canvas. Builds an <img> block
  // pre-populated with the asset's public URL and inserts it with the
  // same position semantics as handleDropBlock. Videos and SVGs go
  // through the same img path for now (browsers render SVG in <img>;
  // videos would need <video> but staff rarely drop raw mp4s — we can
  // handle them when the need comes up).
  const handleDropAsset = useCallback((payload, targetId, position) => {
    if (!payload?.url) return;
    // Asset kind drives which block type to create. Previously every
    // asset became an <img>, so dragging an mp4 produced <img src="v.mp4">
    // which renders as a broken-image placeholder on the storefront.
    const kind = payload.kind || 'image';
    let newNode;
    if (kind === 'video') {
      newNode = {
        id: 'n_' + Math.random().toString(36).slice(2, 9),
        tag: 'video',
        classes: ['video'],
        attributes: {
          src: payload.url,
          controls: '',
          playsInline: '',
          preload: 'metadata',
        },
        children: [],
      };
    } else {
      const assetEntry = BLOCK_CATALOGUE.find((b) => b.key === 'image');
      if (!assetEntry) return;
      newNode = assetEntry.create();
      newNode.attributes = {
        ...(newNode.attributes || {}),
        src: payload.url,
        alt: payload.alt || '',
      };
    }
    applyEdit((c) => {
      if (!targetId || position === 'append') {
        return insertNode(c, activePageKey, null, newNode);
      }
      if (position === 'inside') {
        return insertNode(c, activePageKey, targetId, newNode);
      }
      if (position === 'before') {
        const { content: next } = insertNodeBefore(c, activePageKey, targetId, newNode);
        return next;
      }
      const { content: next } = insertNodeAfter(c, activePageKey, targetId, newNode);
      return next;
    });
    setSelectedId(newNode.id);
  }, [activePageKey, applyEdit]);

  // Click handler for the AssetsPanel's "insert here" button — inserts
  // at root, no drop target required.
  const handleInsertAsset = useCallback((asset) => {
    handleDropAsset({ url: asset.url, alt: asset.name, kind: asset.kind }, null, 'append');
  }, [handleDropAsset]);

  // --- Phase 9 mutation handlers (duplicate / remove / paste) ---------
  const handleDuplicate = useCallback(() => {
    if (!selectedId || !tree) return;
    if (selectedId === tree.id) {
      flashToast("Can't duplicate the page body.");
      return;
    }
    let created = null;
    applyEdit((c) => {
      const { content: next, newId } = duplicateNode(c, activePageKey, selectedId);
      if (newId) created = newId;
      return next;
    });
    if (created) setSelectedId(created);
  }, [selectedId, tree, activePageKey, applyEdit, flashToast]);

  const handleDelete = useCallback(() => {
    if (!selectedId || !tree) return;
    if (selectedId === tree.id) {
      flashToast("Can't delete the page body.");
      return;
    }
    let fallbackParent = null;
    applyEdit((c) => {
      const { content: next, parentId } = removeNode(c, activePageKey, selectedId);
      fallbackParent = parentId;
      return next;
    });
    // Move selection to the parent so the Inspector has something to show.
    setSelectedId(fallbackParent);
  }, [selectedId, tree, activePageKey, applyEdit, flashToast]);

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
        const { content: next, newId } = insertNodeAfter(c, activePageKey, selectedId, fresh);
        if (newId) created = newId;
        return next;
      }
      // Nothing selected (or root) → append to page root.
      created = fresh.id;
      return insertNode(c, activePageKey, null, fresh);
    });
    if (created) setSelectedId(created);
  }, [selectedId, tree, activePageKey, applyEdit]);

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

      // Rich-text shortcuts — only fire while a contentEditable is
      // active so the same keys stay available for the global palette
      // / undo when editing isn't happening.
      if (editingNodeId && mod) {
        if (e.key === 'b' || e.key === 'B') { runRichTextCommand('bold');      e.preventDefault(); return; }
        if (e.key === 'i' || e.key === 'I') { runRichTextCommand('italic');    e.preventDefault(); return; }
        if (e.key === 'u' || e.key === 'U') { runRichTextCommand('underline'); e.preventDefault(); return; }
        if (e.key === 'k' || e.key === 'K') { runRichTextCommand('link');      e.preventDefault(); return; }
      }

      // Cmd+K — command palette. Skipped while editing (see above).
      if (mod && (e.key === 'k' || e.key === 'K')) {
        setPaletteOpen((o) => !o);
        e.preventDefault();
        return;
      }

      // Cmd+/ — open the Add rail panel. Matches Webflow's "insert
      // anywhere" shortcut: fastest way to drop a block without
      // taking a hand off the keyboard.
      if (mod && e.key === '/') {
        setRailActive('add');
        e.preventDefault();
        return;
      }

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

      // `?` opens the Help rail panel from anywhere (matches the
      // Webflow shortcut). Fires before the `!selectedId` guard
      // below so it works on a fresh canvas with nothing selected.
      if (!mod && !e.altKey && e.key === '?') {
        setRailActive('help');
        e.preventDefault();
        return;
      }

      if (!selectedId) return;

      // Selection moves (no meta key)
      if (!mod) {
        if (e.key === 'Escape') {
          // First press: clear element sub-selection (so the user pops
          // back from "headline inside hero" to "the hero block").
          // Subsequent presses: walk up to parent block as before.
          if (selectedElementSel) {
            setSelectedElementSel(null);
            e.preventDefault();
            return;
          }
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
          const sib = siblingOf(content, activePageKey, selectedId, dir);
          if (sib) { setSelectedId(sib.id); e.preventDefault(); }
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          handleDelete(); e.preventDefault(); return;
        }
      }

      // Cmd+Option+C — save selection as component. Matches the
      // Webflow shortcut so staff muscle memory carries over.
      if (mod && e.altKey && (e.key === 'c' || e.key === 'C' || e.code === 'KeyC')) {
        handleSaveAsComponent(); e.preventDefault(); return;
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
  }, [tree, flat, selectedId, content, activePageKey, undo, redo, handleDelete, handleDuplicate, handleCopy, handlePaste, editingNodeId, runRichTextCommand, handleSaveAsComponent]);

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
        onPageChange={(k) => { setPageKey(k); setSelectedId(null); setEditingNodeId(null); setEditingComponentId(null); }}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
        pages={pages}
        unsavedCount={unsavedCount}
        onSave={handleSaveNow}
        onForceSave={handleForceSave}
        onPublish={handlePublish}
        saving={saving}
        savedFlash={savedFlash}
        conflict={conflict}
      />
      {contentSystem === 'v1' && (
        <div style={{
          flexShrink: 0, padding: '6px 14px',
          background: '#4a2d0f',
          borderBottom: '1px solid #8a5620',
          color: '#fbbf24',
          fontSize: '11.5px', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px',
        }}>
          <span>
            ⚠ Storefront is still rendering legacy (v1) content. Publishes from this editor
            save to the v2 row but customers won&apos;t see them until you switch the storefront.
          </span>
          <button
            onClick={handleEnableLiveStorefront}
            disabled={flippingFlag}
            style={{
              height: '24px', padding: '0 12px',
              background: flippingFlag ? '#444' : '#fbbf24',
              color: '#1a1a1a', fontWeight: 700,
              border: 'none', borderRadius: '3px',
              cursor: flippingFlag ? 'not-allowed' : 'pointer',
              fontSize: '11px', whiteSpace: 'nowrap',
            }}
          >{flippingFlag ? 'Switching…' : 'Switch storefront to v2'}</button>
        </div>
      )}
      {editingComponentId && (
        <div style={{
          flexShrink: 0, height: '28px',
          padding: '0 14px',
          background: '#146ef522',
          borderBottom: `1px solid #146ef5`,
          color: W.accent, fontSize: '11.5px', fontWeight: 600,
          letterSpacing: '0.02em',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>
            ◆ Editing component:{' '}
            <span style={{ color: W.text }}>
              {content?.components?.[editingComponentId]?.name || editingComponentId}
            </span>
            <span style={{ color: W.textFaint, marginLeft: '10px', fontWeight: 500 }}>
              Changes apply to every instance.
            </span>
          </span>
          <button
            onClick={() => handleEditComponent(null)}
            style={{
              background: W.accent, color: '#fff',
              border: 'none', borderRadius: '3px',
              padding: '2px 10px', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Return to page"
          >Done</button>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftRail active={railActive} onChange={setRailActive} />
        {(() => {
          switch (railActive) {
            case 'add':
              return <AddPanel onInsert={handleInsertBlock} />;
            case 'pages':
              return (
                <PagesPanel
                  pages={pages}
                  activeKey={pageKey}
                  onPick={(k) => { setPageKey(k); setSelectedId(null); setEditingNodeId(null); setEditingComponentId(null); }}
                  onCreate={handleCreatePage}
                  onRename={handleRenamePage}
                  onDelete={handleDeletePage}
                />
              );
            case 'styleguide':
              return (
                <ClassBrowser
                  classes={classes}
                  usage={usageMap}
                  onRename={handleRenameClassByName}
                  onDelete={handleDeleteClass}
                  onCleanup={handleCleanupClasses}
                />
              );
            case 'components':
              return (
                <ComponentsPanel
                  content={content}
                  usage={componentUsageMap}
                  editingComponentId={editingComponentId}
                  onInsert={handleInsertComponent}
                  onEdit={handleEditComponent}
                  onRename={handleRenameComponent}
                  onDelete={handleDeleteComponent}
                />
              );
            case 'assets':
              return <AssetsPanel pageId={pageKey} onInsertAsset={handleInsertAsset} />;
            case 'interactions':
              return <InteractionsListPanel />;
            case 'variables':
              return <VariablesPanel content={content} />;
            case 'cms':
              return <CMSPanel />;
            case 'ecommerce':
              return <EcommercePanel />;
            case 'settings':
              return <SiteSettingsPanel content={content} onPatch={handleSitePatch} />;
            case 'search':
              return (
                <SearchPanel
                  content={content}
                  tree={tree}
                  onSelect={setSelectedId}
                  onPickPage={(k) => { setPageKey(k); setSelectedId(null); setEditingNodeId(null); setEditingComponentId(null); }}
                />
              );
            case 'help':
              return <HelpPanel />;
            case 'a11y':
              return (
                <AccessibilityPanel
                  tree={tree}
                  onSelect={setSelectedId}
                  onSetAttributeOn={handleSetAttributeOn}
                />
              );
            case 'navigator':
            default:
              return <Navigator tree={tree} selectedId={selectedId} onSelect={setSelectedId} />;
          }
        })()}
        <Canvas
          tree={tree}
          classes={classes}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setSelectedElementSel(null); }}
          selectedElementSel={selectedElementSel}
          onSelectElement={setSelectedElementSel}
          device={device}
          onDeviceChange={setDevice}
          onDropBlock={handleDropBlock}
          onDropAsset={handleDropAsset}
          editingNodeId={editingNodeId}
          onStartEdit={handleStartEdit}
          onCommitEdit={handleCommitEdit}
          onCommitRuns={handleCommitRuns}
          onCancelEdit={handleCancelEdit}
          editableRef={editableRef}
          components={content?.components}
          onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
          previewSliderId={previewSliderId}
        />
        <RightPanel
          selectedNode={selectedNode}
          className={primaryClass}
          classDef={classDef}
          state={styleState}
          onStateChange={setStyleState}
          device={device}
          onDeviceChange={setDevice}
          onCreateClass={handleCreateClass}
          onRenameClass={handleRenameClass}
          onSetStyle={handleSetStyle}
          sharedClassNotice={sharedClassNotice}
          onSetTag={handleSetTag}
          onSetAttribute={handleSetAttribute}
          onRenameAttribute={handleRenameAttribute}
          page={content?.pages?.[pageKey]}
          pageKey={pageKey}
          siteUrl={content?.brand?.site_url || ''}
          onUpdatePageMeta={handleUpdatePageMeta}
          previewSliderId={previewSliderId}
          onTogglePreviewSlider={(id) => {
            setPreviewSliderId((prev) => (prev === id ? null : id));
          }}
          onPlayTimeline={handlePlayTimeline}
          tree={tree}
          onSetTextContent={handleSetLeafText}
          selectedElementSel={selectedElementSel}
          onClearElementSel={() => setSelectedElementSel(null)}
          onSetElementStyle={handleSetElementStyle}
          elementStyleValue={elementStyleValue}
        />
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        content={content}
        tree={tree}
        onSelect={setSelectedId}
        onPickPage={(k) => { setPageKey(k); setSelectedId(null); setEditingNodeId(null); setEditingComponentId(null); }}
      />
      <FloatingTextToolbar
        active={!!editingNodeId}
        anchorRef={editableRef}
        onCommand={runRichTextCommand}
      />
      <ContextMenu
        open={contextMenu}
        onClose={() => setContextMenu(null)}
        onSaveAsComponent={() => { setContextMenu(null); handleSaveAsComponent(); }}
        onDetach={() => { setContextMenu(null); handleDetachComponent(); }}
        isInstance={(() => {
          if (!contextMenu?.nodeId || !tree) return false;
          const hit = findNode(tree, contextMenu.nodeId);
          return !!hit?.componentRef;
        })()}
      />
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
      {toast && !saveError && !saving && (
        <div style={{
          position: 'absolute', bottom: 8, right: 12,
          padding: '6px 10px', borderRadius: '4px',
          background: '#2a2a2a', color: W.text,
          fontSize: '11px',
          border: `1px solid ${W.panelBorder}`,
          zIndex: 20,
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
      {savedFlash && !saving && !saveError && !toast && (
        <div style={{
          position: 'absolute', bottom: 8, right: 12,
          padding: '6px 10px', borderRadius: '4px',
          background: '#173a23', color: '#86e08b',
          fontSize: '11px', fontFamily: 'ui-monospace, monospace',
          border: '1px solid #2a7a4a',
          zIndex: 20,
          pointerEvents: 'none',
        }}>
          ✓ Saved
        </div>
      )}
    </div>
  );
}

// Small right-click menu anchored to the click position. Options are
// gated on whether the selection is already a component instance —
// staff can Detach an instance or Save a regular node as a new
// component. Closes on Esc or any click outside.
function ContextMenu({ open, onClose, onSaveAsComponent, onDetach, isInstance }) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = () => onClose?.();
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  // Clamp the anchor to the viewport so a right-click near the
  // bottom / right edge doesn't push the menu off-screen.
  const MENU_W = 200;
  const MENU_H = 80;
  const vw = (typeof window !== 'undefined' ? window.innerWidth  : 1200) - 8;
  const vh = (typeof window !== 'undefined' ? window.innerHeight : 800)  - 8;
  const x = Math.max(4, Math.min(open.x, vw - MENU_W));
  const y = Math.max(4, Math.min(open.y, vh - MENU_H));
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: y, left: x, zIndex: 3200,
        minWidth: '180px',
        background: '#1e1e1e', color: '#e5e5e5',
        border: '1px solid #333', borderRadius: '4px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        padding: '4px',
        fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
      }}
    >
      {isInstance ? (
        <MenuItem onClick={onDetach}>Detach component</MenuItem>
      ) : (
        <MenuItem onClick={onSaveAsComponent} hint="⌘⌥C">Save as component</MenuItem>
      )}
    </div>
  );
}

function MenuItem({ children, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '16px',
        padding: '6px 10px', background: 'transparent',
        color: '#e5e5e5', border: 'none', cursor: 'pointer',
        textAlign: 'left', fontSize: '12px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span>{children}</span>
      {hint && <span style={{ color: '#6a6a6a', fontSize: '11px', fontFamily: 'ui-monospace, monospace' }}>{hint}</span>}
    </button>
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
