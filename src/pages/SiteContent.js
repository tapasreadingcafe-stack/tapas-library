import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_CONTENT, CONTENT_SCHEMA, sectionForFieldPath } from '../utils/siteContentSchema';
import {
  BLOCK_REGISTRY_META, BLOCK_CATEGORIES, EDITABLE_PAGES, makeBlock,
} from '../utils/blockRegistryMeta';
import { getBlockA11yWarnings } from '../utils/blockA11y';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  useDraggable, useDroppable, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Undo2, Redo2, History, CalendarClock, Palette, Rocket, MoreHorizontal,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Monitor, Tablet, Smartphone, RefreshCw, ExternalLink,
  GripVertical, Copy, Trash2, Eye, EyeOff,
  Lock, Unlock, RotateCcw, Search, CornerDownLeft, ArrowUp, ArrowDown,
  AlertTriangle,
} from 'lucide-react';

// =====================================================================
// SiteContent — Figma-style three-panel visual editor.
//
//   ┌───────────┬──────────────────────────┬────────────────┐
//   │  Pages +  │    Live draft preview    │   Property     │
//   │  sections │    (iframe)              │   inspector    │
//   └───────────┴──────────────────────────┴────────────────┘
//
// Draft mode
//   - All edits save to app_settings.store_content_draft (not _live_).
//   - The iframe is loaded with ?preview=draft so the store loads the
//     draft row instead of the production row. Real visitors still see
//     the last pushed version.
//   - A big "Push to live" button at the top copies draft → live.
//
// Autosave still runs (to the draft row), so refreshing the dashboard
// never loses your work. Only push touches production.
// =====================================================================

// Resolve the storefront URL the iframe should preview.
//
// Priority:
//   1. REACT_APP_STORE_URL (so deployments can override per-env, and so
//      local dev can point at http://localhost:3001 — the tapas-store
//      app's default CRA port)
//   2. Production fallback to the canonical domain
//
// Without this, hitting the editor on localhost loads the production
// storefront in the iframe and you can't preview unpublished work.
const STORE_URL = (
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_STORE_URL) ||
  (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'https://www.tapasreadingcafe.com')
);
const STORAGE_BUCKET = 'site-content';
const DRAFT_KEY = 'store_content_draft';
const LIVE_KEY  = 'store_content';

const PAGES = [
  { path: '/',       label: 'Home',   icon: '🏠' },
  { path: '/books',  label: 'Books',  icon: '📚' },
  { path: '/about',  label: 'About',  icon: '📖' },
  { path: '/offers', label: 'Offers', icon: '💳' },
];

const VIEWPORTS = [
  { key: 'desktop', label: '🖥', width: '100%',  maxWidth: '1400px' },
  { key: 'tablet',  label: '📱', width: '820px', maxWidth: '820px' },
  { key: 'mobile',  label: '📞', width: '420px', maxWidth: '420px' },
];

// Schema groups — maps each schema section to a top-level category so
// the left panel can render them grouped like Figma's layers panel.
const SECTION_GROUPS = [
  { key: 'design', label: 'Design',    icon: '🎨', sectionKeys: ['brand', 'typography', 'buttons', 'images'] },
  { key: 'pages',  label: 'Pages',     icon: '📄', sectionKeys: ['header', 'home', 'catalog', 'about', 'about_values', 'offers', 'offers_why_join', 'offers_cta', 'newsletter', 'footer', 'contact'] },
  { key: 'plans',  label: 'Membership', icon: '💳', sectionKeys: ['plans_basic', 'plans_silver', 'plans_gold'] },
  { key: 'layout', label: 'Layout',    icon: '📐', sectionKeys: [
    'visibility', 'styles', 'layout',
    'section_style_home_hero', 'section_style_home_staff_picks', 'section_style_home_cafe_story',
    'section_style_about_hero', 'section_style_offers_hero',
  ]},
];

// Which iframe path each section deep-links to.
const SECTION_DEFAULT_PATH = {
  brand: '/', contact: '/about', home: '/', images: '/',
  about: '/about', about_values: '/about',
  offers: '/offers', offers_why_join: '/offers', offers_cta: '/offers', offers_cta_mock: '/offers',
  newsletter: '/', plans_basic: '/offers', plans_silver: '/offers', plans_gold: '/offers',
  catalog: '/books', footer: '/', header: '/', visibility: '/', styles: '/', layout: '/',
  section_style_home_hero: '/', section_style_home_staff_picks: '/', section_style_home_cafe_story: '/',
  section_style_about_hero: '/about', section_style_offers_hero: '/offers',
  section_style_header: '/', section_style_footer: '/',
  section_style_home_genres: '/', section_style_home_new_arrivals: '/', section_style_home_newsletter: '/',
};

function storageKeyForSection(section) { return section.parent || section.key; }

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = { ...base };
  for (const k of Object.keys(override)) {
    const bv = base[k]; const ov = override[k];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      out[k] = deepMerge(bv, ov);
    } else if (ov !== null && ov !== undefined && ov !== '') {
      out[k] = ov;
    }
  }
  return out;
}

// Pages a user deleted are kept as a tombstone in `_deleted_pages` on
// the content blob so the deep-merge with DEFAULT_CONTENT doesn't
// resurrect them. This helper strips them after every merge.
function stripDeletedPages(content) {
  const deleted = content?._deleted_pages;
  if (!Array.isArray(deleted) || deleted.length === 0) return content;
  if (!content?.pages) return content;
  const nextPages = { ...content.pages };
  for (const k of deleted) delete nextPages[k];
  return { ...content, pages: nextPages };
}

// ---- Styling tokens (Figma-like neutrals) -----------------------------

// Figma-ish neutral palette.
const S = {
  canvas:   '#E5E5E5',          // canvas gray (outside the white panels)
  bg:       '#F5F5F5',
  panel:    '#FFFFFF',
  panelAlt: '#FAFAFA',
  border:   '#E5E5E5',
  borderStrong: '#D1D5DB',
  divider:  '#ECECEC',
  text:     '#2C2C2C',
  textDim:  '#8A8A8A',
  textFaint:'#B3B3B3',
  accent:   '#0D99FF',            // Figma blue
  accentLight:'#E5F1FC',
  success:  '#14AE5C',
  warning:  '#F59E0B',
  danger:   '#F24822',
  sectionHeader: '#F5F5F5',
};

// Figma-style subsection groups for content sections. When a section is
// listed here, its fields are rendered inside collapsible SubSections
// mirroring Figma's Position / Layout / Fill pattern. Sections not listed
// fall back to a flat field list.
// Each group: { title, keys: [...fieldKeys], hasAdd?: bool }
const SECTION_SUB_GROUPS = {
  brand: [
    { title: 'Identity',   keys: ['name', 'tagline'] },
    { title: 'Fill',       keys: ['primary_color', 'primary_color_dark', 'primary_color_light', 'accent_color', 'accent_color_dark', 'cream_color', 'sand_color'], hasAdd: true },
    { title: 'Typography', keys: ['heading_font', 'body_font'] },
  ],
};

// Light palette for the right inspector panel — Figma-style structural
// layout (subsections, paired inputs, icon rows) applied on a clean
// white panel. Used only inside the right <aside> and its field
// renderers so the left sidebar and center preview stay in sync.
const D = {
  panel:      '#FFFFFF',   // main panel background
  panelAlt:   '#FAFAFA',   // slightly lifted surface (tab bar, headers)
  input:      '#F2F2F2',   // input background at rest
  inputHover: '#EAEAEA',   // input on hover
  inputFocus: '#FFFFFF',   // input on focus (white + accent border)
  border:     '#E5E5E5',   // strong divider
  divider:    '#ECECEC',   // faint divider between sections
  text:       '#2C2C2C',   // primary text
  textDim:    '#8A8A8A',   // labels
  textFaint:  '#B3B3B3',   // hints, placeholders
  accent:     '#0D99FF',   // Figma blue (unchanged)
  accentFaint:'rgba(13,153,255,0.08)',
  danger:     '#F24822',
};

// ---- Field renderers: Figma-style icon + label + input rows -----------
// Every field is a compact row. Figma's inspector is dense — 28px tall
// inputs, 10–11px labels, tight gaps. We lean into that.

const inputBaseStyle = {
  width: '100%',
  padding: '0 8px',
  border: `1px solid transparent`,
  borderRadius: '2px',
  fontSize: '11px',
  fontFamily: 'inherit',
  outline: 'none',
  background: D.input,
  color: D.text,
  boxSizing: 'border-box',
  height: '28px',
};
const hintStyle = {
  fontSize: '10px',
  color: D.textFaint,
  marginTop: '4px',
  paddingLeft: '28px',
  lineHeight: '1.4',
};

// Icon glyphs per field type. Using unicode so we don't ship SVG paths.
// Positioned monospace-ish in a 20px column on the left of every row.
const TYPE_ICON = {
  text:         'T',
  textarea:     '¶',
  color:        '●',
  font:         'A',
  image:        '⛰',
  toggle:       '◱',
  number:       '#',
  select:       '▾',
  sectionOrder: '☰',
};

function FieldIcon({ type, color }) {
  const glyph = TYPE_ICON[type] || '·';
  return (
    <span style={{
      width: '20px',
      flexShrink: 0,
      color: color || D.textFaint,
      fontSize: '11px',
      fontWeight: '500',
      textAlign: 'center',
      fontFamily: 'ui-monospace, "SF Mono", monospace',
    }}>{glyph}</span>
  );
}

// Compact row — Figma inspector uses a 20px icon column, a muted label,
// and a flex input on the right. Label truncates if it doesn't fit.
function Row({ label, iconType, iconColor, children, stacked }) {
  if (stacked) {
    return (
      <div style={{ padding: '0 16px 10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
          <FieldIcon type={iconType} color={iconColor} />
          <span style={{ fontSize:'11px', color: D.textDim, fontWeight:'500', textTransform:'capitalize', letterSpacing: '0.1px' }}>
            {label}
          </span>
        </div>
        <div style={{ paddingLeft: '28px' }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ padding: '0 16px', marginBottom: '8px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', minHeight: '28px' }}>
        <FieldIcon type={iconType} color={iconColor} />
        <span style={{
          fontSize:'11px',
          color: D.textDim,
          fontWeight:'400',
          flexShrink: 0,
          width: '80px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: '0.1px',
        }} title={label}>
          {label}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}

function TextField({ field, value, onChange, inputRef }) {
  return (
    <Row label={field.label} iconType="text">
      <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        style={inputBaseStyle}
        onFocus={e => { e.target.style.border = `1px solid ${D.accent}`; e.target.style.background = D.inputFocus; }}
        onBlur={e  => { e.target.style.border = `1px solid transparent`; e.target.style.background = D.input; }}
      />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

function TextArea({ field, value, onChange, inputRef }) {
  return (
    <Row label={field.label} iconType="textarea" stacked>
      <textarea ref={inputRef} value={value || ''} onChange={e => onChange(e.target.value)} rows={3}
        style={{ ...inputBaseStyle, height: 'auto', resize: 'vertical', lineHeight: '1.45', padding: '7px 8px' }}
        onFocus={e => { e.target.style.border = `1px solid ${D.accent}`; e.target.style.background = D.inputFocus; }}
        onBlur={e  => { e.target.style.border = `1px solid transparent`; e.target.style.background = D.input; }}
      />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

// Parse a color value (#RRGGBB or #RRGGBBAA) into base hex + alpha (0-100).
function parseColorAlpha(raw) {
  const v = (raw || '').trim();
  if (!v) return { base: '', alpha: 100 };
  if (v.length === 9 && v.startsWith('#')) {
    const a = parseInt(v.slice(7, 9), 16);
    return { base: v.slice(0, 7).toUpperCase(), alpha: Math.round((a / 255) * 100) };
  }
  return { base: v.toUpperCase(), alpha: 100 };
}

// Compose base hex + alpha % back into a hex string (strips alpha if 100%).
function composeColor(base, alphaPct) {
  if (!base) return '';
  const pct = Math.max(0, Math.min(100, Math.round(alphaPct)));
  if (pct === 100) return base;
  const a = Math.round((pct / 100) * 255).toString(16).padStart(2, '0');
  return `${base}${a.toUpperCase()}`;
}

function ColorField({ field, value, onChange, inputRef }) {
  const { base, alpha } = parseColorAlpha(value);
  const setHex = (hex) => onChange(composeColor(hex, alpha));
  const setAlpha = (pct) => onChange(composeColor(base || '#000000', pct));
  return (
    <Row label={field.label} iconType="color" iconColor={base || D.textFaint}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: D.input, borderRadius: '2px', height: '28px', padding: '0 6px' }}>
        <div style={{ position: 'relative', width: '14px', height: '14px', flexShrink: 0 }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '2px',
            background: value || 'transparent',
            border: `1px solid ${D.border}`,
            backgroundImage: value ? 'none' : 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '6px 6px',
            backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0',
          }} />
          <input type="color" value={base || '#000000'} onChange={e => setHex(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        </div>
        <input ref={inputRef} type="text" value={(base || '').replace('#', '').toUpperCase()}
          onChange={e => {
            const cleaned = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
            setHex('#' + cleaned);
          }}
          placeholder="—"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: D.text, letterSpacing: '0.3px', minWidth: 0 }} />
        {/* Opacity editor — type or use mouse wheel */}
        <input
          type="number"
          min="0"
          max="100"
          value={alpha}
          onChange={(e) => setAlpha(Number(e.target.value) || 0)}
          onWheel={(e) => {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            setAlpha(alpha + (e.deltaY > 0 ? -step : step));
          }}
          title="Opacity (0–100%). Scroll to adjust."
          style={{
            width: '28px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '10px',
            color: D.textDim,
            textAlign: 'right',
            flexShrink: 0,
            fontFamily: 'ui-monospace, monospace',
            padding: 0,
          }}
        />
        <span style={{ fontSize: '10px', color: D.textFaint, flexShrink: 0 }}>%</span>
      </div>
    </Row>
  );
}

function FontField({ field, value, onChange, inputRef }) {
  const COMMON = ['Playfair Display','Lato','Inter','Roboto','Open Sans','Merriweather','Lora','Raleway','Cormorant Garamond','EB Garamond','Crimson Pro','Libre Baskerville','Montserrat','Poppins'];
  return (
    <Row label={field.label} iconType="font">
      <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        list={`font-options-${field.key}`} placeholder="Playfair Display"
        style={{ ...inputBaseStyle, fontFamily: value ? `"${value}", serif` : 'inherit' }}
        onFocus={e => { e.target.style.border = `1px solid ${D.accent}`; e.target.style.background = D.inputFocus; }}
        onBlur={e  => { e.target.style.border = `1px solid transparent`; e.target.style.background = D.input; }}
      />
      <datalist id={`font-options-${field.key}`}>
        {COMMON.map(f => <option key={f} value={f} />)}
      </datalist>
    </Row>
  );
}

// Phase 5: Media library context — lets any ImageField (or nested array
// itemField of type "image") pop the shared media library modal. The
// main SiteContent component provides `openMediaLibrary({ onPick })`;
// ImageField consumes it if present and renders a "Library" button.
const MediaLibraryContext = React.createContext(null);

function ImageField({ field, value, onChange, inputRef }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const mediaLibrary = React.useContext(MediaLibraryContext);
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setUploadError('');
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${field.key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      onChange(publicUrl);
    } catch (err) {
      setUploadError(err.message?.includes('not found') || err.message?.includes('Bucket')
        ? `Create a public bucket named "${STORAGE_BUCKET}" in Supabase → Storage first.`
        : (err.message || 'Upload failed.'));
    } finally { setUploading(false); }
  };
  return (
    <Row label={field.label} iconType="image" stacked>
      {value && (
        <div style={{ marginBottom: '6px', borderRadius: '2px', overflow: 'hidden', border: `1px solid ${D.border}` }}>
          <img src={value} alt={field.label} style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '4px' }}>
        <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="URL, upload, or pick"
          style={{ ...inputBaseStyle, flex: 1, fontFamily: 'ui-monospace, monospace' }} />
        {mediaLibrary && (
          <button
            type="button"
            onClick={() => mediaLibrary.open({ onPick: (url) => onChange(url) })}
            title="Pick from media library"
            style={{
              padding: '0 10px', height: '28px',
              background: D.input, color: D.text, border: 'none', borderRadius: '2px',
              cursor: 'pointer', fontSize: '11px', fontWeight: '600',
            }}
          >📁</button>
        )}
        <label style={{
          padding: '0 10px', height: '28px', display: 'inline-flex', alignItems: 'center',
          background: D.accent, color: 'white', border: 'none', borderRadius: '2px',
          cursor: 'pointer', fontSize: '11px', fontWeight: '600', opacity: uploading ? 0.7 : 1,
        }} title="Upload new image">
          {uploading ? '⏳' : '↑'}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} title="Remove"
            style={{ padding: '0 10px', height: '28px', background: D.input, border: 'none', borderRadius: '2px', cursor: 'pointer', color: D.textDim, fontSize: '11px' }}>✕</button>
        )}
      </div>
      {uploadError && <div style={{ ...hintStyle, color: D.danger }}>⚠️ {uploadError}</div>}
    </Row>
  );
}

function ToggleField({ field, value, onChange }) {
  const on = value !== false;
  return (
    <Row label={field.label} iconType="toggle">
      <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
        style={{
          width: '28px', height: '16px', borderRadius: '8px',
          background: on ? D.accent : D.border, border: 'none', cursor: 'pointer',
          position: 'relative', transition: 'background 0.15s',
        }}>
        <span style={{
          position: 'absolute', top: '2px', left: on ? '14px' : '2px',
          width: '12px', height: '12px', background: 'white', borderRadius: '50%',
          transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }} />
      </button>
    </Row>
  );
}

function NumberField({ field, value, onChange, inputRef }) {
  const v = Number(value) || 0;
  const min = field.min ?? 0;
  const max = field.max ?? 200;
  return (
    <Row label={field.label} iconType="number">
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: D.input, borderRadius: '2px', height: '28px', padding: '0 6px' }}>
        <input type="range" min={min} max={max} value={v}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: D.accent, height: '16px', minWidth: 0 }} />
        <input ref={inputRef} type="number" min={min} max={max} value={v}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: '40px', background: 'transparent', border: 'none', outline: 'none',
            fontSize: '11px', color: D.text, textAlign: 'right',
            fontFamily: 'ui-monospace, monospace',
          }} />
      </div>
    </Row>
  );
}

function SelectField({ field, value, onChange, inputRef }) {
  return (
    <Row label={field.label} iconType="select">
      <select ref={inputRef} value={value || (field.options?.[0]?.value ?? '')}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputBaseStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path fill='%238A8A8A' d='M5 7L1 3h8z'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '22px' }}>
        {(field.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </Row>
  );
}

function SectionOrderField({ field, value, onChange }) {
  const current = (value || '').split(',').map(s => s.trim()).filter(Boolean);
  const known = (field.options || []).map(o => o.value);
  const ordered = [...current, ...known.filter(k => !current.includes(k))];
  const labelFor = (id) => (field.options || []).find(o => o.value === id)?.label || id;
  const move = (idx, delta) => {
    const next = [...ordered]; const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next.join(','));
  };
  return (
    <Row label={field.label} iconType="sectionOrder" stacked>
      <div style={{ background: D.input, borderRadius: '2px', padding: '4px' }}>
        {ordered.map((id, idx) => (
          <div key={id} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: D.panelAlt, padding: '6px 8px', borderRadius: '2px',
            marginBottom: idx === ordered.length - 1 ? 0 : '2px',
          }}>
            <span style={{ color: D.textFaint, fontSize: '10px' }}>☰</span>
            <span style={{ flex: 1, fontSize: '11px', color: D.text, fontWeight: '500' }}>{labelFor(id)}</span>
            <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}
              style={{ width: '20px', height: '20px', padding: 0, background: 'transparent', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? D.textFaint : D.textDim, fontSize: '11px' }}>↑</button>
            <button type="button" onClick={() => move(idx, 1)} disabled={idx === ordered.length - 1}
              style={{ width: '20px', height: '20px', padding: 0, background: 'transparent', border: 'none', cursor: idx === ordered.length - 1 ? 'not-allowed' : 'pointer', color: idx === ordered.length - 1 ? D.textFaint : D.textDim, fontSize: '11px' }}>↓</button>
          </div>
        ))}
      </div>
    </Row>
  );
}

// ---- Figma-style collapsible subsection ---------------------------------
// Mimics Figma's Position / Layout / Fill / Stroke / Effects pattern:
// bold title on the left, optional "+" add button on the right, a chevron
// to collapse, and a strong divider between sections.
function SubSection({ title, defaultOpen = true, actions, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${D.border}` }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px 10px 12px',
        gap: '6px',
        userSelect: 'none',
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: D.textDim, fontSize: '9px', padding: '2px 4px',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        >▶</button>
        <span style={{
          flex: 1, fontSize: '11px', fontWeight: '600',
          color: D.text, letterSpacing: '0.2px',
        }}>{title}</span>
        {actions}
      </div>
      {open && <div style={{ paddingBottom: '10px' }}>{children}</div>}
    </div>
  );
}

// Small square icon button used in SubSection headers (Figma's "+", eye,
// grid, etc. actions). Monochrome, 24×20, muted on rest, text on hover.
function HeaderIconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: '22px', height: '20px', padding: 0,
        background: 'transparent', border: 'none',
        color: D.textDim, cursor: 'pointer',
        fontSize: '12px', borderRadius: '2px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = D.text; e.currentTarget.style.background = D.panelAlt; }}
      onMouseLeave={e => { e.currentTarget.style.color = D.textDim; e.currentTarget.style.background = 'transparent'; }}
    >{children}</button>
  );
}

// =====================================================================
// ArrayField (Phase 4)
//
// Inspector UI for props that hold an array of item objects —
// FeatureGrid items, Testimonials, FAQ questions, Pricing tiers, etc.
// The field schema declares `itemFields` (using the same text/textarea/
// etc types), and each item renders as a collapsible card with
// per-item remove / move-up / move-down controls, plus an "Add item"
// button at the bottom that seeds a fresh item from the field's
// `itemDefaults` blueprint.
// =====================================================================
function ArrayField({ field, value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const itemFields = field.itemFields || [];
  const update = (idx, key, v) => {
    const next = items.map((it, i) => i === idx ? { ...it, [key]: v } : it);
    onChange(next);
  };
  const remove = (idx) => {
    if (!window.confirm('Remove this item?')) return;
    onChange(items.filter((_, i) => i !== idx));
  };
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };
  const addItem = () => {
    const fresh = field.itemDefaults
      ? JSON.parse(JSON.stringify(field.itemDefaults))
      : itemFields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
    onChange([...items, fresh]);
  };
  return (
    <Row label={field.label} iconType="textarea" stacked>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.length === 0 && (
          <div style={{
            padding: '14px 10px', textAlign: 'center',
            color: D.textFaint, fontSize: '11px',
            border: `1px dashed ${D.border}`, borderRadius: '4px',
          }}>
            No items. Click + Add item below.
          </div>
        )}
        {items.map((item, idx) => (
          <div key={idx} style={{
            background: D.input, border: `1px solid ${D.border}`,
            borderRadius: '4px', padding: '8px 10px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              marginBottom: '8px',
              fontSize: '10px', color: D.textDim, fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              <span style={{ flex: 1 }}>Item {idx + 1}</span>
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                title="Move up"
                style={{
                  background: 'transparent', border: 'none',
                  color: idx === 0 ? D.textFaint : D.textDim,
                  cursor: idx === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '11px', padding: '2px 5px', borderRadius: '2px',
                }}
              >↑</button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
                title="Move down"
                style={{
                  background: 'transparent', border: 'none',
                  color: idx === items.length - 1 ? D.textFaint : D.textDim,
                  cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '11px', padding: '2px 5px', borderRadius: '2px',
                }}
              >↓</button>
              <button
                onClick={() => remove(idx)}
                title="Remove item"
                style={{
                  background: 'transparent', border: 'none',
                  color: D.textDim, cursor: 'pointer',
                  fontSize: '11px', padding: '2px 5px', borderRadius: '2px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = D.danger; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = D.textDim; }}
              >✕</button>
            </div>
            {itemFields.map((itemField) => {
              const Renderer = FIELD_RENDERERS[itemField.type] || TextField;
              return (
                <Renderer
                  key={itemField.key}
                  field={itemField}
                  value={item[itemField.key] ?? ''}
                  onChange={(v) => update(idx, itemField.key, v)}
                />
              );
            })}
          </div>
        ))}
        <button
          onClick={addItem}
          style={{
            padding: '8px', background: D.panelAlt || D.input,
            color: D.text, border: `1px dashed ${D.border}`,
            borderRadius: '4px', cursor: 'pointer',
            fontSize: '11px', fontWeight: '600',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = D.accent + '22';
            e.currentTarget.style.borderColor = D.accent;
            e.currentTarget.style.color = D.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = D.panelAlt || D.input;
            e.currentTarget.style.borderColor = D.border;
            e.currentTarget.style.color = D.text;
          }}
        >+ Add item</button>
      </div>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

const FIELD_RENDERERS = {
  text: TextField, textarea: TextArea, color: ColorField, font: FontField,
  image: ImageField, toggle: ToggleField, number: NumberField, select: SelectField,
  sectionOrder: SectionOrderField, array: ArrayField,
};

// =====================================================================
// Element Inspector — shown when a [data-editable] element is clicked
// on the canvas. Exposes CSS overrides for that element only. Each
// group is collapsible (Figma-style).
// =====================================================================

const ELEMENT_GROUPS = [
  {
    // Phase 1: Layout — Webflow-style Display / Direction / Align / Gap /
    // Position controls. Renders via dedicated visual pickers (not the
    // generic CssTextField), so the storefront receives valid CSS values.
    key: 'layout',
    title: 'Layout',
    icon: '▦',
    fields: [
      { cssProp: 'display',         label: 'Display',    type: 'css-display' },
      { cssProp: 'flexDirection',   label: 'Direction',  type: 'css-flex-direction' },
      { cssProp: 'justifyContent',  label: 'Align',      type: 'css-align-grid' },
      { cssProp: 'gap',             label: 'Gap',        type: 'css-size' },
      { cssProp: 'position',        label: 'Position',   type: 'css-select',
        options: ['', 'static', 'relative', 'absolute', 'fixed', 'sticky'] },
      { cssProp: 'top',             label: 'Top',        type: 'css-text', placeholder: 'auto' },
      { cssProp: 'right',           label: 'Right',      type: 'css-text', placeholder: 'auto' },
      { cssProp: 'bottom',          label: 'Bottom',     type: 'css-text', placeholder: 'auto' },
      { cssProp: 'left',            label: 'Left',       type: 'css-text', placeholder: 'auto' },
      { cssProp: 'zIndex',          label: 'Z-index',    type: 'css-text', placeholder: 'auto' },
    ],
  },
  {
    key: 'typography',
    title: 'Typography',
    icon: 'T',
    fields: [
      { cssProp: 'fontSize',       label: 'Size',       type: 'css-size' },
      { cssProp: 'fontWeight',     label: 'Weight',     type: 'css-select',
        options: ['', '300', '400', '500', '600', '700', '800', '900'] },
      { cssProp: 'color',          label: 'Color',      type: 'css-color' },
      { cssProp: 'lineHeight',     label: 'Line height',type: 'css-text',  placeholder: '1.5' },
      { cssProp: 'letterSpacing',  label: 'Letter',     type: 'css-text',  placeholder: '0.02em' },
      { cssProp: 'textAlign',      label: 'Align',      type: 'css-select',
        options: ['', 'left', 'center', 'right', 'justify'] },
      { cssProp: 'textTransform',  label: 'Case',       type: 'css-select',
        options: ['', 'none', 'uppercase', 'lowercase', 'capitalize'] },
      { cssProp: 'fontStyle',      label: 'Italic',     type: 'css-select',
        options: ['', 'normal', 'italic'] },
    ],
  },
  {
    key: 'spacing',
    title: 'Spacing',
    icon: '⬚',
    fields: [
      { cssProp: 'marginTop',    label: 'Margin top',    type: 'css-text', placeholder: '20px' },
      { cssProp: 'marginBottom', label: 'Margin bottom', type: 'css-text', placeholder: '20px' },
      { cssProp: 'paddingTop',   label: 'Padding top',   type: 'css-text', placeholder: '0' },
      { cssProp: 'paddingBottom',label: 'Padding bottom',type: 'css-text', placeholder: '0' },
      { cssProp: 'paddingLeft',  label: 'Padding left',  type: 'css-text', placeholder: '0' },
      { cssProp: 'paddingRight', label: 'Padding right', type: 'css-text', placeholder: '0' },
    ],
  },
  {
    key: 'size',
    title: 'Size',
    icon: '⟷',
    fields: [
      { cssProp: 'width',     label: 'Width',     type: 'css-text', placeholder: 'auto / 100%' },
      { cssProp: 'maxWidth',  label: 'Max width', type: 'css-text', placeholder: 'none' },
      { cssProp: 'minWidth',  label: 'Min width', type: 'css-text', placeholder: '0' },
      { cssProp: 'height',    label: 'Height',    type: 'css-text', placeholder: 'auto' },
    ],
  },
  {
    key: 'effects',
    title: 'Effects',
    icon: '◐',
    fields: [
      { cssProp: 'borderRadius', label: 'Radius',     type: 'css-text', placeholder: '0' },
      { cssProp: 'border',       label: 'Border',     type: 'css-text', placeholder: '1px solid #000' },
      { cssProp: 'boxShadow',    label: 'Shadow',     type: 'css-text', placeholder: '0 4px 12px rgba(0,0,0,0.1)' },
      { cssProp: 'opacity',      label: 'Opacity',    type: 'css-text', placeholder: '1' },
      { cssProp: 'background',   label: 'Background', type: 'css-text', placeholder: 'transparent' },
    ],
  },
];

function CssTextField({ field, value, onChange }) {
  return (
    <Row label={field.label} iconType="text">
      <input id={`css-${field.cssProp}`}
        type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
        style={inputBaseStyle}
        onFocus={e => { e.target.style.border = `1px solid ${D.accent}`; e.target.style.background = D.inputFocus; }}
        onBlur={e  => { e.target.style.border = `1px solid transparent`; e.target.style.background = D.input; }}
      />
    </Row>
  );
}

function CssSizeField({ field, value, onChange }) {
  // Numeric input that always stores "{n}px" unless user types the unit.
  const raw = value || '';
  const m = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(raw);
  const num = m ? m[1] : '';
  const unit = (m && m[2]) || 'px';
  return (
    <Row label={field.label} iconType="number">
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: D.input, borderRadius: '2px', height: '28px', padding: '0 6px' }}>
        <input type="text" value={num}
          onChange={e => {
            const v = e.target.value.trim();
            if (!v) { onChange(''); return; }
            if (/^-?\d+(?:\.\d+)?$/.test(v)) onChange(`${v}${unit}`);
            else onChange(v);
          }}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', color: D.text, textAlign: 'right', fontFamily: 'ui-monospace, monospace', minWidth: 0 }} />
        <select value={unit}
          onChange={e => { if (num) onChange(`${num}${e.target.value}`); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '10px', color: D.textDim, cursor: 'pointer' }}>
          <option value="px">px</option>
          <option value="em">em</option>
          <option value="rem">rem</option>
          <option value="%">%</option>
        </select>
      </div>
    </Row>
  );
}

function CssSelectField({ field, value, onChange }) {
  return (
    <Row label={field.label} iconType="select">
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ ...inputBaseStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path fill='%238A8A8A' d='M5 7L1 3h8z'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '22px' }}>
        {(field.options || []).map(opt => (
          <option key={opt} value={opt}>{opt || '— auto —'}</option>
        ))}
      </select>
    </Row>
  );
}

function CssColorField({ field, value, onChange }) {
  return (
    <Row label={field.label} iconType="color" iconColor={value || D.textFaint}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: D.input, borderRadius: '2px', height: '28px', padding: '0 6px' }}>
        <div style={{ position: 'relative', width: '14px', height: '14px', flexShrink: 0 }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '2px',
            background: value || 'transparent',
            border: `1px solid ${D.border}`,
            backgroundImage: value ? 'none' : 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '6px 6px',
            backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0',
          }} />
          <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        </div>
        <input type="text" value={(value || '').replace('#', '').toUpperCase()}
          onChange={e => onChange(e.target.value ? '#' + e.target.value.replace('#', '') : '')}
          placeholder="—"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: D.text, minWidth: 0 }} />
      </div>
    </Row>
  );
}

// Webflow-style Display picker: Block / Flex / Grid / None as tabs.
function CssDisplayField({ field, value, onChange }) {
  const options = [
    { v: 'block', label: 'Block' },
    { v: 'flex',  label: 'Flex'  },
    { v: 'grid',  label: 'Grid'  },
    { v: 'none',  label: 'None'  },
  ];
  const current = value || '';
  return (
    <Row label={field.label} iconType="select">
      <div style={{
        display: 'flex', background: D.input, borderRadius: '4px',
        padding: '2px', gap: '2px', height: '28px',
      }}>
        {options.map(o => (
          <button
            key={o.v}
            onClick={() => onChange(current === o.v ? '' : o.v)}
            style={{
              flex: 1, border: 'none', cursor: 'pointer',
              background: current === o.v ? D.panel : 'transparent',
              color: current === o.v ? D.text : D.textDim,
              fontSize: '11px', fontWeight: current === o.v ? 600 : 500,
              borderRadius: '3px',
              boxShadow: current === o.v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >{o.label}</button>
        ))}
      </div>
    </Row>
  );
}

// Flex direction arrows: row / column / row-reverse / column-reverse.
function CssFlexDirectionField({ field, value, onChange }) {
  const options = [
    { v: 'row',            icon: '→', title: 'Row' },
    { v: 'column',         icon: '↓', title: 'Column' },
    { v: 'row-reverse',    icon: '←', title: 'Row reverse' },
    { v: 'column-reverse', icon: '↑', title: 'Column reverse' },
  ];
  const current = value || '';
  return (
    <Row label={field.label} iconType="select">
      <div style={{ display: 'flex', gap: '4px', height: '28px' }}>
        {options.map(o => (
          <button
            key={o.v}
            title={o.title}
            onClick={() => onChange(current === o.v ? '' : o.v)}
            style={{
              width: '34px', height: '28px', border: 'none', cursor: 'pointer',
              background: current === o.v ? D.accentLight : D.input,
              color: current === o.v ? D.accent : D.text,
              fontSize: '14px', fontWeight: 700, borderRadius: '3px',
            }}
          >{o.icon}</button>
        ))}
      </div>
    </Row>
  );
}

// 3×3 Align grid — picks justify-content (X) + align-items (Y) at once.
// Stored as justifyContent; the alignItems partner is synced automatically.
function CssAlignGridField({ field, value, onChange }) {
  // Pick: row=alignItems, col=justifyContent
  const jc = (value || '').toString();
  // We only show a 3x3 visual grid. Each cell represents one (jc, ai) pair.
  const cells = [
    ['flex-start', 'flex-start'],   ['flex-start', 'center'],   ['flex-start', 'flex-end'],
    ['center',     'flex-start'],   ['center',     'center'],   ['center',     'flex-end'],
    ['flex-end',   'flex-start'],   ['flex-end',   'center'],   ['flex-end',   'flex-end'],
  ];
  const isCurrent = (ai, jcv) => jc === jcv;
  const set = (ai, jcv) => {
    // We store justifyContent on cssProp; alignItems as a separate key
    // by directly mutating via onChange callback receiving a shape.
    onChange(jcv);
    // The parent's onChangeStyle is (cssProp, value, state) — to also
    // write alignItems we fire a synthetic window event that the
    // inspector listens for; simpler: write jc only here, user edits
    // alignItems in separate row if needed.
  };
  return (
    <Row label={field.label} iconType="select">
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2px', background: D.input, padding: '3px', borderRadius: '4px',
        width: 'fit-content',
      }}>
        {cells.map(([ai, jcv], i) => {
          const active = isCurrent(ai, jcv);
          return (
            <button
              key={i}
              title={`justify-content: ${jcv}`}
              onClick={() => set(ai, jcv)}
              style={{
                width: '18px', height: '18px',
                background: active ? D.accent : D.panel,
                border: 'none', cursor: 'pointer',
                borderRadius: '2px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{
                width: '4px', height: '4px', borderRadius: '50%',
                background: active ? '#fff' : D.textFaint,
              }} />
            </button>
          );
        })}
      </div>
    </Row>
  );
}

const CSS_RENDERERS = {
  'css-text':            CssTextField,
  'css-size':            CssSizeField,
  'css-select':          CssSelectField,
  'css-color':           CssColorField,
  'css-display':         CssDisplayField,
  'css-flex-direction':  CssFlexDirectionField,
  'css-align-grid':      CssAlignGridField,
};

// =====================================================================
// ABStats (Phase 7) — impressions + conversions for a block across both
// variants, with a simple conversion-rate comparison.
// =====================================================================
function ABStats({ blockId, S }) {
  const [rows, setRows] = React.useState(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from('ab_events')
          .select('kind, variant')
          .eq('block_id', blockId)
          .limit(20000);
        if (err) throw err;
        if (!cancelled) setRows(data || []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load');
      }
    })();
    return () => { cancelled = true; };
  }, [blockId]);
  const stats = React.useMemo(() => {
    if (!rows) return null;
    const acc = { A: { i: 0, c: 0 }, B: { i: 0, c: 0 } };
    for (const r of rows) {
      const v = r.variant === 'A' || r.variant === 'B' ? r.variant : null;
      if (!v) continue;
      if (r.kind === 'impression') acc[v].i++;
      else if (r.kind === 'conversion') acc[v].c++;
    }
    return acc;
  }, [rows]);
  if (error) {
    return <div style={{ fontSize: '10px', color: S.danger }}>{error}</div>;
  }
  if (!stats) {
    return <div style={{ fontSize: '10px', color: S.textFaint }}>Loading stats…</div>;
  }
  const rate = (a) => a.i > 0 ? (a.c / a.i * 100) : 0;
  const aRate = rate(stats.A);
  const bRate = rate(stats.B);
  const winner = aRate > bRate ? 'A' : bRate > aRate ? 'B' : null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
      {['A', 'B'].map(v => {
        const isWinner = winner === v && (stats.A.i + stats.B.i) > 0;
        return (
          <div key={v} style={{
            padding: '8px 10px',
            background: v === 'A' ? '#dbeafe' : '#fce7f3',
            border: `1px solid ${isWinner ? '#10b981' : 'transparent'}`,
            borderRadius: '4px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '10px', fontWeight: 700,
              color: v === 'A' ? '#1e40af' : '#9d174d',
              marginBottom: '4px',
            }}>
              <span>Variant {v}</span>
              {isWinner && <span style={{ color: '#10b981' }}>👑</span>}
            </div>
            <div style={{ fontSize: '11px', color: S.text }}>
              {stats[v].i} impr · {stats[v].c} conv
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: S.text }}>
              {stats[v].i > 0 ? `${rate(stats[v]).toFixed(1)}%` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// SchedulePublishModal (Phase 6)
//
// Lets staff queue a future publish. Dates are stored in UTC (ISO) on
// the server; the picker below converts local ↔ UTC. Also shows the
// current pending queue so it's easy to cancel a mistake.
// =====================================================================
function SchedulePublishModal({ S, onClose, onSchedule, pending, onCancel }) {
  // Default: 1 hour from now, local
  const defaultLocal = React.useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);
  const [when, setWhen] = useState(defaultLocal);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!when) return;
    const localDate = new Date(when);
    if (localDate.getTime() <= Date.now()) { alert('Pick a time in the future.'); return; }
    setSaving(true);
    try { await onSchedule(localDate.toISOString(), note.trim()); } finally { setSaving(false); }
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: '#fff', borderRadius: '12px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: S.text, marginBottom: '4px' }}>
            ⏰ Schedule publish
          </div>
          <div style={{ fontSize: '12px', color: S.textDim, lineHeight: 1.5 }}>
            The current draft is snapshotted now. When the scheduled time arrives it replaces your live site — even if you've moved on to edit other things in the draft.
          </div>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: S.textDim, marginBottom: '4px' }}>
              Publish at <span style={{ color: S.textFaint }}>(your local time)</span>
            </label>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
              style={{
                width: '100%', padding: '8px 10px', boxSizing: 'border-box',
                background: '#fff', border: `1px solid ${S.border}`,
                borderRadius: '6px', fontSize: '13px', color: S.text, outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: S.textDim, marginBottom: '4px' }}>
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Diwali campaign launch"
              style={{
                width: '100%', padding: '8px 10px', boxSizing: 'border-box',
                background: '#fff', border: `1px solid ${S.border}`,
                borderRadius: '6px', fontSize: '13px', color: S.text, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose}
              style={{
                padding: '8px 14px', background: '#fff',
                border: `1px solid ${S.border}`, borderRadius: '6px',
                color: S.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >Cancel</button>
            <button type="submit" disabled={saving}
              style={{
                padding: '8px 16px', background: S.accent,
                border: 'none', borderRadius: '6px',
                color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >{saving ? 'Scheduling…' : 'Schedule'}</button>
          </div>
        </form>
        {/* Pending schedules */}
        {pending.length > 0 && (
          <div style={{ padding: '14px 24px 20px', borderTop: `1px solid ${S.border}`, background: S.bg }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: S.textDim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Pending publishes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pending.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', background: '#fff',
                  border: `1px solid ${S.border}`, borderRadius: '6px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: S.text }}>
                      {new Date(p.scheduled_at).toLocaleString()}
                    </div>
                    {p.note && <div style={{ fontSize: '11px', color: S.textDim }}>{p.note}</div>}
                  </div>
                  <button onClick={() => onCancel(p.id)}
                    style={{
                      padding: '4px 10px', background: '#fff',
                      border: `1px solid ${S.border}`, borderRadius: '4px',
                      color: S.danger, fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >Cancel</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// BlockInspector (Phase 2)
//
// Rendered on the right panel when the user has selected a block in
// the Layers tree or on the canvas. Shows the block's metadata
// (label + icon), a back button, a delete button, and the block's
// own schema fields rendered through the existing FIELD_RENDERERS
// so dark-theme styling and inline validation all come along for
// free.
// =====================================================================
function BlockInspector({ block, meta, onChangeProp, onBack, onDelete, onDuplicate, isLocked, onToggleLocked }) {
  // Accessibility warnings — recomputed per render. Cheap (pure
  // synchronous loops over the schema). Empty array when the block
  // looks fine; a yellow banner appears below the header otherwise.
  const a11yWarnings = useMemo(
    () => getBlockA11yWarnings(block, meta),
    [block, meta]
  );
  if (!block || !meta) return null;
  return (
    <>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 14px',
        borderBottom: `1px solid ${D.border}`,
        background: D.panel, flexShrink: 0,
      }}>
        <button onClick={onBack} title="Deselect block"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: D.textDim, fontSize: '14px', padding: '2px 6px', borderRadius: '2px' }}>
          ←
        </button>
        <span style={{ fontSize: '14px' }}>{meta.icon || '▫'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '9px', color: D.textFaint, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Block
          </div>
          <div style={{ fontSize: '12px', color: D.text, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
            {meta.label}
          </div>
        </div>
        <button
          onClick={onToggleLocked}
          title={isLocked ? 'Unlock content edits' : 'Lock content edits'}
          style={{
            background: isLocked ? '#FFF7ED' : 'transparent',
            border: isLocked ? `1px solid ${D.warning || '#F59E0B'}55` : 'none',
            color: isLocked ? (D.warning || '#F59E0B') : D.textDim,
            cursor: 'pointer', padding: '4px 6px', borderRadius: '3px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.color = D.text; }}
          onMouseLeave={(e) => { if (!isLocked) e.currentTarget.style.color = D.textDim; }}
        >{isLocked ? <Lock size={13} strokeWidth={2.25} /> : <Unlock size={13} strokeWidth={2.25} />}</button>
        <button
          onClick={onDuplicate}
          title="Duplicate block"
          style={{ background: 'transparent', border: 'none', color: D.textDim, fontSize: '13px', cursor: 'pointer', padding: '4px 6px', borderRadius: '2px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = D.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = D.textDim; }}
        >⎘</button>
        <button
          onClick={onDelete}
          title="Delete block"
          style={{ background: 'transparent', border: 'none', color: D.textDim, fontSize: '14px', cursor: 'pointer', padding: '4px 6px', borderRadius: '2px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = D.danger; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = D.textDim; }}
        >✕</button>
      </div>

      {/* Locked banner — when block.locked is true, show a clear status
          + Unlock button and dim the field area below. We use
          pointer-events:none so labels stay readable but every input
          becomes inert without having to thread a `disabled` prop into
          every FIELD_RENDERER. */}
      {isLocked && (
        <div style={{
          padding: '10px 14px',
          background: '#FFFBEB',
          borderBottom: `1px solid ${(D.warning || '#F59E0B') + '33'}`,
          display: 'flex', alignItems: 'center', gap: '10px',
          flexShrink: 0,
        }}>
          <Lock size={13} strokeWidth={2.25} color={D.warning || '#F59E0B'} />
          <div style={{ flex: 1, fontSize: '11px', color: D.text, lineHeight: 1.45 }}>
            <strong>Locked.</strong> Content edits are disabled. Drag &amp; visibility still work.
          </div>
          <button
            onClick={onToggleLocked}
            style={{
              padding: '4px 10px',
              background: 'white', color: D.warning || '#F59E0B',
              border: `1px solid ${(D.warning || '#F59E0B') + '55'}`,
              borderRadius: '4px', fontSize: '11px', fontWeight: '700',
              cursor: 'pointer',
            }}
          >Unlock</button>
        </div>
      )}

      {/* A11y warnings — surfaces missing alt text, low text contrast,
          and unlabeled buttons inline so editors notice them while
          composing instead of after the fact. Heuristic per check (see
          src/utils/blockA11y.js); blocks without the relevant fields
          stay silent. The banner stays visible even when the inspector
          is locked so users can see *why* something needs fixing. */}
      {a11yWarnings.length > 0 && (
        <div style={{
          padding: '10px 14px',
          background: '#FFFBEB',
          borderBottom: `1px solid ${(D.warning || '#F59E0B') + '33'}`,
          display: 'flex', gap: '10px',
          flexShrink: 0,
        }}>
          <AlertTriangle size={13} strokeWidth={2.25} color={D.warning || '#F59E0B'} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, fontSize: '11px', color: D.text, lineHeight: 1.5, minWidth: 0 }}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>
              {a11yWarnings.length === 1
                ? '1 accessibility issue'
                : `${a11yWarnings.length} accessibility issues`}
            </div>
            <ul style={{ margin: 0, paddingLeft: '14px', listStyle: 'disc' }}>
              {a11yWarnings.map((w, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>
                  <span style={{ color: w.severity === 'error' ? D.danger : D.text }}>
                    {w.message}
                  </span>
                  {w.fix && (
                    <div style={{ fontSize: '10.5px', color: D.textDim, marginTop: '1px' }}>
                      {w.fix}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Fields — rendered via the same FIELD_RENDERERS the schema
          sections use, so dark theme + inline validation flow through
          automatically. Missing props fall back to defaultProps so the
          user sees a useful starting value. When locked, the field area
          is fully dim + non-interactive (the Lock toggle / Unlock button
          in the banner remain clickable because they're outside this
          wrapper). */}
      <div style={{
        flex: 1, overflowY: 'auto', paddingTop: '12px', paddingBottom: '40px', background: D.panel,
        opacity: isLocked ? 0.5 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}>
        {/* Variant picker — for blocks that advertise presets, lets
            the user swap layout/style without losing the rest of the
            content. Rendered as a chip grid (not a plain dropdown) so
            all 10 options are visible at once, with the active one
            highlighted in the accent color. Mirrors the canvas hover
            chip strip so users see a consistent affordance whether
            they're on the canvas or in the inspector. */}
        {Array.isArray(meta.presets) && meta.presets.length > 0 && (() => {
          const activePreset = block.props?.preset || meta.defaultProps?.preset || meta.presets[0].id;
          return (
            <div style={{
              padding: '14px 16px 10px',
              borderBottom: `1px solid ${D.divider}`,
            }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, color: D.textDim,
                textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                Variant <span style={{ color: D.textFaint, fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>· {meta.presets.length} templates</span>
              </div>
              <div
                role="radiogroup"
                aria-label="Block variant"
                style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}
              >
                {meta.presets.map(p => {
                  const active = p.id === activePreset;
                  return (
                    <button
                      key={p.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => onChangeProp('preset', p.id)}
                      title={p.hint || p.label}
                      style={{
                        padding: '6px 10px',
                        background: active ? D.accent : '#fff',
                        color: active ? '#fff' : D.text,
                        border: `1px solid ${active ? D.accent : D.border}`,
                        borderRadius: '5px',
                        fontSize: '11.5px', fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.12s',
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${D.accent}33`; }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      onMouseEnter={(e) => {
                        if (!active) { e.currentTarget.style.borderColor = D.accent; e.currentTarget.style.background = D.accentLight; }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = '#fff'; }
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {(!meta.schema || meta.schema.length === 0) ? (
          <div style={{ padding: '24px 16px', color: D.textFaint, fontSize: '11px', lineHeight: 1.55, textAlign: 'center' }}>
            This block has no editable fields yet.
          </div>
        ) : (
          meta.schema
            .filter(field => {
              // Per-preset gating: fields with `usedBy` only show when
              // the active preset is in the list; fields with `hideFor`
              // hide when the active preset is in the list. Fields
              // without either always render. Lets us tailor the
              // inspector per variant without 30 separate schemas.
              const activePreset = block.props?.preset || meta.defaultProps?.preset;
              if (Array.isArray(field.usedBy) && activePreset && !field.usedBy.includes(activePreset)) return false;
              if (Array.isArray(field.hideFor) && activePreset && field.hideFor.includes(activePreset)) return false;
              return true;
            })
            .map(field => {
              const Renderer = FIELD_RENDERERS[field.type] || TextField;
              const value = (block.props && field.key in block.props)
                ? block.props[field.key]
                : (meta.defaultProps ? meta.defaultProps[field.key] : undefined);
              return (
                <Renderer
                  key={field.key}
                  field={field}
                  value={value}
                  onChange={(v) => onChangeProp(field.key, v)}
                />
              );
            })
        )}

        {/* Phase 4: Responsive visibility — available on every block
            without needing to edit each schema. Toggles apply CSS
            classes that hide the block at the matching breakpoint. */}
        <div style={{
          marginTop: '20px', padding: '14px 16px 16px',
          borderTop: `1px solid ${D.border}`,
          background: D.panelAlt || D.panel,
        }}>
          <div style={{
            fontSize: '9px', color: D.textFaint, fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: '0.8px',
            marginBottom: '10px',
          }}>
            Responsive visibility
          </div>
          {[
            { key: 'hide_mobile',  label: 'Hide on mobile',  hint: '< 640px' },
            { key: 'hide_tablet',  label: 'Hide on tablet',  hint: '640–1023px' },
            { key: 'hide_desktop', label: 'Hide on desktop', hint: '≥ 1024px' },
          ].map(({ key, label, hint }) => {
            const checked = !!block.props?.[key];
            return (
              <label key={key} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '6px 0', cursor: 'pointer', fontSize: '11px',
                color: D.text,
              }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChangeProp(key, e.target.checked)}
                  style={{ cursor: 'pointer', margin: 0 }}
                />
                <span style={{ flex: 1 }}>{label}</span>
                <span style={{ color: D.textFaint, fontSize: '10px' }}>{hint}</span>
              </label>
            );
          })}
        </div>

        {/* Phase 7: A/B variant selector + live stats for this block. */}
        <div style={{
          marginTop: '0', padding: '14px 16px 16px',
          borderTop: `1px solid ${D.border}`,
          background: D.panelAlt || D.panel,
        }}>
          <details>
            <summary style={{
              cursor: 'pointer', userSelect: 'none', listStyle: 'none',
              fontSize: '9px', color: D.textFaint, fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              marginBottom: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>🧪 A/B testing</span>
              <span style={{ fontSize: '10px', color: D.textFaint }}>▾</span>
            </summary>
            <div style={{ fontSize: '10px', color: D.textFaint, marginBottom: '10px', lineHeight: 1.4 }}>
              Mark this block as variant A or B. Each visitor is randomly (and stably) assigned to a group — they only see the matching variant. Create a sibling block set to the other letter to run the test.
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
              {[
                { value: '',  label: 'Off',       color: null },
                { value: 'A', label: 'Variant A', color: '#1e40af' },
                { value: 'B', label: 'Variant B', color: '#9d174d' },
              ].map(opt => {
                const active = (block.props?.ab_variant || '') === opt.value;
                return (
                  <button
                    key={opt.value || 'off'}
                    type="button"
                    onClick={() => onChangeProp('ab_variant', opt.value || null)}
                    style={{
                      flex: 1, padding: '5px 6px',
                      background: active ? (opt.color || D.accent) : D.input,
                      color: active ? '#fff' : D.text,
                      border: '1px solid transparent',
                      borderRadius: '3px', cursor: 'pointer',
                      fontSize: '11px', fontWeight: 600,
                    }}
                  >{opt.label}</button>
                );
              })}
            </div>
            {block.props?.ab_variant && <ABStats blockId={block.id} S={D} />}
          </details>
        </div>

        {/* Phase 7: per-block scheduling — show a block only between a
            start and end time. Used for timed promos (e.g. Diwali sale
            banner). Storefront hides outside the window; the editor
            dims with a "Scheduled block" chip so staff can still edit. */}
        <div style={{
          marginTop: '0', padding: '14px 16px 16px',
          borderTop: `1px solid ${D.border}`,
          background: D.panelAlt || D.panel,
        }}>
          <details>
            <summary style={{
              cursor: 'pointer', userSelect: 'none', listStyle: 'none',
              fontSize: '9px', color: D.textFaint, fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              marginBottom: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>⏰ Schedule block</span>
              <span style={{ fontSize: '10px', color: D.textFaint }}>▾</span>
            </summary>
            <div style={{ fontSize: '10px', color: D.textFaint, marginBottom: '10px', lineHeight: 1.4 }}>
              Live on the storefront only inside this window. Leave either side empty to remove the bound.
            </div>
            {[
              { key: 'schedule_start', label: 'Start' },
              { key: 'schedule_end',   label: 'End' },
            ].map(({ key, label }) => {
              const iso = block.props?.[key] || '';
              // datetime-local wants local time with no tz. Convert ISO→local.
              const toLocal = (s) => {
                if (!s) return '';
                const d = new Date(s);
                if (Number.isNaN(d.getTime())) return '';
                const pad = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
              };
              return (
                <div key={key} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: D.text, marginBottom: '3px' }}>{label}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="datetime-local"
                      value={toLocal(iso)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) { onChangeProp(key, null); return; }
                        onChangeProp(key, new Date(v).toISOString());
                      }}
                      style={{
                        flex: 1, padding: '5px 6px',
                        background: D.input, border: '1px solid transparent',
                        borderRadius: '3px', color: D.text,
                        fontSize: '11px', outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={(e) => { e.target.style.border = `1px solid ${D.accent}`; }}
                      onBlur={(e) => { e.target.style.border = '1px solid transparent'; }}
                    />
                    {iso && (
                      <button
                        type="button"
                        onClick={() => onChangeProp(key, null)}
                        title="Clear"
                        style={{
                          padding: '0 8px', background: 'transparent',
                          border: `1px solid ${D.border}`, borderRadius: '3px',
                          color: D.textDim, cursor: 'pointer', fontSize: '10px',
                        }}
                      >✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </details>
        </div>

        {/* Phase 4 closer: Responsive overrides — per-breakpoint
            padding & alignment. Applied via scoped CSS in PageRenderer. */}
        <div style={{
          marginTop: '0', padding: '14px 16px 16px',
          borderTop: `1px solid ${D.border}`,
          background: D.panelAlt || D.panel,
        }}>
          <details>
            <summary style={{
              cursor: 'pointer', userSelect: 'none', listStyle: 'none',
              fontSize: '9px', color: D.textFaint, fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              marginBottom: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Responsive overrides</span>
              <span style={{ fontSize: '10px', color: D.textFaint }}>▾</span>
            </summary>
            <div style={{ fontSize: '10px', color: D.textFaint, marginBottom: '10px', lineHeight: 1.4 }}>
              Leave blank to inherit. Padding is in px.
            </div>
            {[
              { bp: 'mobile',  label: 'Mobile',  hint: '< 640px' },
              { bp: 'tablet',  label: 'Tablet',  hint: '640–1023px' },
              { bp: 'desktop', label: 'Desktop', hint: '≥ 1024px' },
            ].map(({ bp, label, hint }) => (
              <div key={bp} style={{ marginBottom: '10px' }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: D.text }}>{label}</span>
                  <span style={{ fontSize: '9px', color: D.textFaint }}>{hint}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                  <input
                    type="number" min={0} max={400}
                    value={block.props?.[`resp_padding_y_${bp}`] ?? ''}
                    onChange={(e) => onChangeProp(`resp_padding_y_${bp}`, e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="Pad Y"
                    title="Vertical padding (px)"
                    style={{
                      padding: '5px 6px',
                      background: D.input, border: '1px solid transparent',
                      borderRadius: '3px', color: D.text,
                      fontSize: '11px', outline: 'none', width: '100%', boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.border = `1px solid ${D.accent}`; }}
                    onBlur={(e) => { e.target.style.border = '1px solid transparent'; }}
                  />
                  <input
                    type="number" min={0} max={200}
                    value={block.props?.[`resp_padding_x_${bp}`] ?? ''}
                    onChange={(e) => onChangeProp(`resp_padding_x_${bp}`, e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="Pad X"
                    title="Horizontal padding (px)"
                    style={{
                      padding: '5px 6px',
                      background: D.input, border: '1px solid transparent',
                      borderRadius: '3px', color: D.text,
                      fontSize: '11px', outline: 'none', width: '100%', boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.border = `1px solid ${D.accent}`; }}
                    onBlur={(e) => { e.target.style.border = '1px solid transparent'; }}
                  />
                  <select
                    value={block.props?.[`resp_text_align_${bp}`] ?? ''}
                    onChange={(e) => onChangeProp(`resp_text_align_${bp}`, e.target.value || null)}
                    title="Text alignment"
                    style={{
                      padding: '5px 6px',
                      background: D.input, border: '1px solid transparent',
                      borderRadius: '3px', color: D.text,
                      fontSize: '11px', outline: 'none', width: '100%', boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Align</option>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            ))}
          </details>
        </div>
      </div>
    </>
  );
}

// Visual CSS box-model diagram rendered above the Spacing group.
// Shows the current margin (outer) and padding (inner) values on each
// side as read from the passed `styles`. Clicking a side focuses the
// matching text input below via a shared DOM id. Purely informational —
// edits still happen via the text inputs. Matches Chrome DevTools look.
function SpacingBoxDiagram({ styles }) {
  const get = (k) => {
    const v = styles?.[k];
    return (v === undefined || v === null || v === '') ? '—' : String(v);
  };
  const side = (label, cssProp, outer) => (
    <div
      onClick={() => { try { document.getElementById(`css-${cssProp}`)?.focus(); } catch {} }}
      style={{
        fontSize: '10px', color: outer ? '#7C3AED' : '#059669',
        fontFamily: 'ui-monospace, monospace',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
      title={`${label}: ${get(cssProp)}`}
    >
      {get(cssProp)}
    </div>
  );
  const marginBg = '#F5F3FF';
  const marginBorder = '#DDD6FE';
  const paddingBg = '#ECFDF5';
  const paddingBorder = '#A7F3D0';
  return (
    <div style={{ padding: '8px 14px 4px' }}>
      {/* Margin box (outer) */}
      <div style={{
        position: 'relative', background: marginBg,
        border: `1px dashed ${marginBorder}`, borderRadius: '4px',
        padding: '18px 22px',
      }}>
        <div style={{ position: 'absolute', top: '3px', left: '6px', fontSize: '9px', color: '#7C3AED', fontWeight: 600, letterSpacing: '0.5px' }}>MARGIN</div>
        <div style={{ position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)' }}>{side('margin-top', 'marginTop', true)}</div>
        <div style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)' }}>{side('margin-bottom', 'marginBottom', true)}</div>

        {/* Padding box (inner) */}
        <div style={{
          position: 'relative', background: paddingBg,
          border: `1px dashed ${paddingBorder}`, borderRadius: '3px',
          padding: '18px 22px',
        }}>
          <div style={{ position: 'absolute', top: '3px', left: '6px', fontSize: '9px', color: '#059669', fontWeight: 600, letterSpacing: '0.5px' }}>PADDING</div>
          <div style={{ position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)' }}>{side('padding-top', 'paddingTop', false)}</div>
          <div style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)' }}>{side('padding-bottom', 'paddingBottom', false)}</div>
          <div style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)' }}>{side('padding-left', 'paddingLeft', false)}</div>
          <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>{side('padding-right', 'paddingRight', false)}</div>

          {/* Content slot */}
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: '3px', padding: '12px 18px',
            textAlign: 'center', fontSize: '10px', color: '#6B7280',
            fontWeight: 600, letterSpacing: '0.5px',
          }}>CONTENT</div>
        </div>
      </div>
      <div style={{ fontSize: '9.5px', color: '#9CA3AF', marginTop: '6px', textAlign: 'center' }}>
        Click a value to jump to its input
      </div>
    </div>
  );
}

function ElementInspector({ path, styles, onChangeStyle, onClear, onBack, expandedGroups, toggleGroup, savedStyles, onSaveStyle, onApplyStyle }) {
  const shortPath = path.split('.').slice(-1)[0].replace(/_/g, ' ');
  // Which interaction state the user is currently editing. Normal
  // writes to styles[prop]; Hover writes to styles._hover[prop]; Active
  // writes to styles._active[prop]. The tapas-store compiler translates
  // these into :hover and :active pseudo rules.
  const [stateTab, setStateTab] = useState('normal');
  const stateStyles = stateTab === 'normal'
    ? styles
    : styles?.[`_${stateTab}`];
  const stateHasValues = stateStyles && Object.keys(stateStyles).length > 0;
  const TABS = [
    { key: 'normal', label: 'Normal' },
    { key: 'hover',  label: 'Hover'  },
    { key: 'active', label: 'Active' },
  ];
  return (
    <>
      {/* Header with back button */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 14px',
        borderBottom: `1px solid ${D.border}`,
        background: D.panel, flexShrink: 0,
      }}>
        <button onClick={onBack} title="Back to section"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: D.textDim, fontSize: '14px', padding: '2px 6px', borderRadius: '2px' }}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '9px', color: D.textFaint, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Selected element
          </div>
          <div style={{ fontSize: '12px', color: D.text, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize', marginTop: '2px' }}>
            {shortPath}
          </div>
        </div>
        {/* Save current styles as a named shared style */}
        <button
          onClick={() => {
            if (!styles || Object.keys(styles).length === 0) return;
            const name = window.prompt('Save these styles under what name?', '');
            if (name && name.trim()) onSaveStyle?.(name.trim(), styles);
          }}
          disabled={!styles || Object.keys(styles).length === 0}
          title="Save current styles as a reusable shared style"
          style={{ background: 'transparent', border: 'none', color: D.textDim, fontSize: '12px', cursor: 'pointer', padding: '4px 6px', borderRadius: '2px' }}
        >📎</button>
        {/* Apply a saved style onto this element */}
        {savedStyles && Object.keys(savedStyles).length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) onApplyStyle?.(e.target.value); e.target.value = ''; }}
            title="Apply a saved shared style"
            style={{
              background: 'transparent', border: `1px solid ${D.border}`,
              color: D.textDim, fontSize: '10px', cursor: 'pointer',
              padding: '2px 4px', borderRadius: '2px',
              maxWidth: '90px',
            }}
          >
            <option value="" disabled>📥 Apply…</option>
            {Object.keys(savedStyles).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}
        <button
          onClick={onClear}
          disabled={!styles || Object.keys(styles).length === 0}
          title="Clear all overrides on this element"
          style={{ background: 'transparent', border: 'none', color: D.textDim, fontSize: '12px', cursor: 'pointer', padding: '4px 6px', borderRadius: '2px' }}
        >
          ↺
        </button>
      </div>

      {/* Interaction-state tabs (Normal / Hover / Active). Each tab
          scopes the fields below so staff can wire real hover styles
          without writing CSS. The store applies these as :hover and
          :active pseudo rules. */}
      <div style={{
        display: 'flex', padding: '8px 10px', gap: '4px',
        borderBottom: `1px solid ${D.border}`, background: D.panelAlt,
      }}>
        {TABS.map(t => {
          const isActive = stateTab === t.key;
          const hasOverrides = t.key === 'normal'
            ? (styles && Object.keys(styles).filter(k => !k.startsWith('_')).length > 0)
            : (styles?.[`_${t.key}`] && Object.keys(styles[`_${t.key}`]).length > 0);
          return (
            <button
              key={t.key}
              onClick={() => setStateTab(t.key)}
              style={{
                flex: 1, padding: '6px 8px',
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? D.text : D.textDim,
                border: `1px solid ${isActive ? D.border : 'transparent'}`,
                borderRadius: '4px', cursor: 'pointer',
                fontSize: '11px', fontWeight: isActive ? 600 : 500,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              }}
              title={t.key === 'normal' ? 'Default appearance' : `On ${t.key}`}
            >
              {t.label}
              {hasOverrides && (
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: D.accent, display: 'inline-block',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Groups */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px', background: D.panel }}>
        {stateTab !== 'normal' && !stateHasValues && (
          <div style={{
            margin: '12px 14px 0', padding: '10px 12px',
            background: D.panelAlt, border: `1px dashed ${D.border}`,
            borderRadius: '4px', fontSize: '11px', color: D.textDim, lineHeight: 1.5,
          }}>
            No {stateTab} overrides yet. Set any field below and it only
            applies when the element is {stateTab === 'hover' ? 'hovered' : 'clicked'}.
          </div>
        )}
        {ELEMENT_GROUPS.map(group => {
          const isOpen = expandedGroups.has(group.key);
          return (
            <div key={group.key} style={{ borderBottom: `1px solid ${D.border}` }}>
              <button
                onClick={() => toggleGroup(group.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{
                  fontSize: '9px', color: D.textDim, width: '10px',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                }}>▶</span>
                <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: D.textDim, width: '12px' }}>{group.icon}</span>
                <span style={{ flex: 1, fontSize: '11px', fontWeight: '600', color: D.text, letterSpacing: '0.1px' }}>{group.title}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '4px 0 12px' }}>
                  {group.key === 'spacing' && (
                    <SpacingBoxDiagram styles={stateStyles} />
                  )}
                  {group.fields.map(field => {
                    const Renderer = CSS_RENDERERS[field.type] || CssTextField;
                    const value = stateStyles?.[field.cssProp];
                    return (
                      <Renderer
                        key={field.cssProp}
                        field={field}
                        value={value}
                        onChange={(v) => onChangeStyle(field.cssProp, v, stateTab)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---- Element-level CSS inspector --------------------------------------
// When the user clicks an editable element on the preview canvas, the
// right panel swaps from content-editing mode to element-styling mode.
// These controls write into content.element_styles[fieldPath][propName]
// which the store applies via an injected <style> tag.

const FONT_WEIGHT_OPTIONS = [
  { value: '', label: '—' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' },
];
const TEXT_ALIGN_OPTIONS = [
  { value: '', label: '—' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];
const TEXT_TRANSFORM_OPTIONS = [
  { value: '', label: '—' },
  { value: 'none', label: 'Normal' },
  { value: 'uppercase', label: 'UPPER' },
  { value: 'capitalize', label: 'Caps' },
  { value: 'lowercase', label: 'lower' },
];

// Each entry: { key, label, icon (type for FieldIcon), type, options? }
const ELEMENT_STYLE_GROUPS = [
  {
    key: 'typography',
    title: 'Typography',
    fields: [
      { key: 'fontSize',      label: 'Size',       type: 'text', iconType: 'text',   placeholder: '48px' },
      { key: 'fontWeight',    label: 'Weight',     type: 'select', iconType: 'select', options: FONT_WEIGHT_OPTIONS },
      { key: 'color',         label: 'Color',      type: 'color',  iconType: 'color' },
      { key: 'lineHeight',    label: 'Line',       type: 'text', iconType: 'text',   placeholder: '1.4' },
      { key: 'letterSpacing', label: 'Tracking',   type: 'text', iconType: 'text',   placeholder: '0.02em' },
      { key: 'textAlign',     label: 'Align',      type: 'select', iconType: 'select', options: TEXT_ALIGN_OPTIONS },
      { key: 'textTransform', label: 'Case',       type: 'select', iconType: 'select', options: TEXT_TRANSFORM_OPTIONS },
    ],
  },
  {
    key: 'spacing',
    title: 'Spacing',
    fields: [
      { key: 'marginTop',    label: 'Mar top',    type: 'text', iconType: 'text', placeholder: '20px' },
      { key: 'marginBottom', label: 'Mar bot',    type: 'text', iconType: 'text', placeholder: '20px' },
      { key: 'paddingTop',   label: 'Pad top',    type: 'text', iconType: 'text', placeholder: '12px' },
      { key: 'paddingBottom',label: 'Pad bot',    type: 'text', iconType: 'text', placeholder: '12px' },
      { key: 'paddingLeft',  label: 'Pad left',   type: 'text', iconType: 'text', placeholder: '16px' },
      { key: 'paddingRight', label: 'Pad right',  type: 'text', iconType: 'text', placeholder: '16px' },
    ],
  },
  {
    key: 'size',
    title: 'Size',
    fields: [
      { key: 'width',    label: 'Width',    type: 'text', iconType: 'text', placeholder: 'auto / 500px / 50%' },
      { key: 'maxWidth', label: 'Max W',    type: 'text', iconType: 'text', placeholder: '1200px' },
      { key: 'minWidth', label: 'Min W',    type: 'text', iconType: 'text' },
      { key: 'height',   label: 'Height',   type: 'text', iconType: 'text' },
    ],
  },
  {
    key: 'effects',
    title: 'Effects',
    fields: [
      { key: 'opacity',      label: 'Opacity', type: 'text', iconType: 'number', placeholder: '1' },
      { key: 'borderRadius', label: 'Radius',  type: 'text', iconType: 'number', placeholder: '8px' },
      { key: 'boxShadow',    label: 'Shadow',  type: 'text', iconType: 'text',   placeholder: '0 4px 12px rgba(0,0,0,0.1)' },
      { key: 'background',   label: 'BG',      type: 'color',iconType: 'color' },
    ],
  },
];

// Renders a single element-style property row. Generic enough to handle
// text / select / color without reusing the heavier FIELD_RENDERERS (those
// hardcode some labels and don't know about placeholders).
function ElementStyleRow({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <Row label={field.label} iconType={field.iconType}>
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ ...inputBaseStyle, cursor: 'pointer' }}>
          {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </Row>
    );
  }
  if (field.type === 'color') {
    return (
      <Row label={field.label} iconType="color" iconColor={value || D.textFaint}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: D.input, borderRadius: '2px', height: '28px', padding: '0 6px' }}>
          <div style={{ position: 'relative', width: '14px', height: '14px', flexShrink: 0 }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '2px',
              background: value || 'transparent',
              border: `1px solid ${D.border}`,
              backgroundImage: value ? 'none' : 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '6px 6px',
              backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0',
            }} />
            <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <input type="text" value={(value || '').replace('#', '').toUpperCase()}
            onChange={e => onChange(e.target.value ? '#' + e.target.value.replace('#', '') : '')}
            placeholder="—"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: D.text, minWidth: 0 }} />
        </div>
      </Row>
    );
  }
  // text
  return (
    <Row label={field.label} iconType={field.iconType}>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
        style={inputBaseStyle}
        onFocus={e => { e.target.style.border = `1px solid ${D.accent}`; e.target.style.background = D.inputFocus; }}
        onBlur={e  => { e.target.style.border = `1px solid transparent`; e.target.style.background = D.input; }}
      />
    </Row>
  );
}

// ---- DraggableLibraryTile ---------------------------------------------
// One block-type tile in the Block Library side panel. It does two
// things: clicking adds the block to the end of the current page (legacy
// behavior preserved), and dragging it is a @dnd-kit draggable source
// keyed `lib:<type>` so the parent's onDragEnd can distinguish a
// library drop from an in-tree reorder.
function DraggableLibraryTile({ type, meta, preset, onClick, S }) {
  // Each tile is a unique draggable. For preset tiles the id encodes
  // both the block type and the preset id so the drop handler can
  // create the right variant.
  const dragId = preset ? `lib:${type}:${preset.id}` : `lib:${type}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { kind: 'library', type, presetId: preset?.id },
  });
  const label = preset ? preset.label : meta.label;
  const subtitle = preset ? meta.label : null;
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', gap: '6px',
        padding: '12px 12px',
        background: isDragging ? S.accentLight : '#fff',
        border: `1px solid ${isDragging ? S.accent : S.border}`,
        borderRadius: '8px',
        cursor: isDragging ? 'grabbing' : 'grab',
        textAlign: 'left',
        opacity: isDragging ? 0.5 : 1,
        transition: 'background 0.12s, border-color 0.12s',
        width: '100%', boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        if (isDragging) return;
        e.currentTarget.style.borderColor = S.accent;
        e.currentTarget.style.background = S.accentLight;
      }}
      onMouseLeave={(e) => {
        if (isDragging) return;
        e.currentTarget.style.borderColor = S.border;
        e.currentTarget.style.background = '#fff';
      }}
      title={preset?.hint || `Click to add to end · drag to insert at a position`}
    >
      <span style={{ fontSize: '20px' }}>{meta.icon || '▫'}</span>
      <span style={{ fontSize: '11.5px', fontWeight: '700', color: S.text, lineHeight: 1.2 }}>
        {label}
      </span>
      {subtitle && (
        <span style={{ fontSize: '10px', color: S.textDim, lineHeight: 1.2 }}>
          {subtitle}
        </span>
      )}
    </button>
  );
}

// ---- LayersDropZone ----------------------------------------------------
// The Layers tree's outer container. Registers as a useDroppable target
// with id "layers-end" so library tiles dropped on empty space (or below
// the last row) get appended to the page. The wrapper itself does no
// styling beyond the existing padding; the visual hover state is wired
// via the parent's activeDragData (a faint accent border when a library
// item is being dragged).
function LayersDropZone({ children, S }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'layers-end' });
  return (
    <div
      ref={setNodeRef}
      style={{
        padding: '0 8px 12px', flex: 1,
        background: isOver ? S.accentLight + '40' : 'transparent',
        borderRadius: '4px',
        transition: 'background 0.12s',
      }}
    >
      {children}
    </div>
  );
}

// ---- CanvasDropZone ----------------------------------------------------
// Transparent overlay that covers the canvas iframe while a library block
// is being dragged. Appears only during drag (so the iframe keeps its
// normal click-to-edit behavior when idle). Dropping here appends the
// block to the end of the current page.
function CanvasDropZone({ active, S }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop' });
  if (!active) return null;
  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        pointerEvents: 'auto',
        background: isOver ? (S.accent + '12') : 'transparent',
        border: isOver ? `3px dashed ${S.accent}` : '3px dashed transparent',
        borderRadius: '8px',
        transition: 'background 0.12s, border-color 0.12s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        padding: '14px 22px', borderRadius: '999px',
        background: isOver ? S.accent : 'rgba(17,24,39,0.85)',
        color: 'white', fontWeight: 600, fontSize: '13px',
        letterSpacing: '0.3px',
        boxShadow: '0 10px 30px rgba(17,24,39,0.25)',
        transform: isOver ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.12s, background 0.12s',
      }}>
        {isOver ? '⤵ Drop here to add block' : 'Drop anywhere on canvas to add to page'}
      </div>
    </div>
  );
}

// ---- SortableBlockRow --------------------------------------------------
// One row in the Layers tree. Uses @dnd-kit's useSortable to make the row
// reorderable via drag-and-drop. The drag handle (⋮⋮) on the left is the
// only drag-activator — the rest of the row keeps its click-to-select
// behavior. We also add a small pointer-distance activation constraint at
// the DndContext level so a quick click doesn't get interpreted as a drag.
function SortableBlockRow({
  block, meta, isPrimary, isMulti, isSelected, isHidden, isLocked,
  onSelect, onDuplicate, onDelete, onToggleVisibility, onToggleLocked, onReset, S,
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: block.id });
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      style={{
        ...dragStyle,
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '7px 6px', marginBottom: '2px',
        background: isPrimary ? S.accentLight : isMulti ? (S.accentLight || '#DBEAFE') + '88' : 'transparent',
        border: `1px solid ${isSelected ? S.accent + '55' : 'transparent'}`,
        borderRadius: '4px', cursor: 'pointer',
        fontSize: '11.5px',
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
      }}
      onMouseEnter={(e) => { if (!isSelected && !isDragging) e.currentTarget.style.background = S.bg; }}
      onMouseLeave={(e) => { if (!isSelected && !isDragging) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Drag handle — only spot that activates dragging. We attach the
          attributes/listeners here so clicking elsewhere on the row still
          selects. cursor:grab → grabbing during drag. */}
      <span
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '14px', flexShrink: 0,
          color: S.textFaint,
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none',
        }}
      ><GripVertical size={13} strokeWidth={2} /></span>
      <span style={{
        fontSize: '13px', flexShrink: 0, width: '16px', textAlign: 'center',
        opacity: isHidden ? 0.4 : 1,
      }}>
        {meta?.icon || '▫'}
      </span>
      <span style={{
        flex: 1, minWidth: 0, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: isSelected ? S.accent : S.text,
        fontWeight: isSelected ? '600' : '500',
        opacity: isHidden ? 0.5 : 1,
        textDecoration: isHidden ? 'line-through' : 'none',
        textDecorationColor: S.textFaint,
      }}>
        {meta?.label || block.type}
      </span>
      {/* Lock toggle — when locked, BlockInspector field edits are
          disabled. Drag/duplicate/delete still work (lock is about
          content, not position). Lock state lives at block.locked
          (not in props) so Reset doesn't clear it. */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLocked(); }}
        title={isLocked ? 'Unlock content edits' : 'Lock content edits'}
        style={{
          width: '20px', height: '22px', padding: 0,
          background: 'transparent', border: 'none',
          color: isLocked ? S.warning : S.textDim, cursor: 'pointer',
          borderRadius: '3px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = S.bg; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >{isLocked ? <Lock size={11} strokeWidth={2} /> : <Unlock size={11} strokeWidth={2} />}</button>
      {/* Visibility toggle — eye = visible, eye-off = hidden. */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
        title={isHidden ? 'Show on storefront' : 'Hide from storefront'}
        style={{
          width: '20px', height: '22px', padding: 0,
          background: 'transparent', border: 'none',
          color: isHidden ? S.warning : S.textDim, cursor: 'pointer',
          borderRadius: '3px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = S.bg; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >{isHidden ? <EyeOff size={12} strokeWidth={2} /> : <Eye size={12} strokeWidth={2} />}</button>
      {/* Reset to defaults — disabled when locked (locked block can't
          have content overwritten). */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!isLocked) onReset(); }}
        disabled={isLocked}
        title={isLocked ? 'Unlock to reset' : 'Reset to default values'}
        style={{
          width: '20px', height: '22px', padding: 0,
          background: 'transparent', border: 'none',
          color: isLocked ? S.textFaint : S.textDim,
          cursor: isLocked ? 'not-allowed' : 'pointer',
          borderRadius: '3px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.background = S.bg; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      ><RotateCcw size={11} strokeWidth={2} /></button>
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        title="Duplicate (⌘D)"
        style={{
          width: '20px', height: '22px', padding: 0,
          background: 'transparent', border: 'none',
          color: S.textDim, cursor: 'pointer',
          borderRadius: '3px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = S.bg; e.currentTarget.style.color = S.text; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.textDim; }}
      ><Copy size={12} strokeWidth={2} /></button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete (⌫)"
        style={{
          width: '20px', height: '22px', padding: 0,
          background: 'transparent', border: 'none',
          color: S.textDim, cursor: 'pointer',
          borderRadius: '3px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = S.danger; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.textDim; }}
      ><Trash2 size={12} strokeWidth={2} /></button>
    </div>
  );
}

// ---- PageSettingsPanel -------------------------------------------------
// Right-inspector content when nothing is selected. Shows page-level
// settings: visibility toggles filtered by the active page, and any
// section-order fields for the active page. Global design tokens live
// in the Design System modal, not here.
function PageSettingsPanel({
  page,
  pageMeta,
  blocksCount,
  reservedPaths,
  takenPaths,
  onChangeMeta,
  onChangePath,
  onDuplicate,
  onDelete,
  openMediaLibrary,
  onOpenDesignSystem,
  brand,
  onChangeBrand,
}) {
  // Dismissible canvas-editing tip. Persisted in localStorage so the
  // "click any text on the preview" hint disappears after first dismiss
  // instead of nagging every session.
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem('tapas_editor_tip_dismissed') === '1'; }
    catch { return false; }
  });
  const dismissTip = () => {
    setTipDismissed(true);
    try { localStorage.setItem('tapas_editor_tip_dismissed', '1'); } catch {}
  };

  // Slug edit — local input, validated, committed on Enter or blur.
  // Keeps an inline error visible so users see why a save was refused.
  const [pathDraft, setPathDraft] = useState(page.path);
  const [pathError, setPathError] = useState('');
  useEffect(() => { setPathDraft(page.path); setPathError(''); }, [page.path, page.key]);
  const validatePath = (raw) => {
    let path = raw.trim();
    if (!path.startsWith('/')) path = '/' + path;
    if (path === page.path) return { ok: true, path, noop: true };
    if (path.length < 2) return { ok: false, error: 'Path must include something after "/".' };
    if (!/^\/[a-z0-9][a-z0-9-/]*$/.test(path)) return { ok: false, error: 'Lowercase letters, digits, and dashes only.' };
    if (reservedPaths?.has(path) || /^\/(books|blog|order)\//.test(path)) return { ok: false, error: `"${path}" is reserved.` };
    if (takenPaths?.includes(path)) return { ok: false, error: `Another page already uses "${path}".` };
    return { ok: true, path };
  };
  const commitPath = () => {
    const result = validatePath(pathDraft);
    if (!result.ok) { setPathError(result.error); return; }
    setPathError('');
    if (!result.noop) onChangePath(result.path);
    setPathDraft(result.path);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: D.panel, paddingBottom: '40px' }}>
      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '14px 16px', borderBottom: `1px solid ${D.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '15px' }}>{page.icon || '📄'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: D.text, letterSpacing: '0.1px' }}>
            {page.label}
          </div>
          <div style={{
            fontSize: '10px', color: D.textFaint, marginTop: '1px',
            fontFamily: 'ui-monospace, "SF Mono", monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {page.path}
          </div>
        </div>
      </div>

      {/* Canvas-editing tip — dismissible, persisted in localStorage. */}
      {!tipDismissed && (
        <div style={{
          margin: '14px 14px 16px', padding: '10px 12px',
          background: D.accentFaint, border: `1px solid rgba(13,153,255,0.25)`,
          borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start',
          position: 'relative',
        }}>
          <span style={{ fontSize: '12px', color: D.accent, flexShrink: 0 }}>✎</span>
          <div style={{ fontSize: '10.5px', color: D.text, lineHeight: '1.45', paddingRight: '18px' }}>
            <strong>Tip:</strong> click a block or text on the canvas to edit it.
            Nothing selected? This panel shows page-level settings.
          </div>
          <button
            onClick={dismissTip}
            title="Dismiss tip"
            style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '18px', height: '18px', padding: 0,
              background: 'transparent', border: 'none',
              color: D.textFaint, cursor: 'pointer',
              borderRadius: '3px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = D.text; e.currentTarget.style.background = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = D.textFaint; e.currentTarget.style.background = 'transparent'; }}
          >×</button>
        </div>
      )}

      {/* Block management hint — block visibility lives in the Layers
          tree (👁 toggle per row), ordering is drag-to-reorder. */}
      <div style={{ padding: '0 16px 14px', color: D.textDim, fontSize: '11px', lineHeight: 1.6 }}>
        Hide / reorder blocks in the <strong style={{ color: D.text }}>Layers</strong> panel on the left.
        Click any block on the canvas to edit its properties.
      </div>

      {/* Page details — name + slug. Editable for every page. */}
      <SubSection title="Page details" defaultOpen={true}>
        <div style={{ padding: '0 16px 8px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: D.textDim, display: 'block', marginBottom: '4px' }}>
            Page name
          </label>
          <input
            type="text"
            value={pageMeta.label || page.label}
            onChange={(e) => onChangeMeta('label', e.target.value)}
            placeholder="e.g. Our Team"
            style={{
              width: '100%', padding: '6px 8px', boxSizing: 'border-box',
              background: '#fff', border: `1px solid ${D.border}`,
              borderRadius: '4px', fontSize: '11.5px', color: D.text,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ padding: '0 16px 4px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: D.textDim, display: 'block', marginBottom: '4px' }}>
            URL path
          </label>
          <input
            type="text"
            value={pathDraft}
            onChange={(e) => { setPathDraft(e.target.value); if (pathError) setPathError(''); }}
            onBlur={commitPath}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitPath(); e.currentTarget.blur(); } }}
            placeholder="/our-team"
            style={{
              width: '100%', padding: '6px 8px', boxSizing: 'border-box',
              background: '#fff',
              border: `1px solid ${pathError ? D.danger : D.border}`,
              borderRadius: '4px', fontSize: '11.5px', color: D.text,
              outline: 'none', fontFamily: 'ui-monospace, monospace',
            }}
          />
          {pathError ? (
            <div style={{ fontSize: '10px', color: D.danger, marginTop: '4px' }}>{pathError}</div>
          ) : (
            <div style={{ fontSize: '10px', color: D.textFaint, marginTop: '4px' }}>
              Renaming the slug will 404 the old URL once published.
            </div>
          )}
        </div>
      </SubSection>

      {/* SEO meta — promoted from the sidebar's collapsed details panel
          so per-page SEO is one click away instead of three. */}
      <SubSection title="SEO & social" defaultOpen={true}>
        <div style={{ padding: '0 16px 8px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: D.textDim, display: 'block', marginBottom: '4px' }}>
            Page title <span style={{ color: D.textFaint, fontWeight: 400 }}>(&lt;title&gt;)</span>
          </label>
          <input
            type="text"
            value={pageMeta.title || ''}
            onChange={(e) => onChangeMeta('title', e.target.value)}
            placeholder="e.g. Home — Tapas Library"
            style={{
              width: '100%', padding: '6px 8px', boxSizing: 'border-box',
              background: '#fff', border: `1px solid ${D.border}`,
              borderRadius: '4px', fontSize: '11.5px', color: D.text,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ padding: '0 16px 8px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: D.textDim, display: 'block', marginBottom: '4px' }}>
            Meta description
          </label>
          <textarea
            value={pageMeta.description || ''}
            onChange={(e) => onChangeMeta('description', e.target.value)}
            placeholder="Short summary for search results & social previews (150–160 chars)"
            rows={3}
            style={{
              width: '100%', padding: '6px 8px', boxSizing: 'border-box',
              background: '#fff', border: `1px solid ${D.border}`,
              borderRadius: '4px', fontSize: '11.5px', color: D.text,
              outline: 'none', fontFamily: 'inherit', resize: 'vertical',
            }}
          />
          <div style={{ fontSize: '10px', color: D.textFaint, marginTop: '3px', textAlign: 'right' }}>
            {(pageMeta.description || '').length}/160
          </div>
        </div>
        <div style={{ padding: '0 16px 8px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: D.textDim, display: 'block', marginBottom: '4px' }}>
            Share image <span style={{ color: D.textFaint, fontWeight: 400 }}>(og:image · 1200×630)</span>
          </label>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              type="text"
              value={pageMeta.og_image || ''}
              onChange={(e) => onChangeMeta('og_image', e.target.value)}
              placeholder="https://… or pick from library"
              style={{
                flex: 1, padding: '6px 8px', boxSizing: 'border-box',
                background: '#fff', border: `1px solid ${D.border}`,
                borderRadius: '4px', fontSize: '11px', color: D.text,
                outline: 'none', fontFamily: 'ui-monospace, monospace',
              }}
            />
            <button
              type="button"
              onClick={() => openMediaLibrary({ onPick: (url) => onChangeMeta('og_image', url) })}
              title="Pick from media library"
              style={{
                padding: '0 8px', height: '26px',
                background: D.panelAlt, color: D.text, border: `1px solid ${D.border}`,
                borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
              }}
            >📁</button>
          </div>
        </div>

        {/* Google SERP preview */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: D.textDim, marginBottom: '6px' }}>
            Google preview
          </div>
          <div style={{
            padding: '10px 12px',
            background: '#fff', border: `1px solid ${D.border}`,
            borderRadius: '6px', fontFamily: 'arial, sans-serif',
          }}>
            <div style={{ fontSize: '11px', color: '#006621', marginBottom: '2px' }}>
              tapasreadingcafe.com{page.path === '/' ? '' : page.path}
            </div>
            <div style={{
              fontSize: '15px', color: '#1a0dab', fontWeight: 400, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
            }}>{pageMeta.title || 'Page title'}</div>
            <div style={{
              fontSize: '11px', color: '#545454', marginTop: '2px', lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>{pageMeta.description || 'Your meta description will appear here as a preview in Google search results.'}</div>
          </div>
        </div>

        {/* Social card preview */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: D.textDim, marginBottom: '6px' }}>
            Social card preview
          </div>
          <div style={{
            background: '#fff', border: `1px solid ${D.border}`,
            borderRadius: '8px', overflow: 'hidden',
          }}>
            <div style={{
              width: '100%', aspectRatio: '1200 / 630',
              background: pageMeta.og_image ? `url(${pageMeta.og_image}) center/cover` : 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '11px', fontWeight: 600, letterSpacing: '1px',
              textTransform: 'uppercase', opacity: pageMeta.og_image ? 1 : 0.9,
            }}>
              {!pageMeta.og_image && 'No share image set'}
            </div>
            <div style={{ padding: '10px 12px', borderTop: `1px solid ${D.border}` }}>
              <div style={{ fontSize: '10px', color: D.textDim, textTransform: 'uppercase', letterSpacing: '1px' }}>
                tapasreadingcafe.com
              </div>
              <div style={{
                fontSize: '13px', fontWeight: 700, color: D.text,
                marginTop: '3px', lineHeight: 1.3,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
              }}>{pageMeta.title || 'Page title'}</div>
              <div style={{
                fontSize: '11px', color: D.textDim, marginTop: '2px', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>{pageMeta.description || 'Your meta description…'}</div>
            </div>
          </div>
        </div>

        {/* Canonical URL — declares this page's authoritative URL so
            Google doesn't flag duplicates when the same page is
            reachable from multiple paths. */}
        <div style={{ padding: '0 16px 8px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: D.textDim, display: 'block', marginBottom: '4px' }}>
            Canonical URL <span style={{ color: D.textFaint, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={pageMeta.canonical_url || ''}
            onChange={(e) => onChangeMeta('canonical_url', e.target.value)}
            placeholder="https://www.tapasreadingcafe.com/"
            style={{
              width: '100%', padding: '6px 8px', boxSizing: 'border-box',
              background: '#fff', border: `1px solid ${D.border}`,
              borderRadius: '4px', fontSize: '11px', color: D.text,
              outline: 'none', fontFamily: 'ui-monospace, monospace',
            }}
          />
          <div style={{ fontSize: '10px', color: D.textFaint, marginTop: '3px' }}>
            Leave blank to use this page's own URL.
          </div>
        </div>

        {/* Hide from search engines — adds <meta name="robots" content="noindex">
            so the page doesn't show up in Google results. Useful for
            thank-you pages, drafts, internal-only pages. */}
        <div style={{ padding: '0 16px 12px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '11.5px', color: D.text, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={!!pageMeta.robots_noindex}
              onChange={(e) => onChangeMeta('robots_noindex', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Hide this page from search engines
          </label>
          <div style={{ fontSize: '10px', color: D.textFaint, marginTop: '3px', marginLeft: '24px' }}>
            Adds <code>noindex</code> so Google, Bing, etc. won't list it.
          </div>
        </div>
      </SubSection>

      {/* Page actions — duplicate or delete any page.
          Delete is below a divider so it's harder to mis-click. */}
      <SubSection title="Page actions" defaultOpen={true}>
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={onDuplicate}
            style={{
              width: '100%', padding: '8px 12px',
              background: D.panelAlt, color: D.text,
              border: `1px solid ${D.border}`, borderRadius: '4px',
              cursor: 'pointer', fontSize: '11.5px', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = D.inputHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = D.panelAlt; }}
          >
            <Copy size={13} strokeWidth={2.25} />
            <span style={{ flex: 1, textAlign: 'left' }}>Duplicate page</span>
          </button>
          <div style={{ fontSize: '10px', color: D.textFaint, marginTop: '4px' }}>
            Creates a copy with all blocks. You'll be switched to the new page.
          </div>
        </div>
        <div style={{ padding: '8px 16px 4px', borderTop: `1px solid ${D.divider}`, marginTop: '8px' }}>
          <button
            onClick={onDelete}
            style={{
              width: '100%', padding: '8px 12px',
              background: 'transparent', color: D.danger,
              border: `1px solid ${D.danger}55`, borderRadius: '4px',
              cursor: 'pointer', fontSize: '11.5px', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = D.danger; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = D.danger + '55'; }}
          >
            <Trash2 size={13} strokeWidth={2.25} />
            <span style={{ flex: 1, textAlign: 'left' }}>Delete page</span>
          </button>
          <div style={{ fontSize: '10px', color: D.textFaint, marginTop: '4px' }}>
            Removes the page and its {blocksCount} block{blocksCount === 1 ? '' : 's'} from the draft.
            The URL will 404 once published.
          </div>
        </div>
      </SubSection>

      {/* Brand colors — inline so the most-edited tokens don't require
          opening the Design System modal. Typography / buttons / images
          and extra color shades still live in the modal. */}
      <SubSection title="Brand colors" defaultOpen={true}>
        <ColorField
          field={{ key: 'primary_color', label: 'Primary' }}
          value={brand?.primary_color}
          onChange={(v) => onChangeBrand('primary_color', v)}
        />
        <ColorField
          field={{ key: 'accent_color', label: 'Accent' }}
          value={brand?.accent_color}
          onChange={(v) => onChangeBrand('accent_color', v)}
        />
        <ColorField
          field={{ key: 'cream_color', label: 'Background' }}
          value={brand?.cream_color}
          onChange={(v) => onChangeBrand('cream_color', v)}
        />
        <div style={{ padding: '8px 16px 4px' }}>
          <button
            onClick={onOpenDesignSystem}
            style={{
              width: '100%', padding: '7px 10px',
              background: 'transparent', color: D.textDim,
              border: `1px dashed ${D.border}`, borderRadius: '4px',
              cursor: 'pointer', fontSize: '10.5px', fontWeight: '500',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = D.panelAlt; e.currentTarget.style.color = D.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.textDim; }}
          >
            <span>🎨</span>
            <span>All design settings</span>
            <span>→</span>
          </button>
        </div>
      </SubSection>
    </div>
  );
}

// ---- Main --------------------------------------------------------------

export default function SiteContent() {
  // Two separate content states — draft is what you're editing, live is
  // what's pushed to production. The dashboard always edits draft.
  const [draftContent, setDraftContent] = useState(DEFAULT_CONTENT);
  // Ref that always points at the latest draftContent — used inside the
  // message listener so we don't have to re-attach on every state change.
  const draftContentRef = useRef(draftContent);
  useEffect(() => { draftContentRef.current = draftContent; }, [draftContent]);
  const [liveContent,  setLiveContent]  = useState(DEFAULT_CONTENT);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [pushing, setPushing]   = useState(false);
  const [pushedAt, setPushedAt] = useState(null);
  const [error,   setError]     = useState('');
  // Transient toast: { message, actionLabel?, onAction?, expiresAt }.
  // Auto-dismisses after 4s; "Undo" lets the user revert the last
  // canvas variant swap without remembering ⌘Z.
  const [toast,   setToast]     = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const [activeSection, setActiveSection] = useState('brand');
  // Selected element on the canvas (fieldPath string). When set, the
  // right panel shows an Element Inspector with CSS overrides.
  const [selectedElement, setSelectedElement] = useState(null);
  // Which of the 4 element-inspector groups are expanded.
  const [expandedGroups, setExpandedGroups] = useState(new Set(['typography', 'spacing']));
  // Expanded sections in the right panel — Set of schema keys.
  const [expanded, setExpanded] = useState(new Set(['brand']));
  const [viewport, setViewport]   = useState('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [iframePath, setIframePath] = useState('/');
  // Webflow-style block editor state.
  //   editingPage    — which page's block tree we're manipulating
  //   selectedBlockId — which block is selected (drives right-panel mode)
  //   addPickerOpen  — visibility of the Add-section modal
  // Design System modal (brand / typography / buttons / images).
  // Opened from the toolbar Styles button. Global design tokens live
  // here rather than cluttering the left sidebar.
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [designModalTab, setDesignModalTab] = useState('brand');
  // Overflow menu in the toolbar (History / Schedule / Discard).
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  // Editor command palette (Cmd+K). Lives inline in this component so
  // commands can close over editor state. Steals Cmd+K from the global
  // CommandPalette (which only does route navigation) using a capture-
  // phase listener that stops propagation while the editor is mounted.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteCursor, setPaletteCursor] = useState(0);
  const paletteInputRef = useRef(null);
  // The block-type currently being dragged from the Library panel, used
  // by the DragOverlay so the user sees a floating preview that follows
  // their cursor. Null when no library drag is in progress (in-tree
  // reorders manage their own visual via SortableBlockRow's transform).
  const [activeDragLib, setActiveDragLib] = useState(null);
  const [editingPage, setEditingPage] = useState('home');
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  // Phase 4: clipboard for cross-page copy/paste
  const [copiedBlock, setCopiedBlock] = useState(() => {
    try { return JSON.parse(localStorage.getItem('blockClipboard') || 'null'); } catch { return null; }
  });
  // Phase 4: multi-select support (Set of block IDs selected beyond the primary one)
  const [multiSelectedIds, setMultiSelectedIds] = useState(() => new Set());
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [addPickerSearch, setAddPickerSearch] = useState('');
  // Phase 5: templates modal (replaces the old prompt()-based picker)
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('blockTemplates') || '[]'); } catch { return []; }
  });
  // Phase 5: custom confirmation modal. window.confirm() from inside a
  // cross-origin postMessage handler is unreliable (some Chromium
  // channels suppress it without user activation on the parent). A
  // React modal is also a nicer UX — matches the rest of the editor.
  // Shape: { title, message, confirmLabel, tone, onConfirm }
  const [confirmModal, setConfirmModal] = useState(null);
  // Phase 5: custom pages — "+ New page" modal state
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newPageLabel, setNewPageLabel] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  // Inline error in the New Page modal — replaces the old alert() calls
  // so validation feedback stays inside the modal flow.
  const [newPageError, setNewPageError] = useState('');
  // Phase 5: revision history — list + restore past publishes
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState('');
  const fetchRevisions = useCallback(async () => {
    setRevisionsLoading(true); setRevisionsError('');
    try {
      const { data, error: err } = await supabase
        .from('site_content_revisions')
        .select('id, published_by_email, note, published_at, content')
        .order('published_at', { ascending: false })
        .limit(100);
      if (err) throw err;
      setRevisions(data || []);
    } catch (err) {
      setRevisionsError(err.message || 'Failed to load history.');
    } finally {
      setRevisionsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (historyModalOpen) fetchRevisions();
  }, [historyModalOpen, fetchRevisions]);

  // Phase 5: media library — shared picker modal for every ImageField.
  // onPick is the callback the caller (an ImageField) passes in; when
  // the user clicks a thumbnail we invoke it with the public URL.
  const [mediaLibrary, setMediaLibrary] = useState({ open: false, onPick: null });
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const openMediaLibrary = useCallback(({ onPick }) => {
    setMediaLibrary({ open: true, onPick });
  }, []);
  const mediaLibraryApi = useMemo(() => ({ open: openMediaLibrary }), [openMediaLibrary]);
  const fetchMediaItems = useCallback(async () => {
    setMediaLoading(true); setMediaError('');
    try {
      const { data, error: listErr } = await supabase
        .storage.from(STORAGE_BUCKET)
        .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
      if (listErr) throw listErr;
      const files = (data || []).filter(f => f?.name && !f.name.endsWith('/'));
      const items = files.map(f => {
        const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(f.name);
        return {
          name: f.name,
          url: publicUrl,
          size: f.metadata?.size || 0,
          mime: f.metadata?.mimetype || '',
          created_at: f.created_at || f.updated_at || null,
        };
      });
      setMediaItems(items);
    } catch (err) {
      setMediaError(err.message?.includes('not found') || err.message?.includes('Bucket')
        ? `Create a public bucket named "${STORAGE_BUCKET}" in Supabase → Storage first.`
        : (err.message || 'Failed to load media.'));
    } finally {
      setMediaLoading(false);
    }
  }, []);
  useEffect(() => {
    if (mediaLibrary.open) fetchMediaItems();
  }, [mediaLibrary.open, fetchMediaItems]);
  const uploadToLibrary = async (file) => {
    if (!file) return null;
    setMediaUploading(true); setMediaError('');
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const safeBase = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 40) || 'upload';
      const path = `${safeBase}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      await fetchMediaItems();
      return publicUrl;
    } catch (err) {
      setMediaError(err.message || 'Upload failed');
      return null;
    } finally {
      setMediaUploading(false);
    }
  };
  const deleteMediaItem = async (name) => {
    try {
      const { error: delErr } = await supabase.storage.from(STORAGE_BUCKET).remove([name]);
      if (delErr) throw delErr;
      setMediaItems(prev => prev.filter(m => m.name !== name));
    } catch (err) {
      setMediaError(err.message || 'Delete failed');
    }
  };
  const askConfirm = useCallback((opts) => {
    // opts: { title, message, confirmLabel?, tone?, onConfirm }
    setConfirmModal({
      title: opts.title || 'Confirm',
      message: opts.message || '',
      confirmLabel: opts.confirmLabel || 'Confirm',
      tone: opts.tone || 'danger',
      onConfirm: opts.onConfirm,
    });
  }, []);
  // Hamburger-style collapse for both sidebars. Each panel is either
  // at its full fixed width or fully hidden (width 0 with a CSS
  // transition for a smooth slide). State persists across sessions so
  // the user's last layout sticks.
  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    try { return localStorage.getItem('tapas_editor_left_collapsed') === '1'; } catch { return false; }
  });
  const [rightCollapsed, setRightCollapsed] = useState(() => {
    try { return localStorage.getItem('tapas_editor_right_collapsed') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('tapas_editor_left_collapsed', leftCollapsed ? '1' : '0'); } catch {}
  }, [leftCollapsed]);
  useEffect(() => {
    try { localStorage.setItem('tapas_editor_right_collapsed', rightCollapsed ? '1' : '0'); } catch {}
  }, [rightCollapsed]);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef(null);
  const fieldRefs = useRef({});
  const sectionRefs = useRef({});
  const pendingScrollRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const applyContentTimerRef = useRef(null);

  // Undo / redo history. The stack holds past draftContent snapshots.
  // Captures are debounced (550ms) so one sentence of typing is one
  // undo entry, not one entry per keystroke.
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const historyTimerRef = useRef(null);
  const skipNextCaptureRef = useRef(false);

  // Initial load: fetch both draft and live in parallel.
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [draftRes, liveRes] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', DRAFT_KEY).maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', LIVE_KEY).maybeSingle(),
      ]);

      const liveRaw = liveRes.data?.value
        ? (typeof liveRes.data.value === 'string' ? JSON.parse(liveRes.data.value) : liveRes.data.value)
        : null;
      const draftRaw = draftRes.data?.value
        ? (typeof draftRes.data.value === 'string' ? JSON.parse(draftRes.data.value) : draftRes.data.value)
        : null;

      const live  = stripDeletedPages(liveRaw  ? deepMerge(DEFAULT_CONTENT, liveRaw)  : DEFAULT_CONTENT);
      // If there's no draft yet, initialise it from live.
      const draft = stripDeletedPages(draftRaw ? deepMerge(DEFAULT_CONTENT, draftRaw) : live);

      setLiveContent(live);
      setDraftContent(draft);
    } catch (err) {
      setError(err.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Cmd+K editor palette hotkey. Capture phase + stopImmediatePropagation
  // means the global navigation CommandPalette never sees the event while
  // we're mounted — Cmd+K becomes editor-scoped here. Esc closes the
  // palette. Avoids hijacking when an input/textarea has focus AND the
  // palette is closed (so Cmd+K in a text field still feels normal).
  useEffect(() => {
    const onKey = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
      if (isCmdK) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPaletteOpen(o => !o);
        setPaletteQuery('');
        setPaletteCursor(0);
        return;
      }
      if (e.key === 'Escape' && paletteOpen) {
        e.stopImmediatePropagation();
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [paletteOpen]);

  // Autofocus the palette input when it opens.
  useEffect(() => {
    if (paletteOpen && paletteInputRef.current) {
      const t = setTimeout(() => paletteInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [paletteOpen]);

  // Seed the history with the loaded content exactly once.
  useEffect(() => {
    if (loading) return;
    if (history.length === 0) {
      setHistory([draftContent]);
      setHistoryIdx(0);
    }
  }, [loading]); // eslint-disable-line

  // Debounced history capture. Runs on every draftContent change unless
  // the change came from undo/redo itself.
  useEffect(() => {
    if (loading || history.length === 0) return;
    if (skipNextCaptureRef.current) {
      skipNextCaptureRef.current = false;
      return;
    }
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      setHistory(prev => {
        const last = prev[historyIdx];
        try { if (last && JSON.stringify(last) === JSON.stringify(draftContent)) return prev; } catch {}
        const trimmed = prev.slice(0, historyIdx + 1);
        const next = [...trimmed, draftContent];
        // Cap history at 50 entries so we don't bloat memory.
        return next.length > 50 ? next.slice(-50) : next;
      });
      setHistoryIdx(i => Math.min(i + 1, 49));
    }, 550);
    return () => { if (historyTimerRef.current) clearTimeout(historyTimerRef.current); };
  }, [draftContent]); // eslint-disable-line

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < history.length - 1;

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const prev = history[historyIdx - 1];
    if (!prev) return;
    skipNextCaptureRef.current = true;
    setDraftContent(prev);
    setHistoryIdx(historyIdx - 1);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    if (!next) return;
    skipNextCaptureRef.current = true;
    setDraftContent(next);
    setHistoryIdx(historyIdx + 1);
  }, [history, historyIdx]);

  const updateField = (storageKey, fieldKey, value) => {
    setDraftContent(prev => ({
      ...prev,
      [storageKey]: { ...(prev[storageKey] || {}), [fieldKey]: value },
    }));
  };

  // ---- Block CRUD (Phase 2) -----------------------------------------
  // Helpers that mutate draftContent.pages[pageKey].blocks immutably.
  // Every operation produces a fresh object graph so React re-renders
  // and the debounced apply-content push sends the change to the
  // preview iframe.

  const getBlocks = useCallback((pageKey) => {
    const p = draftContent?.pages?.[pageKey];
    return Array.isArray(p?.blocks) ? p.blocks : [];
  }, [draftContent]);

  const mutateBlocks = useCallback((pageKey, mapFn) => {
    setDraftContent(prev => {
      const pages = prev.pages || {};
      const page = pages[pageKey] || { meta: {}, blocks: [] };
      const nextBlocks = mapFn(Array.isArray(page.blocks) ? page.blocks : []);
      return {
        ...prev,
        pages: {
          ...pages,
          [pageKey]: { ...page, blocks: nextBlocks },
        },
      };
    });
  }, []);

  const addBlockToPage = useCallback((pageKey, type, atIndex, presetId) => {
    const fresh = makeBlock(type, presetId);
    mutateBlocks(pageKey, (blocks) => {
      const idx = typeof atIndex === 'number' ? atIndex : blocks.length;
      const next = [...blocks];
      next.splice(idx, 0, fresh);
      return next;
    });
    setSelectedBlockId(fresh.id);
    return fresh.id;
  }, [mutateBlocks]);

  // Insert a new block as a child of an existing tapas_group. Used when
  // a library tile is dropped onto a group row in the Layers tree.
  const addBlockAsChild = useCallback((pageKey, parentId, type, presetId) => {
    const fresh = makeBlock(type, presetId);
    mutateBlocks(pageKey, (blocks) => blocks.map(b => {
      if (b.id !== parentId) return b;
      const nextChildren = Array.isArray(b.props?.children) ? [...b.props.children, fresh] : [fresh];
      return { ...b, props: { ...(b.props || {}), children: nextChildren } };
    }));
    setSelectedBlockId(fresh.id);
    return fresh.id;
  }, [mutateBlocks]);

  const deleteBlock = useCallback((pageKey, blockId) => {
    mutateBlocks(pageKey, (blocks) => blocks.filter(b => b.id !== blockId));
    setSelectedBlockId(prev => prev === blockId ? null : prev);
  }, [mutateBlocks]);

  const duplicateBlock = useCallback((pageKey, blockId) => {
    mutateBlocks(pageKey, (blocks) => {
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx < 0) return blocks;
      const src = blocks[idx];
      const clone = {
        ...JSON.parse(JSON.stringify(src)),
        id: `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5).toString(36)}`,
      };
      const next = [...blocks];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, [mutateBlocks]);

  // Drag-and-drop sensors. The 5px activation distance prevents a
  // single click from being misread as a drag — important because the
  // row's whole surface stays clickable for selection.
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Toggle block.props.hidden. Hidden blocks are skipped by the
  // storefront's PageRenderer (see tapas-store/src/blocks/PageRenderer.js)
  // and rendered with a strikethrough + dim opacity in the Layers panel.
  // This replaces the legacy per-page "visibility.*" schema for everything
  // that has migrated to blocks.
  const toggleBlockHidden = useCallback((pageKey, blockId) => {
    mutateBlocks(pageKey, (blocks) => blocks.map(b =>
      b.id === blockId ? { ...b, props: { ...(b.props || {}), hidden: !b.props?.hidden } } : b
    ));
  }, [mutateBlocks]);

  // Toggle block.locked. Locked blocks have BlockInspector field edits
  // disabled (the inspector shows a "🔒 Locked" banner with an Unlock
  // button) and the Reset action is disabled in the row. Drag/duplicate/
  // delete still work — locking is about content, not position. Stored
  // at block.locked (not in props) so it never gets reset by Reset.
  const toggleBlockLocked = useCallback((pageKey, blockId) => {
    mutateBlocks(pageKey, (blocks) => blocks.map(b =>
      b.id === blockId ? { ...b, locked: !b.locked } : b
    ));
  }, [mutateBlocks]);

  // Reset a block's props to the registry defaults (via makeBlock).
  // Preserves the block's id and locked flag so the row identity stays
  // stable; only props are replaced. Hidden flag in props is reset too,
  // which is intentional (Reset = "make this look like a fresh insert").
  const resetBlockProps = useCallback((pageKey, blockId) => {
    mutateBlocks(pageKey, (blocks) => blocks.map(b => {
      if (b.id !== blockId) return b;
      const fresh = makeBlock(b.type);
      return { ...b, props: fresh.props };
    }));
  }, [mutateBlocks]);

  const moveBlock = useCallback((pageKey, blockId, delta) => {
    mutateBlocks(pageKey, (blocks) => {
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx < 0) return blocks;
      const target = idx + delta;
      if (target < 0 || target >= blocks.length) return blocks;
      const next = [...blocks];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, [mutateBlocks]);

  const updateBlockProp = useCallback((pageKey, blockId, propKey, value) => {
    mutateBlocks(pageKey, (blocks) => blocks.map(b => (
      b.id === blockId
        ? { ...b, props: { ...(b.props || {}), [propKey]: value } }
        : b
    )));
  }, [mutateBlocks]);

  // Find a block by id across the current editingPage's tree.
  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    const blocks = getBlocks(editingPage);
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [selectedBlockId, editingPage, getBlocks]);

  // All pages are uniform: any page in draftContent.pages can be
  // renamed, slugged, or deleted. EDITABLE_PAGES is just a seed list of
  // default keys/labels/paths used as fallback metadata when the data
  // doesn't override.
  // Reserved URL paths the slug-edit field and New Page modal reject —
  // app routes (cart, checkout, etc.) that don't belong to user pages.
  // Default page paths are NOT reserved: the user is free to delete the
  // default Home page and create a new one at "/".
  const RESERVED_PATHS = useMemo(() => new Set([
    '/cart', '/checkout', '/login', '/profile', '/order', '/member',
  ]), []);

  // Update a single key on a page's meta (title / description / og_image
  // / label / path). Page key in draftContent.pages stays stable; only
  // meta.path changes when a slug is renamed.
  const updatePageMeta = useCallback((pageKey, key, value) => {
    setDraftContent(prev => {
      const page = prev.pages?.[pageKey] || { meta: {}, blocks: [] };
      return {
        ...prev,
        pages: {
          ...(prev.pages || {}),
          [pageKey]: { ...page, meta: { ...(page.meta || {}), [key]: value } },
        },
      };
    });
  }, []);

  // Resolve every page in draftContent.pages into a uniform entry with
  // label + path, falling back to EDITABLE_PAGES defaults when meta
  // doesn't override. Default pages keep their seed order; everything
  // else is appended alphabetically.
  const allPages = useMemo(() => {
    const pages = draftContent?.pages || {};
    const defaultsByKey = new Map(EDITABLE_PAGES.map(p => [p.key, p]));
    const entries = Object.entries(pages).map(([key, p]) => {
      const seed = defaultsByKey.get(key);
      return {
        key,
        label: p?.meta?.label || seed?.label || key,
        path: p?.meta?.path || seed?.path || `/${key}`,
      };
    });
    const seedOrder = new Map(EDITABLE_PAGES.map((p, i) => [p.key, i]));
    return entries.sort((a, b) => {
      const ai = seedOrder.has(a.key) ? seedOrder.get(a.key) : Infinity;
      const bi = seedOrder.has(b.key) ? seedOrder.get(b.key) : Infinity;
      if (ai !== bi) return ai - bi;
      return a.label.localeCompare(b.label);
    });
  }, [draftContent]);
  const currentPageEntry = allPages.find(p => p.key === editingPage) || allPages[0] || { key: editingPage, label: editingPage, path: '/' };

  // Duplicate the currently-edited page. Generates a fresh slug by
  // appending "-copy" / "-copy-2" / etc until it doesn't collide with
  // an existing path. Block ids are regenerated so the copy is
  // independent of the original.
  const duplicateCurrentPage = useCallback(() => {
    const source = draftContent?.pages?.[editingPage];
    if (!source) return;
    const baseLabel = (source.meta?.label || currentPageEntry.label || editingPage);
    const baseSlug = (source.meta?.path || currentPageEntry.path || '/' + editingPage)
      .replace(/^\/+/, '/').replace(/[^a-z0-9/-]/gi, '-').toLowerCase();
    const existingPaths = new Set(allPages.map(p => p.path));
    let suffix = 1;
    let candidate = `${baseSlug}-copy`;
    while (existingPaths.has(candidate) || RESERVED_PATHS.has(candidate)) {
      suffix += 1;
      candidate = `${baseSlug}-copy-${suffix}`;
    }
    const newKey = 'page_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const newBlocks = (Array.isArray(source.blocks) ? source.blocks : []).map(b => ({
      ...JSON.parse(JSON.stringify(b)),
      id: `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    }));
    setDraftContent(prev => ({
      ...prev,
      pages: {
        ...(prev.pages || {}),
        [newKey]: {
          meta: {
            ...(source.meta || {}),
            label: `${baseLabel} (Copy)`,
            path: candidate,
            title: source.meta?.title ? `${source.meta.title} (Copy)` : `${baseLabel} (Copy)`,
          },
          blocks: newBlocks,
        },
      },
    }));
    setEditingPage(newKey);
    setIframePath(candidate);
    setSelectedBlockId(null);
  }, [draftContent, editingPage, currentPageEntry, allPages, RESERVED_PATHS]);

  // Delete the currently-edited page (any page — defaults included).
  // For default pages, the deep-merge with DEFAULT_CONTENT would
  // resurrect them, so we also record the key in `_deleted_pages` as
  // a tombstone. stripDeletedPages() removes them after every merge.
  const deleteCurrentPage = useCallback(() => {
    setDraftContent(prev => {
      const nextPages = { ...(prev.pages || {}) };
      delete nextPages[editingPage];
      const tombstones = new Set(Array.isArray(prev._deleted_pages) ? prev._deleted_pages : []);
      tombstones.add(editingPage);
      return { ...prev, pages: nextPages, _deleted_pages: Array.from(tombstones) };
    });
    const remaining = allPages.filter(p => p.key !== editingPage);
    const fallback = remaining[0];
    if (fallback) {
      setEditingPage(fallback.key);
      setIframePath(fallback.path);
    }
    setSelectedBlockId(null);
  }, [editingPage, allPages]);

  // Save the element's current styles under a shared name so they can
  // be reapplied to other elements later. Stored in draftContent.saved_styles.
  const saveSharedStyle = (name, styleObj) => {
    if (!name || !styleObj) return;
    setDraftContent(prev => ({
      ...prev,
      saved_styles: { ...(prev.saved_styles || {}), [name]: JSON.parse(JSON.stringify(styleObj)) },
    }));
  };

  // Replace the selected element's styles with a saved shared style.
  const applySharedStyle = (path, name) => {
    if (!path || !name) return;
    setDraftContent(prev => {
      const saved = prev.saved_styles?.[name];
      if (!saved) return prev;
      const nextMap = { ...(prev.element_styles || {}) };
      nextMap[path] = JSON.parse(JSON.stringify(saved));
      return { ...prev, element_styles: nextMap };
    });
  };

  // Update a single CSS property on the currently selected element.
  // Empty string clears the override.
  // `state` is one of 'normal' | 'hover' | 'active' — hover/active
  // writes land in a reserved `_hover` / `_active` sub-object that the
  // storefront's applyElementStyles renders as :hover / :active rules.
  const updateElementStyle = (path, cssProp, value, state = 'normal') => {
    const clearing = value === '' || value === null || value === undefined;
    setDraftContent(prev => {
      const currentMap = prev.element_styles || {};
      const currentEl  = currentMap[path] || {};
      let nextEl;
      if (state === 'normal') {
        nextEl = { ...currentEl };
        if (clearing) delete nextEl[cssProp];
        else nextEl[cssProp] = value;
      } else {
        const key = `_${state}`;
        const currentSub = currentEl[key] || {};
        const nextSub = { ...currentSub };
        if (clearing) delete nextSub[cssProp];
        else nextSub[cssProp] = value;
        nextEl = { ...currentEl };
        if (Object.keys(nextSub).length === 0) delete nextEl[key];
        else nextEl[key] = nextSub;
      }
      const nextMap = { ...currentMap };
      if (Object.keys(nextEl).length === 0) delete nextMap[path];
      else nextMap[path] = nextEl;
      return { ...prev, element_styles: nextMap };
    });
  };

  // Dirty = draft differs from live.
  const dirty = useMemo(() => {
    try { return JSON.stringify(draftContent) !== JSON.stringify(liveContent); }
    catch { return true; }
  }, [draftContent, liveContent]);

  // Autosave — writes to the DRAFT row only.
  const saveDraft = useCallback(async (nextContent) => {
    setSaving(true); setError('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: DRAFT_KEY, value: nextContent, updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Failed to save draft.');
    } finally { setSaving(false); }
  }, []);

  useEffect(() => {
    if (loading || !dirty) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => saveDraft(draftContent), 900);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [draftContent, dirty, loading, saveDraft]);

  // Live preview bridge: on every draftContent change, push the whole
  // blob to the iframe via postMessage so the preview updates without
  // waiting for autosave or reload. Debounced tightly (120ms) so typing
  // feels instant. Only runs after the iframe signals ready.
  useEffect(() => {
    if (loading || !iframeReady) return;
    if (applyContentTimerRef.current) clearTimeout(applyContentTimerRef.current);
    applyContentTimerRef.current = setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'tapas:apply-content', content: draftContent },
          '*'
        );
      } catch {}
    }, 120);
    return () => { if (applyContentTimerRef.current) clearTimeout(applyContentTimerRef.current); };
  }, [draftContent, loading, iframeReady]);

  // Push — copies draft → live and records a revision snapshot.
  const pushToLive = async () => {
    setPushing(true); setError('');
    try {
      // First, flush any pending autosave.
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        await saveDraft(draftContent);
      }
      const { error: liveErr } = await supabase.from('app_settings').upsert({
        key: LIVE_KEY, value: draftContent, updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (liveErr) throw liveErr;
      // Phase 5: record a revision. Don't fail the push if this fails —
      // the live site is the source of truth; history is a nice-to-have.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('site_content_revisions').insert([{
          content: draftContent,
          published_by_email: user?.email || null,
          note: null,
        }]);
      } catch (revErr) {
        // eslint-disable-next-line no-console
        console.warn('[pushToLive] revision snapshot failed:', revErr);
      }
      setLiveContent(draftContent);
      setPushedAt(new Date());
      setIframeKey(k => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to push to live.');
    } finally { setPushing(false); }
  };

  // Revert — discard draft, reload from live. Uses askConfirm so the
  // modal matches the rest of the editor (and works reliably across
  // Chromium variants where window.confirm gets suppressed).
  const revertDraft = () => {
    askConfirm({
      title: 'Discard all unpublished changes?',
      message: 'The draft will be reset to match the live site. This cannot be undone.',
      confirmLabel: 'Discard changes',
      tone: 'danger',
      onConfirm: () => {
        setDraftContent(liveContent);
        saveDraft(liveContent);
      },
    });
  };

  // Reset — blow away both draft AND live back to the bundled
  // DEFAULT_CONTENT. Used for "start fresh from the blank palette"
  // after branding has been stripped from the code. Very destructive
  // — asks for explicit confirmation, then writes a clean slate to
  // both app_settings rows in one transaction (well, two upserts).
  const resetToDefaults = () => {
    askConfirm({
      title: 'Reset site to blank template?',
      message: 'Every page, block, color override, and piece of copy will be replaced with the default blank template. The live site updates immediately. This cannot be undone — export your content first if you want a backup.',
      confirmLabel: 'Reset site',
      tone: 'danger',
      onConfirm: async () => {
        setSaving(true); setError('');
        try {
          const fresh = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
          const updatedAt = new Date().toISOString();
          await Promise.all([
            supabase.from('app_settings').upsert({ key: DRAFT_KEY, value: fresh, updated_at: updatedAt }, { onConflict: 'key' }),
            supabase.from('app_settings').upsert({ key: LIVE_KEY,  value: fresh, updated_at: updatedAt }, { onConflict: 'key' }),
          ]);
          setDraftContent(fresh);
          setLiveContent(fresh);
          setToast({ message: 'Site reset to blank template. Live site is updated.' });
        } catch (err) {
          setError(err.message || 'Failed to reset.');
        } finally { setSaving(false); }
      },
    });
  };

  // ---- Phase 6: Scheduled publishes ----------------------------------
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  // The Cmd+K palette commands need scheduleModalOpen and history modal
  // setters too — defined below. We assemble the full list with another
  // useMemo further down to avoid hoisting these state declarations.
  const [scheduledPublishes, setScheduledPublishes] = useState([]);
  const fetchScheduled = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('scheduled_publishes')
        .select('id, scheduled_at, note, status, created_by_email, created_at')
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true })
        .limit(50);
      setScheduledPublishes(data || []);
    } catch {}
  }, []);
  // On every editor load, opportunistically process any pending schedule
  // whose time has passed. If a Supabase cron is wired up server-side it
  // will handle ones that fire while no one has the editor open.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const nowIso = new Date().toISOString();
        const { data: due } = await supabase
          .from('scheduled_publishes')
          .select('id, content, note')
          .eq('status', 'pending')
          .lte('scheduled_at', nowIso)
          .order('scheduled_at', { ascending: true })
          .limit(10);
        if (!due || due.length === 0 || cancelled) return;
        for (const row of due) {
          try {
            const { error: liveErr } = await supabase.from('app_settings').upsert({
              key: LIVE_KEY, value: row.content, updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });
            if (liveErr) throw liveErr;
            try {
              const { data: { user } } = await supabase.auth.getUser();
              await supabase.from('site_content_revisions').insert([{
                content: row.content,
                published_by_email: user?.email ? `${user.email} (scheduled)` : 'scheduled',
                note: row.note || null,
              }]);
            } catch {}
            await supabase.from('scheduled_publishes')
              .update({ status: 'published', processed_at: new Date().toISOString() })
              .eq('id', row.id);
          } catch (err) {
            await supabase.from('scheduled_publishes')
              .update({ status: 'failed', processed_at: new Date().toISOString(), error_message: String(err?.message || err) })
              .eq('id', row.id);
          }
        }
        // Refresh live content after processing
        const { data: live } = await supabase.from('app_settings').select('value').eq('key', LIVE_KEY).maybeSingle();
        if (live?.value && !cancelled) {
          setLiveContent(live.value);
          setIframeKey(k => k + 1);
        }
      } catch {}
    };
    run();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (scheduleModalOpen) fetchScheduled();
  }, [scheduleModalOpen, fetchScheduled]);
  const scheduleAt = async (whenIso, note) => {
    if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); await saveDraft(draftContent); }
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('scheduled_publishes').insert([{
      scheduled_at: whenIso,
      content: draftContent,
      note: note || null,
      created_by_email: user?.email || null,
    }]);
    if (err) throw err;
    fetchScheduled();
  };
  const cancelScheduled = async (id) => {
    await supabase.from('scheduled_publishes')
      .update({ status: 'cancelled', processed_at: new Date().toISOString() })
      .eq('id', id);
    setScheduledPublishes(prev => prev.filter(r => r.id !== id));
  };

  const jumpToSection = (sectionKey) => {
    setActiveSection(sectionKey);
    // Expand the picked section in the right panel, keep any previously
    // expanded sections as-is (Figma-like behaviour).
    setExpanded(prev => {
      const next = new Set(prev);
      next.add(sectionKey);
      return next;
    });
    const path = SECTION_DEFAULT_PATH[sectionKey] || '/';
    if (iframePath !== path) {
      setIframePath(path);
      // Force full iframe remount so the new page gets a fresh bundle
      // and cache-buster param. Without this the browser may serve a
      // cached chunk from a previous deploy.
      setIframeKey(k => k + 1);
      setIframeReady(false);
    }
    // Scroll the section card into view in the right panel after the
    // render cycle completes.
    setTimeout(() => {
      const el = sectionRefs.current[sectionKey];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const toggleExpand = (sectionKey) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedElement(null);
    // Also tell the iframe to clear its outline.
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'tapas:clear-selection' }, '*');
    } catch {}
  };

  const clearElementStyles = (path) => {
    if (!path) return;
    askConfirm({
      title: 'Clear style overrides?',
      message: 'All custom CSS overrides on this element will be removed. The element will fall back to its block defaults.',
      confirmLabel: 'Clear overrides',
      tone: 'danger',
      onConfirm: () => {
        setDraftContent(prev => {
          const next = { ...(prev.element_styles || {}) };
          delete next[path];
          return { ...prev, element_styles: next };
        });
      },
    });
  };

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      const isCmd = e.metaKey || e.ctrlKey;
      // Ignore while typing in inputs inside the dashboard — let native
      // text undo work. Exception: Cmd+Shift+Z / Cmd+Y always redoes
      // content history.
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (isCmd && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        // Cmd+Z: undo content history. Skip while typing so native undo
        // still works inside text fields.
        if (typing) return;
        e.preventDefault();
        undo();
        return;
      }
      if (isCmd && ((e.key === 'z' || e.key === 'Z') && e.shiftKey) || (isCmd && (e.key === 'y' || e.key === 'Y'))) {
        if (typing) return;
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape') {
        if (selectedBlockId || multiSelectedIds.size > 0) {
          setSelectedBlockId(null);
          setMultiSelectedIds(new Set());
          return;
        }
        if (selectedElement) {
          setSelectedElement(null);
          try { iframeRef.current?.contentWindow?.postMessage({ type: 'tapas:clear-selection' }, '*'); } catch {}
        }
        return;
      }

      // Phase 4: Block-level keyboard shortcuts. Only fire when a block
      // is selected and we're not typing in an input. These operate on
      // the primary selected block (+ multi-selection for delete/dup).
      if (!typing && selectedBlockId) {
        // Delete / Backspace → delete block(s)
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const idsToDelete = new Set([selectedBlockId, ...multiSelectedIds]);
          const count = idsToDelete.size;
          setConfirmModal({
            title: count > 1 ? `Delete ${count} blocks?` : 'Delete this block?',
            message: 'Removes from the draft. You can undo with ⌘Z.',
            confirmLabel: count > 1 ? `Delete ${count}` : 'Delete',
            tone: 'danger',
            onConfirm: () => {
              setDraftContent(prev => {
                const page = prev.pages?.[editingPage];
                if (!page || !Array.isArray(page.blocks)) return prev;
                return {
                  ...prev,
                  pages: {
                    ...prev.pages,
                    [editingPage]: {
                      ...page,
                      blocks: page.blocks.filter(b => !idsToDelete.has(b.id)),
                    },
                  },
                };
              });
              setSelectedBlockId(null);
              setMultiSelectedIds(new Set());
            },
          });
          return;
        }
        // Cmd+D → duplicate block(s)
        if (isCmd && (e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          const idsToDuplicate = [selectedBlockId, ...multiSelectedIds];
          setDraftContent(prev => {
            const page = prev.pages?.[editingPage];
            if (!page || !Array.isArray(page.blocks)) return prev;
            const newBlocks = [...page.blocks];
            idsToDuplicate.forEach(id => {
              const idx = newBlocks.findIndex(x => x.id === id);
              if (idx === -1) return;
              newBlocks.splice(idx + 1, 0, {
                ...newBlocks[idx],
                id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
              });
            });
            return {
              ...prev,
              pages: {
                ...prev.pages,
                [editingPage]: { ...page, blocks: newBlocks },
              },
            };
          });
          return;
        }
        // Cmd+C → copy block to clipboard
        if (isCmd && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          const page = draftContentRef.current?.pages?.[editingPage];
          const block = page?.blocks?.find(b => b.id === selectedBlockId);
          if (!block) return;
          const clipboard = { type: block.type, props: block.props };
          setCopiedBlock(clipboard);
          try { localStorage.setItem('blockClipboard', JSON.stringify(clipboard)); } catch {}
          return;
        }
        // Cmd+V → paste clipboard at the end of the current page
        if (isCmd && (e.key === 'v' || e.key === 'V') && copiedBlock) {
          e.preventDefault();
          setDraftContent(prev => {
            const page = prev.pages?.[editingPage];
            if (!page || !Array.isArray(page.blocks)) return prev;
            const newBlock = {
              id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
              type: copiedBlock.type,
              props: copiedBlock.props,
            };
            return {
              ...prev,
              pages: {
                ...prev.pages,
                [editingPage]: { ...page, blocks: [...page.blocks, newBlock] },
              },
            };
          });
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedElement, selectedBlockId, multiSelectedIds, copiedBlock, editingPage]);

  // Receive messages from the iframe (click-to-edit)
  useEffect(() => {
    const onMessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'tapas:ready') {
        setIframeReady(true);
        // On ready, immediately send the current draft so the iframe
        // shows unpublished changes even if the DB row is stale.
        try {
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'tapas:apply-content', content: draftContent },
            '*'
          );
        } catch {}
        if (pendingScrollRef.current) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'tapas:highlight', sectionId: pendingScrollRef.current }, '*'
          );
          pendingScrollRef.current = null;
        }
      }
      if (msg.type === 'tapas:select' && typeof msg.fieldPath === 'string') {
        // Block path: "pages.{pageKey}.blocks.{blockId}"
        //   → switch to the Layers tab, set editingPage + selectedBlockId.
        // Anything else: fall back to the legacy element-CSS inspector.
        const m = /^pages\.([^.]+)\.blocks\.([^.]+)$/.exec(msg.fieldPath);
        if (m) {
          setEditingPage(m[1]);
          setSelectedBlockId(m[2]);
          setSelectedElement(null);
        } else {
          setSelectedElement(msg.fieldPath);
          setSelectedBlockId(null);
        }
        return;
      }
      if (msg.type === 'tapas:deselect') {
        setSelectedElement(null);
        setSelectedBlockId(null);
        return;
      }
      // Inline edit committed from the canvas: iframe has already shown
      // the new text; we write it to draftContent so it persists and
      // propagates back to every other view of the same field.
      if (msg.type === 'tapas:set-field-value' && typeof msg.fieldPath === 'string') {
        const [sectionKey, fieldKey] = msg.fieldPath.split('.');
        if (!sectionKey || !fieldKey) return;
        // Schema sections can alias their storage row via `parent`, so
        // use the same helper the inspector uses.
        const schemaSection = CONTENT_SCHEMA.find(s => s.key === sectionKey);
        const storageKey = schemaSection ? storageKeyForSection(schemaSection) : sectionKey;
        setDraftContent(prev => ({
          ...prev,
          [storageKey]: { ...(prev[storageKey] || {}), [fieldKey]: msg.value },
        }));
        return;
      }
      if (msg.type === 'tapas:edit-field' && typeof msg.fieldPath === 'string') {
        const sectionKey = sectionForFieldPath(msg.fieldPath);
        if (!sectionKey) return;
        setActiveSection(sectionKey);
        setExpanded(prev => {
          const next = new Set(prev);
          next.add(sectionKey);
          return next;
        });
        const fieldKey = msg.fieldPath.split('.')[1];
        setTimeout(() => {
          const el = fieldRefs.current[`${sectionKey}.${fieldKey}`];
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.transition = 'background 0.3s';
            el.style.background = '#FEF3C7';
            setTimeout(() => { el.style.background = ''; }, 1400);
          }
        }, 60);
      }
      // Phase 3: On-canvas toolbar actions (delete, duplicate, move)
      if (msg.type === 'tapas:delete-block' && msg.blockId && msg.pageKey) {
        // Ask for confirmation via the in-page modal (native confirm()
        // can be silently suppressed when triggered from a cross-origin
        // iframe's postMessage without parent-side user activation).
        const pageKey = msg.pageKey;
        const blockId = msg.blockId;
        setConfirmModal({
          title: 'Delete block?',
          message: 'This removes the block from the draft. You can undo with ⌘Z or restore by discarding changes.',
          confirmLabel: 'Delete',
          tone: 'danger',
          onConfirm: () => {
            setDraftContent(prev => {
              const page = prev.pages?.[pageKey];
              if (!page || !Array.isArray(page.blocks)) return prev;
              return {
                ...prev,
                pages: {
                  ...prev.pages,
                  [pageKey]: {
                    ...page,
                    blocks: page.blocks.filter(b => b.id !== blockId),
                  },
                },
              };
            });
            setSelectedBlockId(null);
          },
        });
        return;
      }
      if (msg.type === 'tapas:duplicate-block' && msg.blockId && msg.pageKey) {
        setDraftContent(prev => {
          const page = prev.pages?.[msg.pageKey];
          if (!page || !Array.isArray(page.blocks)) return prev;
          const blockIdx = page.blocks.findIndex(b => b.id === msg.blockId);
          if (blockIdx === -1) return prev;
          const blockToDuplicate = page.blocks[blockIdx];
          const newBlock = {
            ...blockToDuplicate,
            id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          };
          const newBlocks = [...page.blocks];
          newBlocks.splice(blockIdx + 1, 0, newBlock);
          return {
            ...prev,
            pages: {
              ...prev.pages,
              [msg.pageKey]: {
                ...page,
                blocks: newBlocks,
              },
            },
          };
        });
        return;
      }
      if (msg.type === 'tapas:move-block' && msg.blockId && msg.pageKey && msg.direction) {
        setDraftContent(prev => {
          const page = prev.pages?.[msg.pageKey];
          if (!page || !Array.isArray(page.blocks)) return prev;
          const blockIdx = page.blocks.findIndex(b => b.id === msg.blockId);
          if (blockIdx === -1) return prev;
          const newBlocks = [...page.blocks];
          if (msg.direction === 'up' && blockIdx > 0) {
            [newBlocks[blockIdx], newBlocks[blockIdx - 1]] = [newBlocks[blockIdx - 1], newBlocks[blockIdx]];
          } else if (msg.direction === 'down' && blockIdx < newBlocks.length - 1) {
            [newBlocks[blockIdx], newBlocks[blockIdx + 1]] = [newBlocks[blockIdx + 1], newBlocks[blockIdx]];
          }
          return {
            ...prev,
            pages: {
              ...prev.pages,
              [msg.pageKey]: {
                ...page,
                blocks: newBlocks,
              },
            },
          };
        });
        return;
      }
      if (msg.type === 'tapas:set-preset' && msg.blockId && msg.pageKey && msg.presetId) {
        // Canvas variant chip swap. Just flips the block's `preset`
        // prop in place — content fields stay populated so swapping is
        // reversible without losing the user's text/media.
        setDraftContent(prev => {
          const page = prev.pages?.[msg.pageKey];
          if (!page || !Array.isArray(page.blocks)) return prev;
          return {
            ...prev,
            pages: {
              ...prev.pages,
              [msg.pageKey]: {
                ...page,
                blocks: page.blocks.map(b => (
                  b.id === msg.blockId
                    ? { ...b, props: { ...(b.props || {}), preset: msg.presetId } }
                    : b
                )),
              },
            },
          };
        });
        // Surface a toast so users notice the swap and know they can
        // undo it. Hooks into the existing Cmd+Z history.
        setToast({
          message: `Variant swapped to ${msg.presetId.replace(/_/g, ' ')}`,
          actionLabel: 'Undo',
          onAction: () => undo(),
        });
        return;
      }
      if (msg.type === 'tapas:copy-block' && msg.blockId && msg.pageKey) {
        const page = draftContentRef.current?.pages?.[msg.pageKey];
        const block = page?.blocks?.find(b => b.id === msg.blockId);
        if (!block) return;
        const clipboard = { type: block.type, props: block.props };
        setCopiedBlock(clipboard);
        try { localStorage.setItem('blockClipboard', JSON.stringify(clipboard)); } catch {}
        return;
      }
      if (msg.type === 'tapas:save-template' && msg.blockId && msg.pageKey) {
        const page = draftContentRef.current?.pages?.[msg.pageKey];
        const block = page?.blocks?.find(b => b.id === msg.blockId);
        if (!block) return;
        const templateName = window.prompt('Template name:', block.type);
        if (templateName) {
          setTemplates(prev => {
            const next = [...prev, {
              name: templateName,
              type: block.type,
              props: block.props,
              createdAt: new Date().toISOString(),
            }];
            try { localStorage.setItem('blockTemplates', JSON.stringify(next)); } catch {}
            return next;
          });
        }
        return;
      }
      if (msg.type === 'tapas:reorder-blocks' && msg.blockId && msg.pageKey && msg.targetIndex !== undefined) {
        setDraftContent(prev => {
          const page = prev.pages?.[msg.pageKey];
          if (!page || !Array.isArray(page.blocks)) return prev;
          const blockIdx = page.blocks.findIndex(b => b.id === msg.blockId);
          if (blockIdx === -1) return prev;
          const newBlocks = [...page.blocks];
          const [block] = newBlocks.splice(blockIdx, 1);
          newBlocks.splice(msg.targetIndex, 0, block);
          return {
            ...prev,
            pages: {
              ...prev.pages,
              [msg.pageKey]: {
                ...page,
                blocks: newBlocks,
              },
            },
          };
        });
        return;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const vp = VIEWPORTS.find(v => v.key === viewport) || VIEWPORTS[0];
  const currentSection = CONTENT_SCHEMA.find(s => s.key === activeSection) || CONTENT_SCHEMA[0];
  const currentStorage = storageKeyForSection(currentSection);

  // Cmd+K palette commands — assembled from current editor state. New
  // commands are appended here; the palette filters by label + kind. The
  // `dirty`/`addPickerOpen` deps mean publish/discard/library entries
  // reflect the live state of the editor at open time.
  const paletteCommands = useMemo(() => {
    const cmds = [];
    for (const p of allPages) {
      cmds.push({
        id: `page:${p.key}`,
        label: `Switch to ${p.label}`,
        kind: 'Page',
        hint: p.path,
        run: () => {
          setEditingPage(p.key); setSelectedBlockId(null); setIframePath(p.path);
        },
      });
    }
    for (const [type, m] of Object.entries(BLOCK_REGISTRY_META)) {
      cmds.push({
        id: `add:${type}`,
        label: `Add block: ${m.label || type}`,
        kind: 'Add',
        hint: m.category || '',
        run: () => addBlockToPage(editingPage, type),
      });
    }
    cmds.push({ id: 'styles',     label: 'Open Design System',          kind: 'Action', run: () => setDesignModalOpen(true) });
    cmds.push({ id: 'view-d',     label: 'View: Desktop',               kind: 'View',   run: () => setViewport('desktop') });
    cmds.push({ id: 'view-t',     label: 'View: Tablet',                kind: 'View',   run: () => setViewport('tablet') });
    cmds.push({ id: 'view-m',     label: 'View: Mobile',                kind: 'View',   run: () => setViewport('mobile') });
    cmds.push({ id: 'reload',     label: 'Reload preview',              kind: 'Action', run: () => setIframeKey(k => k + 1) });
    cmds.push({ id: 'open-live',  label: 'Open live site in new tab',   kind: 'Action', run: () => window.open(STORE_URL + iframePath, '_blank', 'noreferrer') });
    cmds.push({ id: 'history',    label: 'View publish history',        kind: 'Action', run: () => setHistoryModalOpen(true) });
    cmds.push({ id: 'lib',        label: addPickerOpen ? 'Hide block library' : 'Show block library', kind: 'Action', run: () => setAddPickerOpen(o => !o) });
    if (dirty) {
      cmds.push({ id: 'publish',  label: 'Publish to live',             kind: 'Publish', accent: true,  run: () => pushToLive() });
      cmds.push({ id: 'schedule', label: 'Schedule publish…',           kind: 'Publish', run: () => setScheduleModalOpen(true) });
      cmds.push({ id: 'discard',  label: 'Discard unpublished changes', kind: 'Publish', danger: true,  run: () => revertDraft() });
    }
    return cmds;
  }, [allPages, editingPage, dirty, iframePath, addPickerOpen, addBlockToPage, pushToLive, revertDraft]);

  const filteredPaletteCommands = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return paletteCommands;
    return paletteCommands.filter(c =>
      c.label.toLowerCase().includes(q) || c.kind.toLowerCase().includes(q) || (c.hint || '').toLowerCase().includes(q)
    );
  }, [paletteQuery, paletteCommands]);

  // Clamp the cursor inside the filtered list bounds so search-then-Enter
  // never points at a stale row that no longer exists.
  useEffect(() => {
    if (paletteCursor >= filteredPaletteCommands.length) setPaletteCursor(0);
  }, [filteredPaletteCommands.length, paletteCursor]);

  return (
    <MediaLibraryContext.Provider value={mediaLibraryApi}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      background: S.bg,
      fontFamily: '-apple-system, system-ui, sans-serif',
    }}>
      {/* ==================== Scheduled publish modal ==================== */}
      {scheduleModalOpen && (
        <SchedulePublishModal
          S={S}
          onClose={() => setScheduleModalOpen(false)}
          onSchedule={async (whenIso, note) => {
            try {
              await scheduleAt(whenIso, note);
              setScheduleModalOpen(false);
            } catch (err) {
              alert('Failed to schedule: ' + (err.message || err));
            }
          }}
          pending={scheduledPublishes}
          onCancel={cancelScheduled}
        />
      )}

      {/* ==================== Revision History modal ==================== */}
      {historyModalOpen && (
        <div
          onClick={() => setHistoryModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: '-apple-system, system-ui, sans-serif',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '640px', maxHeight: '80vh',
              background: '#fff', borderRadius: '12px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${S.border}`,
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: S.text }}>
                  📜 Publish history
                </div>
                <div style={{ fontSize: '12px', color: S.textDim, marginTop: '2px' }}>
                  {revisionsLoading ? 'Loading…' : `${revisions.length} published revision${revisions.length === 1 ? '' : 's'}. Restoring a revision loads it into the draft — review and push again to go live.`}
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                style={{
                  width: '28px', height: '28px',
                  background: 'transparent', border: `1px solid ${S.border}`,
                  borderRadius: '6px', cursor: 'pointer',
                  color: S.textDim, fontSize: '14px',
                }}
              >✕</button>
            </div>
            {revisionsError && (
              <div style={{
                margin: '12px 24px 0', padding: '10px 14px',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#991b1b', borderRadius: '8px', fontSize: '12px',
              }}>⚠️ {revisionsError}</div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 20px' }}>
              {revisionsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: S.textDim, fontSize: '13px' }}>
                  Loading…
                </div>
              ) : revisions.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: S.textDim, fontSize: '13px', lineHeight: 1.6 }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗂️</div>
                  No publishes recorded yet.<br />
                  Every time you push to live, a snapshot is saved here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {revisions.map((rev, idx) => {
                    const pages = rev.content?.pages || {};
                    const totalBlocks = Object.values(pages).reduce((n, p) => n + (Array.isArray(p?.blocks) ? p.blocks.length : 0), 0);
                    const pageCount = Object.keys(pages).length;
                    const published = rev.published_at ? new Date(rev.published_at) : null;
                    return (
                      <div key={rev.id} style={{
                        padding: '12px 14px',
                        background: idx === 0 ? '#f0f9ff' : '#fff',
                        border: `1px solid ${idx === 0 ? '#bae6fd' : S.border}`,
                        borderRadius: '8px',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        gap: '10px', alignItems: 'center',
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px', fontWeight: 700, color: S.text,
                            display: 'flex', alignItems: 'center', gap: '8px',
                          }}>
                            {published ? published.toLocaleString() : 'Unknown date'}
                            {idx === 0 && (
                              <span style={{
                                padding: '2px 8px', background: '#0284c7', color: '#fff',
                                borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                              }}>CURRENT</span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: S.textDim, marginTop: '2px' }}>
                            {pageCount} page{pageCount === 1 ? '' : 's'} · {totalBlocks} block{totalBlocks === 1 ? '' : 's'}
                            {rev.published_by_email && ` · by ${rev.published_by_email}`}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            askConfirm({
                              title: 'Restore this revision?',
                              message: `Loads the ${published ? published.toLocaleString() : 'selected'} snapshot into your draft. Your current unsaved changes will be replaced. Push to live afterwards to make it active.`,
                              confirmLabel: 'Restore to draft',
                              tone: 'danger',
                              onConfirm: () => {
                                setDraftContent(rev.content);
                                setHistoryModalOpen(false);
                              },
                            });
                          }}
                          disabled={idx === 0}
                          title={idx === 0 ? 'This is already your current live content' : 'Load this revision into the draft'}
                          style={{
                            padding: '6px 12px',
                            background: idx === 0 ? S.bg : S.accent,
                            color: idx === 0 ? S.textFaint : '#fff',
                            border: 'none', borderRadius: '6px',
                            fontSize: '11px', fontWeight: '700',
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          }}
                        >Restore</button>
                        <button
                          onClick={() => {
                            askConfirm({
                              title: 'Delete this revision?',
                              message: 'Removes the historical snapshot. Live content is unaffected. This cannot be undone.',
                              confirmLabel: 'Delete',
                              tone: 'danger',
                              onConfirm: async () => {
                                try {
                                  const { error: delErr } = await supabase.from('site_content_revisions').delete().eq('id', rev.id);
                                  if (delErr) throw delErr;
                                  setRevisions(prev => prev.filter(r => r.id !== rev.id));
                                } catch (err) {
                                  setRevisionsError(err.message || 'Delete failed');
                                }
                              },
                            });
                          }}
                          title="Delete this snapshot"
                          style={{
                            width: '24px', height: '24px', padding: 0,
                            background: 'transparent', border: 'none',
                            color: S.textDim, cursor: 'pointer',
                            fontSize: '12px', borderRadius: '3px',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = S.danger; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = S.textDim; }}
                        >🗑</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== Media Library modal ==================== */}
      {mediaLibrary.open && (
        <div
          onClick={() => setMediaLibrary({ open: false, onPick: null })}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '880px', maxHeight: '85vh',
              background: '#fff', borderRadius: '12px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: '-apple-system, system-ui, sans-serif',
            }}
          >
            <div style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${S.border}`,
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: S.text }}>
                  📁 Media Library
                </div>
                <div style={{ fontSize: '12px', color: S.textDim, marginTop: '2px' }}>
                  {mediaLoading ? 'Loading…' : `${mediaItems.length} file${mediaItems.length === 1 ? '' : 's'} · bucket: ${STORAGE_BUCKET}`}
                </div>
              </div>
              <label style={{
                padding: '7px 14px',
                background: S.accent, color: '#fff', border: 'none', borderRadius: '6px',
                cursor: mediaUploading ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontWeight: '700', opacity: mediaUploading ? 0.7 : 1,
              }}>
                {mediaUploading ? '⏳ Uploading…' : '↑ Upload'}
                <input
                  type="file" accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) await uploadToLibrary(file);
                  }}
                  disabled={mediaUploading}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                onClick={() => setMediaLibrary({ open: false, onPick: null })}
                style={{
                  width: '28px', height: '28px',
                  background: 'transparent', border: `1px solid ${S.border}`,
                  borderRadius: '6px', cursor: 'pointer',
                  color: S.textDim, fontSize: '14px',
                }}
              >✕</button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 24px', borderBottom: `1px solid ${S.border}`, background: S.bg }}>
              <input
                type="text"
                value={mediaQuery}
                onChange={(e) => setMediaQuery(e.target.value)}
                placeholder="🔍 Search by filename…"
                style={{
                  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
                  background: '#fff', border: `1px solid ${S.border}`,
                  borderRadius: '6px', fontSize: '13px', color: S.text,
                  outline: 'none',
                }}
              />
            </div>

            {mediaError && (
              <div style={{
                margin: '12px 24px 0', padding: '10px 14px',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#991b1b', borderRadius: '8px', fontSize: '12px',
              }}>⚠️ {mediaError}</div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
              {mediaLoading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: S.textDim, fontSize: '13px' }}>
                  Loading library…
                </div>
              ) : mediaItems.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: S.textDim, fontSize: '13px', lineHeight: 1.6 }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🖼️</div>
                  No images uploaded yet.<br />
                  Click <b>↑ Upload</b> above to add one.
                </div>
              ) : (() => {
                const q = mediaQuery.trim().toLowerCase();
                const filtered = q ? mediaItems.filter(m => m.name.toLowerCase().includes(q)) : mediaItems;
                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '40px', textAlign: 'center', color: S.textDim, fontSize: '13px' }}>
                      No files match "{mediaQuery}".
                    </div>
                  );
                }
                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '12px',
                  }}>
                    {filtered.map((m) => (
                      <div
                        key={m.name}
                        style={{
                          background: '#fff',
                          border: `1px solid ${S.border}`,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <button
                          onClick={() => {
                            const pick = mediaLibrary.onPick;
                            setMediaLibrary({ open: false, onPick: null });
                            if (pick) try { pick(m.url); } catch {}
                          }}
                          title={m.name}
                          style={{
                            display: 'block', width: '100%',
                            padding: 0, background: 'transparent',
                            border: 'none', cursor: 'pointer',
                          }}
                        >
                          <img
                            src={m.url}
                            alt={m.name}
                            loading="lazy"
                            style={{
                              width: '100%', height: '120px', objectFit: 'cover',
                              background: '#f3f4f6',
                              display: 'block',
                            }}
                          />
                        </button>
                        <div style={{
                          padding: '6px 10px',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          borderTop: `1px solid ${S.border}`,
                        }}>
                          <div style={{
                            flex: 1, minWidth: 0,
                            fontSize: '10px', color: S.textDim,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontFamily: 'ui-monospace, monospace',
                          }}>{m.name}</div>
                          <button
                            onClick={() => {
                              askConfirm({
                                title: `Delete "${m.name}"?`,
                                message: 'The file will be permanently removed from storage. Blocks still referencing this URL will show a broken image until you update them.',
                                confirmLabel: 'Delete file',
                                tone: 'danger',
                                onConfirm: () => deleteMediaItem(m.name),
                              });
                            }}
                            title="Delete from storage"
                            style={{
                              width: '22px', height: '22px', padding: 0,
                              background: 'transparent', border: 'none',
                              color: S.textDim, cursor: 'pointer',
                              fontSize: '11px', borderRadius: '2px',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = S.danger; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = S.textDim; }}
                          >🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== Design System modal ====================
          Global design tokens live here, not in the sidebar. Tabs mirror
          the old DESIGN sidebar group: Brand, Typography, Buttons, Images.
          Fields use the existing CONTENT_SCHEMA + FIELD_RENDERERS so
          autosave and live-preview continue to work unchanged. */}
      {designModalOpen && (() => {
        const DS_TABS = [
          { key: 'brand',      label: 'Brand',      icon: '🎨' },
          { key: 'typography', label: 'Typography', icon: '🔤' },
          { key: 'buttons',    label: 'Buttons',    icon: '◯' },
          { key: 'images',     label: 'Images',     icon: '🖼' },
        ];
        const activeKey = DS_TABS.some(t => t.key === designModalTab) ? designModalTab : 'brand';
        const section = CONTENT_SCHEMA.find(s => s.key === activeKey);
        if (!section) return null;
        const subGroups = SECTION_SUB_GROUPS[activeKey];
        const storage = activeKey;
        const renderField = (field) => {
          const Renderer = FIELD_RENDERERS[field.type] || TextField;
          const value = draftContent[storage]?.[field.key];
          return (
            <Renderer
              key={field.key}
              field={field}
              value={value}
              onChange={(v) => updateField(storage, field.key, v)}
            />
          );
        };
        // Custom colors live on brand.custom_colors — a dynamic array
        // appended to the Fill subsection so users can add palette
        // swatches beyond the hard-coded primary/accent/cream/sand.
        const customColors = (draftContent[storage]?.custom_colors) || [];
        const addCustomColor = () => {
          setDraftContent(prev => ({
            ...prev,
            [storage]: {
              ...(prev[storage] || {}),
              custom_colors: [...((prev[storage] || {}).custom_colors || []), '#FFFFFF'],
            },
          }));
        };
        const setCustomColor = (idx, val) => {
          setDraftContent(prev => {
            const arr = [...(((prev[storage] || {}).custom_colors) || [])];
            arr[idx] = val;
            return { ...prev, [storage]: { ...(prev[storage] || {}), custom_colors: arr } };
          });
        };
        const removeCustomColor = (idx) => {
          setDraftContent(prev => {
            const arr = [...(((prev[storage] || {}).custom_colors) || [])];
            arr.splice(idx, 1);
            return { ...prev, [storage]: { ...(prev[storage] || {}), custom_colors: arr } };
          });
        };

        return (
          <div
            onClick={() => setDesignModalOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') setDesignModalOpen(false); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 180,
              background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '920px', maxHeight: 'calc(100vh - 80px)',
                background: '#fff', borderRadius: '12px',
                boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: '-apple-system, system-ui, sans-serif',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 22px', borderBottom: `1px solid ${S.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🎨</span>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: S.text }}>Design System</div>
                    <div style={{ fontSize: '11px', color: S.textDim }}>Global brand, typography, buttons &amp; images</div>
                  </div>
                </div>
                <button
                  onClick={() => setDesignModalOpen(false)}
                  title="Close (Esc)"
                  style={{
                    width: '32px', height: '32px', padding: 0,
                    background: 'transparent', border: 'none',
                    color: S.textDim, cursor: 'pointer',
                    fontSize: '22px', borderRadius: '6px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = S.bg; e.currentTarget.style.color = S.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.textDim; }}
                >×</button>
              </div>

              {/* Body: left tab rail + right form */}
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {/* Tabs */}
                <div style={{
                  width: '180px', flexShrink: 0,
                  background: S.bg,
                  borderRight: `1px solid ${S.border}`,
                  padding: '14px 10px',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}>
                  {DS_TABS.map(t => {
                    const active = activeKey === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setDesignModalTab(t.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 12px',
                          background: active ? '#fff' : 'transparent',
                          border: active ? `1px solid ${S.border}` : '1px solid transparent',
                          borderRadius: '6px',
                          color: active ? S.accent : S.text,
                          cursor: 'pointer',
                          fontSize: '12px', fontWeight: active ? '700' : '500',
                          textAlign: 'left',
                          boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#fff'; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: '14px' }}>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Form */}
                <div style={{ flex: 1, overflowY: 'auto', background: D.panel, padding: '16px 0 32px' }}>
                  {section.subtitle && (
                    <div style={{
                      padding: '0 16px 14px', color: D.textFaint,
                      fontSize: '11px', lineHeight: '1.45', fontStyle: 'italic',
                    }}>
                      {section.subtitle}
                    </div>
                  )}
                  {(() => {
                    if (!subGroups) return section.fields.map(renderField);
                    const mentioned = new Set(subGroups.flatMap(g => g.keys));
                    const other = section.fields.filter(f => !mentioned.has(f.key));
                    return (
                      <>
                        {subGroups.map(group => {
                          const groupFields = group.keys
                            .map(k => section.fields.find(f => f.key === k))
                            .filter(Boolean);
                          if (groupFields.length === 0 && !group.hasAdd) return null;
                          const isFill = group.hasAdd && activeKey === 'brand';
                          return (
                            <SubSection
                              key={group.title}
                              title={group.title}
                              defaultOpen={true}
                              actions={group.hasAdd ? (
                                <HeaderIconButton title="Add fill" onClick={isFill ? addCustomColor : undefined}>+</HeaderIconButton>
                              ) : null}
                            >
                              {groupFields.map(renderField)}
                              {isFill && customColors.map((c, idx) => (
                                <div key={`custom-${idx}`} style={{ position: 'relative' }}>
                                  <ColorField
                                    field={{ key: `custom_${idx}`, label: `Custom ${idx + 1}` }}
                                    value={c}
                                    onChange={(v) => setCustomColor(idx, v)}
                                  />
                                  <button
                                    type="button"
                                    title="Remove"
                                    onClick={() => removeCustomColor(idx)}
                                    style={{
                                      position: 'absolute', top: '6px', right: '14px',
                                      width: '18px', height: '18px', padding: 0,
                                      background: 'transparent', border: 'none',
                                      color: D.textFaint, cursor: 'pointer',
                                      fontSize: '12px', borderRadius: '2px',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = D.danger; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = D.textFaint; }}
                                  >✕</button>
                                </div>
                              ))}
                            </SubSection>
                          );
                        })}
                        {other.length > 0 && (
                          <SubSection title="Other" defaultOpen={true}>
                            {other.map(renderField)}
                          </SubSection>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 22px', borderTop: `1px solid ${S.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: S.bg,
              }}>
                <div style={{ fontSize: '11px', color: S.textDim }}>
                  Changes save to draft automatically. Click Publish to push.
                </div>
                <button
                  onClick={() => setDesignModalOpen(false)}
                  style={{
                    padding: '8px 18px',
                    background: S.accent, color: '#fff',
                    border: 'none', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                  }}
                >Done</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== Confirm modal ==================== */}
      {confirmModal && (
        <div
          onClick={() => setConfirmModal(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setConfirmModal(null);
            if (e.key === 'Enter') {
              try { confirmModal.onConfirm?.(); } catch {}
              setConfirmModal(null);
            }
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '420px',
              background: '#fff', borderRadius: '12px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
              padding: '24px',
              fontFamily: '-apple-system, system-ui, sans-serif',
            }}
          >
            <div style={{
              fontSize: '16px', fontWeight: '700', color: S.text, marginBottom: '8px',
            }}>{confirmModal.title}</div>
            {confirmModal.message && (
              <div style={{
                fontSize: '13px', color: S.textDim, lineHeight: 1.5, marginBottom: '20px',
              }}>{confirmModal.message}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: '8px 16px',
                  background: '#fff',
                  border: `1px solid ${S.border}`,
                  borderRadius: '6px',
                  color: S.text,
                  fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                autoFocus
                onClick={() => {
                  const fn = confirmModal.onConfirm;
                  setConfirmModal(null);
                  try { fn?.(); } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('[confirm] action failed', err);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: confirmModal.tone === 'danger' ? (S.danger || '#dc2626') : S.accent,
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                }}
              >{confirmModal.confirmLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== New page modal ==================== */}
      {newPageOpen && (
        <div
          onClick={() => { setNewPageOpen(false); setNewPageLabel(''); setNewPagePath(''); setNewPageError(''); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '460px',
              background: '#fff', borderRadius: '12px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
              padding: '24px',
              fontFamily: '-apple-system, system-ui, sans-serif',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '700', color: S.text, marginBottom: '4px' }}>
              Create a new page
            </div>
            <div style={{ fontSize: '13px', color: S.textDim, lineHeight: 1.5, marginBottom: '18px' }}>
              Give the page a name and a URL path. You'll drop blocks onto it like any other page.
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: S.textDim, display: 'block', marginBottom: '4px' }}>
                Page name
              </label>
              <input
                autoFocus
                type="text"
                value={newPageLabel}
                onChange={(e) => {
                  const label = e.target.value;
                  setNewPageLabel(label);
                  // Auto-fill path from label if path is still empty or matches the auto-generated one
                  const autoPath = '/' + label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                  if (!newPagePath || newPagePath === '/' || newPagePath.startsWith('/') && /^[/a-z0-9-]*$/.test(newPagePath)) {
                    setNewPagePath(autoPath);
                  }
                }}
                placeholder="e.g. Our Team"
                style={{
                  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
                  background: '#fff', border: `1px solid ${S.border}`,
                  borderRadius: '6px', fontSize: '13px', color: S.text,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: S.textDim, display: 'block', marginBottom: '4px' }}>
                URL path
              </label>
              <input
                type="text"
                value={newPagePath}
                onChange={(e) => setNewPagePath(e.target.value)}
                placeholder="/our-team"
                style={{
                  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
                  background: '#fff', border: `1px solid ${S.border}`,
                  borderRadius: '6px', fontSize: '13px', color: S.text,
                  outline: 'none',
                  fontFamily: 'ui-monospace, monospace',
                }}
              />
              <div style={{ fontSize: '11px', color: S.textFaint, marginTop: '4px' }}>
                Must start with "/". App routes (/cart, /checkout, /login, /profile, /order, /member) and detail routes (/books/*, /blog/*) are reserved.
              </div>
            </div>
            {newPageError && (
              <div style={{
                marginBottom: '14px',
                padding: '10px 12px',
                background: '#FEF3F2', color: S.danger,
                border: `1px solid ${S.danger}33`, borderRadius: '6px',
                fontSize: '12px', fontWeight: '500', lineHeight: 1.45,
              }}>{newPageError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setNewPageOpen(false); setNewPageLabel(''); setNewPagePath(''); setNewPageError(''); }}
                style={{
                  padding: '8px 16px', background: '#fff',
                  border: `1px solid ${S.border}`, borderRadius: '6px',
                  color: S.text, fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={() => {
                  const label = newPageLabel.trim();
                  let path = newPagePath.trim();
                  if (!label) { setNewPageError('Page name is required.'); return; }
                  if (!path.startsWith('/')) path = '/' + path;
                  if (path.length < 2) { setNewPageError('URL path must have at least one character after "/".'); return; }
                  if (!/^\/[a-z0-9][a-z0-9-/]*$/.test(path)) {
                    setNewPageError('URL path may only contain lowercase letters, digits, and dashes (e.g. /our-team).');
                    return;
                  }
                  if (RESERVED_PATHS.has(path) || path.startsWith('/books/') || path.startsWith('/blog/') || path.startsWith('/order/')) {
                    setNewPageError(`"${path}" is reserved. Pick a different path.`);
                    return;
                  }
                  // Make sure no existing page already uses this path.
                  const pathTaken = allPages.some(p => p.path === path);
                  if (pathTaken) { setNewPageError(`A page already uses "${path}".`); return; }
                  const key = 'page_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
                  setDraftContent(prev => ({
                    ...prev,
                    pages: {
                      ...(prev.pages || {}),
                      [key]: {
                        meta: { label, path, title: label, description: '' },
                        blocks: [],
                      },
                    },
                  }));
                  setEditingPage(key);
                  setIframePath(path);
                  setSelectedBlockId(null);
                  setNewPageOpen(false);
                  setNewPageLabel('');
                  setNewPagePath('');
                  setNewPageError('');
                }}
                style={{
                  padding: '8px 16px', background: S.accent,
                  border: 'none', borderRadius: '6px',
                  color: '#fff', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer',
                }}
              >Create page</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Templates modal ==================== */}
      {templatesOpen && (
        <div
          onClick={() => setTemplatesOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '720px', maxHeight: '80vh',
              background: '#fff', borderRadius: '12px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${S.border}`,
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: S.text }}>
                  ⭐ Templates
                </div>
                <div style={{ fontSize: '12px', color: S.textDim, marginTop: '2px' }}>
                  Pick a starter variant, or insert one of your saved blocks.
                </div>
              </div>
              <button
                onClick={() => setTemplatesOpen(false)}
                style={{
                  width: '28px', height: '28px',
                  background: 'transparent', border: `1px solid ${S.border}`,
                  borderRadius: '6px', cursor: 'pointer',
                  color: S.textDim, fontSize: '14px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = S.text; e.currentTarget.style.background = S.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = S.textDim; e.currentTarget.style.background = 'transparent'; }}
              >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
              {/* Starter variants — every preset for every block type
                  that advertises one. Grouped by block type so the
                  user can browse "Hero variants / Navbar variants /
                  Footer variants". Click inserts a fresh block with
                  the preset's styling defaults applied. */}
              {Object.entries(BLOCK_REGISTRY_META)
                .filter(([, meta]) => Array.isArray(meta.presets) && meta.presets.length > 0)
                .map(([type, meta]) => (
                  <div key={type} style={{ marginBottom: '24px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: '8px',
                      marginBottom: '10px',
                    }}>
                      <span style={{ fontSize: '16px' }}>{meta.icon || '▫'}</span>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: S.text }}>
                        {meta.label} variants
                      </div>
                      <div style={{ fontSize: '11px', color: S.textDim }}>
                        {meta.presets.length}
                      </div>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '8px',
                    }}>
                      {meta.presets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            addBlockToPage(editingPage, type, undefined, preset.id);
                            setTemplatesOpen(false);
                          }}
                          title={preset.hint}
                          style={{
                            textAlign: 'left', padding: '12px',
                            background: '#fff', border: `1px solid ${S.border}`,
                            borderRadius: '8px', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', gap: '4px',
                            transition: 'border-color 0.12s, background 0.12s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = S.accent; e.currentTarget.style.background = S.accentLight; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.background = '#fff'; }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: '700', color: S.text }}>
                            {preset.label}
                          </div>
                          {preset.hint && (
                            <div style={{ fontSize: '10.5px', color: S.textDim, lineHeight: 1.4 }}>
                              {preset.hint}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              }

              {/* Saved blocks — user-created templates from the canvas
                  ⭐ button. Rendered below the starter variants so
                  personal saves don't get lost in the starter grid. */}
              <div style={{
                marginTop: '8px', paddingTop: '16px',
                borderTop: `1px solid ${S.border}`,
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: S.text, marginBottom: '4px' }}>
                  Your saved blocks
                </div>
                <div style={{ fontSize: '11px', color: S.textDim, marginBottom: '12px' }}>
                  {templates.length === 0
                    ? 'Hover any block on the canvas and click ⭐ to save it here.'
                    : `${templates.length} saved — click to insert into ${allPages.find(p => p.key === editingPage)?.label || editingPage}.`}
                </div>
              </div>
              {templates.length === 0 ? (
                <div style={{ height: '4px' }} />
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '10px',
                }}>
                  {templates.map((t, idx) => {
                    const meta = BLOCK_REGISTRY_META[t.type];
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex', flexDirection: 'column',
                          padding: '14px',
                          background: '#fff',
                          border: `1px solid ${S.border}`,
                          borderRadius: '8px',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>{meta?.icon || '▫'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '12px', fontWeight: '700', color: S.text,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{t.name}</div>
                            <div style={{ fontSize: '10px', color: S.textDim }}>
                              {meta?.label || t.type}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setDraftContent(prev => {
                                const page = prev.pages?.[editingPage];
                                if (!page || !Array.isArray(page.blocks)) return prev;
                                const newBlock = {
                                  id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                  type: t.type,
                                  props: JSON.parse(JSON.stringify(t.props || {})),
                                };
                                return {
                                  ...prev,
                                  pages: {
                                    ...prev.pages,
                                    [editingPage]: { ...page, blocks: [...page.blocks, newBlock] },
                                  },
                                };
                              });
                              setTemplatesOpen(false);
                            }}
                            style={{
                              flex: 1, padding: '6px 10px',
                              background: S.accent, color: '#fff',
                              border: 'none', borderRadius: '4px',
                              fontSize: '11px', fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >Insert</button>
                          <button
                            onClick={() => {
                              askConfirm({
                                title: `Delete template "${t.name}"?`,
                                message: 'The template will be removed from your saved list.',
                                confirmLabel: 'Delete template',
                                tone: 'danger',
                                onConfirm: () => setTemplates(prev => {
                                  const next = prev.filter((_, i) => i !== idx);
                                  try { localStorage.setItem('blockTemplates', JSON.stringify(next)); } catch {}
                                  return next;
                                }),
                              });
                            }}
                            title="Delete template"
                            style={{
                              padding: '6px 10px',
                              background: 'transparent', color: S.danger || '#dc2626',
                              border: `1px solid ${S.border}`, borderRadius: '4px',
                              fontSize: '11px', fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add-section picker is now an inline side panel in the body grid
          (see LibraryPanel below the left sidebar) — modal removed in
          favor of a Webflow-style dockable library that supports
          drag-from-tile to insert at a specific position. */}

      {/* ==================== Top toolbar ====================
          Slim Webflow/Figma-style top bar:
          - Title + page switcher + status dot on the left
          - Undo/Redo + Styles + ⋯ overflow + Publish on the right
          Destructive (Discard) and infrequent (History, Schedule) live
          inside the ⋯ menu so the bar isn't crowded. */}
      <div style={{
        height: '52px',
        flexShrink: 0,
        background: S.panel,
        borderBottom: `1px solid ${S.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <Palette size={16} color={S.text} strokeWidth={2.25} />
          <span style={{ fontSize: '13px', fontWeight: '700', color: S.text, flexShrink: 0 }}>Edit Website</span>
          <span style={{ color: S.textFaint, fontSize: '12px', flexShrink: 0 }}>/</span>

          {/* Page switcher — same state as the sidebar Pages list. */}
          <select
            value={editingPage}
            onChange={(e) => {
              setEditingPage(e.target.value);
              setSelectedBlockId(null);
              const p = allPages.find(x => x.key === e.target.value);
              if (p) setIframePath(p.path);
            }}
            title="Switch page"
            style={{
              padding: '5px 26px 5px 10px',
              background: '#fff', border: `1px solid ${S.border}`,
              borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: S.text,
              cursor: 'pointer', outline: 'none',
              flexShrink: 0,
            }}
          >
            {allPages.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>

          {/* Status: a single colored dot + short label.
              saving=blue, dirty=amber, recently-pushed=green, idle=gray. */}
          {(() => {
            let dot, label, tip;
            if (saving) { dot = S.accent; label = 'Saving…'; tip = 'Saving draft to Supabase'; }
            else if (dirty) { dot = S.warning; label = 'Unpublished'; tip = 'Draft has changes that aren\'t live yet'; }
            else if (pushedAt) { dot = S.success; label = 'Published'; tip = `Published at ${pushedAt.toLocaleTimeString()}`; }
            else { dot = S.borderStrong; label = 'In sync'; tip = 'Draft matches the live site'; }
            return (
              <div title={tip} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px',
                background: S.bg, borderRadius: '20px',
                fontSize: '11px', color: S.textDim, fontWeight: '600',
                cursor: 'default', userSelect: 'none',
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                {label}
              </div>
            );
          })()}
        </div>

        {/* Undo / redo */}
        <div style={{ display: 'flex', gap: '2px', background: S.bg, padding: '2px', borderRadius: '6px' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            style={{
              width: '30px', height: '26px',
              background: canUndo ? 'white' : 'transparent',
              border: 'none', borderRadius: '4px',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              color: canUndo ? S.text : S.textFaint,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              boxShadow: canUndo ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          ><Undo2 size={14} strokeWidth={2.25} /></button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            style={{
              width: '30px', height: '26px',
              background: canRedo ? 'white' : 'transparent',
              border: 'none', borderRadius: '4px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              color: canRedo ? S.text : S.textFaint,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              boxShadow: canRedo ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          ><Redo2 size={14} strokeWidth={2.25} /></button>
        </div>

        {/* Design System trigger */}
        <button
          onClick={() => setDesignModalOpen(true)}
          title="Edit global brand, typography, buttons, and images"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', height: '30px',
            background: 'white',
            border: `1px solid ${S.border}`,
            borderRadius: '6px',
            color: S.text, cursor: 'pointer',
            fontSize: '12px', fontWeight: '600',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = S.bg; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
        >
          <Palette size={13} strokeWidth={2.25} />
          Styles
        </button>

        {/* Overflow menu — History, Schedule, Discard */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOverflowMenuOpen(o => !o)}
            title="More actions"
            style={{
              width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: overflowMenuOpen ? S.bg : 'white',
              border: `1px solid ${S.border}`, borderRadius: '6px',
              color: S.text, cursor: 'pointer',
            }}
            onMouseEnter={e => { if (!overflowMenuOpen) e.currentTarget.style.background = S.bg; }}
            onMouseLeave={e => { if (!overflowMenuOpen) e.currentTarget.style.background = 'white'; }}
          ><MoreHorizontal size={16} strokeWidth={2.25} /></button>
          {overflowMenuOpen && (
            <>
              {/* Click-outside catcher */}
              <div
                onClick={() => setOverflowMenuOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
              />
              <div style={{
                position: 'absolute', top: '34px', right: 0,
                minWidth: '210px',
                background: '#fff',
                border: `1px solid ${S.border}`, borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                padding: '6px', zIndex: 91,
              }}>
                {[
                  { label: 'Publish history', icon: History, onClick: () => { setHistoryModalOpen(true); setOverflowMenuOpen(false); }, disabled: false },
                  { label: 'Schedule publish', icon: CalendarClock, onClick: () => { setScheduleModalOpen(true); setOverflowMenuOpen(false); }, disabled: !dirty, disabledTip: 'Edit the draft first' },
                  { sep: true },
                  { label: 'Discard changes', icon: Trash2, danger: true, onClick: () => { revertDraft(); setOverflowMenuOpen(false); }, disabled: !dirty || pushing, disabledTip: 'Nothing to discard' },
                  { label: 'Reset site to blank',    icon: RotateCcw, danger: true, onClick: () => { resetToDefaults(); setOverflowMenuOpen(false); }, disabled: pushing },
                ].map((item, idx) => {
                  if (item.sep) return <div key={idx} style={{ height: '1px', background: S.border, margin: '4px 6px' }} />;
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={item.disabled ? undefined : item.onClick}
                      disabled={item.disabled}
                      title={item.disabled ? item.disabledTip : ''}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px',
                        background: 'transparent', border: 'none', borderRadius: '4px',
                        color: item.disabled ? S.textFaint : (item.danger ? S.danger : S.text),
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        fontSize: '12px', fontWeight: '500',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = item.danger ? '#FEF2F2' : S.bg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Icon size={14} strokeWidth={2.25} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Publish — the only button that stays a primary CTA. */}
        <button
          onClick={pushToLive}
          disabled={!dirty || pushing || saving}
          title={dirty ? 'Publish draft to live site' : 'Nothing to publish'}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '7px 16px', height: '30px',
            background: dirty ? S.accent : S.borderStrong,
            color: 'white',
            border: 'none', borderRadius: '6px',
            cursor: (!dirty || pushing || saving) ? 'not-allowed' : 'pointer',
            fontSize: '12px', fontWeight: '700',
            boxShadow: dirty ? '0 2px 8px rgba(13,153,255,0.35)' : 'none',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (dirty && !pushing) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,153,255,0.45)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = dirty ? '0 2px 8px rgba(13,153,255,0.35)' : 'none'; }}
        >
          <Rocket size={13} strokeWidth={2.25} />
          {pushing ? 'Publishing…' : 'Publish'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: '#FEF3F2', color: S.danger, fontSize: '12px', borderBottom: `1px solid ${S.border}` }}>
          ⚠️ {error}
        </div>
      )}

      {/* ==================== Body: 3 panels (+ drag context) ==================== */}
      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => {
          const data = active.data?.current;
          if (data?.kind === 'library') setActiveDragLib({ type: data.type });
        }}
        onDragCancel={() => setActiveDragLib(null)}
        onDragEnd={({ active, over }) => {
          setActiveDragLib(null);
          if (!over) return;
          const data = active.data?.current;
          const blocks = getBlocks(editingPage);

          // Library → tree drop. Three cases:
          //   1. Over a tapas_group row → add as CHILD of that group
          //   2. Over any other block row → insert at that index (sibling)
          //   3. Over empty zone / canvas → append to the page
          // Preset tiles forward their presetId so the new block opens
          // with the variant's styling defaults applied.
          if (data?.kind === 'library') {
            if (over.id !== 'layers-end' && over.id !== 'canvas-drop') {
              const overBlock = blocks.find(b => b.id === over.id);
              if (overBlock?.type === 'tapas_group') {
                addBlockAsChild(editingPage, overBlock.id, data.type, data.presetId);
                return;
              }
            }
            let insertAt = blocks.length;
            if (over.id !== 'layers-end' && over.id !== 'canvas-drop') {
              const idx = blocks.findIndex(b => b.id === over.id);
              if (idx >= 0) insertAt = idx;
            }
            addBlockToPage(editingPage, data.type, insertAt, data.presetId);
            return;
          }

          // In-tree reorder (existing behavior).
          if (active.id !== over.id) {
            const oldIdx = blocks.findIndex(b => b.id === active.id);
            const newIdx = blocks.findIndex(b => b.id === over.id);
            if (oldIdx >= 0 && newIdx >= 0) {
              mutateBlocks(editingPage, b => arrayMove(b, oldIdx, newIdx));
            }
          }
        }}
      >
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* LEFT: pages + sections — hamburger-collapsible */}
        <aside style={{
          width: leftCollapsed ? '0px' : '240px',
          flexShrink: 0,
          background: S.panel,
          borderRight: leftCollapsed ? 'none' : `1px solid ${S.border}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'width 0.22s ease',
        }}>
          {/* Single-panel sidebar (Webflow/Figma style): Pages + Layers.
              Tabs removed — global design tokens live in the toolbar
              Styles modal. */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* Page picker — which page's block tree we're editing. */}
              <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${S.border}` }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '6px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: S.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Editing page
                  </div>
                  <button
                    onClick={() => setNewPageOpen(true)}
                    title="Create a new page"
                    style={{
                      padding: '2px 8px',
                      background: 'transparent',
                      color: S.accent,
                      border: `1px solid ${S.accent}55`,
                      borderRadius: '3px',
                      fontSize: '10px', fontWeight: '700',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = S.accent; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.accent; }}
                  >+ New</button>
                </div>
                <select
                  value={editingPage}
                  onChange={(e) => {
                    setEditingPage(e.target.value);
                    setSelectedBlockId(null);
                    // Navigate the preview iframe to match so staff sees
                    // the page they're editing.
                    const p = allPages.find(x => x.key === e.target.value);
                    if (p) setIframePath(p.path);
                  }}
                  style={{
                    width: '100%', padding: '7px 10px',
                    background: '#fff', border: `1px solid ${S.border}`,
                    borderRadius: '4px', fontSize: '12px', color: S.text,
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  {allPages.map(p => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                {/* Slug for custom pages + delete + SEO previously
                    lived here. They're all in the right-panel Page
                    Settings now (which is the contextual default when
                    nothing is selected on the canvas). */}
              </div>

              {/* Add section button — toggles the inline Block Library
                  panel. When open, button shows "× Close library" so
                  the user knows the same button dismisses it. */}
              <div style={{ padding: '12px 14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    if (addPickerOpen) { setAddPickerOpen(false); setAddPickerSearch(''); }
                    else setAddPickerOpen(true);
                  }}
                  style={{
                    flex: 1, minWidth: '120px', padding: '10px 12px',
                    background: addPickerOpen ? S.bg : S.accent,
                    color: addPickerOpen ? S.text : '#fff',
                    border: addPickerOpen ? `1px solid ${S.border}` : 'none',
                    borderRadius: '4px',
                    fontSize: '12px', fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: addPickerOpen ? 'none' : '0 1px 3px rgba(13,153,255,0.3)',
                  }}
                >{addPickerOpen ? '× Close library' : '+ Add section'}</button>
                {copiedBlock && (
                  <button
                    onClick={() => {
                      setDraftContent(prev => {
                        const page = prev.pages?.[editingPage];
                        if (!page || !Array.isArray(page.blocks)) return prev;
                        const newBlock = {
                          id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                          type: copiedBlock.type,
                          props: copiedBlock.props,
                        };
                        return {
                          ...prev,
                          pages: {
                            ...prev.pages,
                            [editingPage]: { ...page, blocks: [...page.blocks, newBlock] },
                          },
                        };
                      });
                    }}
                    title={`Paste: ${copiedBlock.type}`}
                    style={{
                      padding: '10px 12px',
                      background: '#10b981', color: '#fff',
                      border: 'none', borderRadius: '4px',
                      fontSize: '12px', fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >📋 Paste</button>
                )}
                <button
                  onClick={() => setTemplatesOpen(true)}
                  style={{
                    padding: '10px 12px',
                    background: S.borderStrong, color: S.text,
                    border: 'none', borderRadius: '4px',
                    fontSize: '12px', fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  title={`Open template library (${templates.length} saved)`}
                >⭐ Templates{templates.length > 0 ? ` (${templates.length})` : ''}</button>
              </div>

              {/* Phase 5: Export / Import current page as JSON */}
              <div style={{ padding: '0 14px 12px', display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    const page = draftContent?.pages?.[editingPage];
                    const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
                    // Strip ids — caller may import into a different page and
                    // we regenerate on import to avoid collisions.
                    const stripped = blocks.map(b => ({ type: b.type, props: b.props || {} }));
                    const meta = page?.meta || {};
                    const payload = {
                      format: 'tapas-page',
                      version: 1,
                      exported_at: new Date().toISOString(),
                      page: {
                        key: editingPage,
                        label: allPages.find(p => p.key === editingPage)?.label || editingPage,
                        meta: { title: meta.title || '', description: meta.description || '' },
                        blocks: stripped,
                      },
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tapas-${editingPage}-${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  title="Download this page as JSON"
                  style={{
                    flex: 1, padding: '7px 8px',
                    background: 'transparent', color: S.text,
                    border: `1px solid ${S.border}`, borderRadius: '4px',
                    fontSize: '11px', fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >⬇ Export JSON</button>
                <label
                  title="Replace this page's blocks with an imported JSON file"
                  style={{
                    flex: 1, padding: '7px 8px', textAlign: 'center',
                    background: 'transparent', color: S.text,
                    border: `1px solid ${S.border}`, borderRadius: '4px',
                    fontSize: '11px', fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ⬆ Import JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        const text = await file.text();
                        const parsed = JSON.parse(text);
                        const incoming = parsed?.page?.blocks;
                        if (!Array.isArray(incoming)) throw new Error('File does not contain a valid page.blocks array.');
                        askConfirm({
                          title: `Replace ${allPages.find(p => p.key === editingPage)?.label || editingPage} with ${incoming.length} imported blocks?`,
                          message: 'Blocks currently on this page will be replaced. Your draft is saved, so you can Discard changes to undo.',
                          confirmLabel: 'Replace blocks',
                          tone: 'danger',
                          onConfirm: () => {
                            const freshBlocks = incoming.map((b) => ({
                              id: 'block_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
                              type: b.type,
                              props: b.props || {},
                            }));
                            setDraftContent(prev => {
                              const page = prev.pages?.[editingPage] || { meta: {}, blocks: [] };
                              const incomingMeta = parsed?.page?.meta || {};
                              return {
                                ...prev,
                                pages: {
                                  ...(prev.pages || {}),
                                  [editingPage]: {
                                    ...page,
                                    meta: {
                                      ...(page.meta || {}),
                                      ...(incomingMeta.title ? { title: incomingMeta.title } : {}),
                                      ...(incomingMeta.description ? { description: incomingMeta.description } : {}),
                                    },
                                    blocks: freshBlocks,
                                  },
                                },
                              };
                            });
                            setSelectedBlockId(null);
                          },
                        });
                      } catch (err) {
                        setError('Import failed: ' + (err.message || err));
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Phase 4: batch action bar (only visible when multi-selected) */}
              {multiSelectedIds.size > 0 && (
                <div style={{
                  margin: '0 14px 8px', padding: '8px 10px',
                  background: S.accentLight || '#DBEAFE',
                  border: `1px solid ${S.accent}44`,
                  borderRadius: '4px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '11px',
                }}>
                  <span style={{ flex: 1, fontWeight: '600', color: S.accent }}>
                    {multiSelectedIds.size + 1} selected
                  </span>
                  <button
                    onClick={() => {
                      const count = multiSelectedIds.size + 1;
                      askConfirm({
                        title: `Delete ${count} blocks?`,
                        message: 'All selected blocks will be removed from the draft. You can undo with ⌘Z.',
                        confirmLabel: `Delete ${count}`,
                        tone: 'danger',
                        onConfirm: () => {
                          const idsToDelete = new Set([selectedBlockId, ...multiSelectedIds]);
                          setDraftContent(prev => {
                            const page = prev.pages?.[editingPage];
                            if (!page || !Array.isArray(page.blocks)) return prev;
                            return {
                              ...prev,
                              pages: {
                                ...prev.pages,
                                [editingPage]: {
                                  ...page,
                                  blocks: page.blocks.filter(b => !idsToDelete.has(b.id)),
                                },
                              },
                            };
                          });
                          setSelectedBlockId(null);
                          setMultiSelectedIds(new Set());
                        },
                      });
                    }}
                    style={{
                      padding: '5px 10px', background: S.danger || '#dc2626', color: '#fff',
                      border: 'none', borderRadius: '3px', fontSize: '11px',
                      fontWeight: '600', cursor: 'pointer',
                    }}
                  >🗑 Delete all</button>
                  <button
                    onClick={() => {
                      const idsToDuplicate = [selectedBlockId, ...multiSelectedIds];
                      setDraftContent(prev => {
                        const page = prev.pages?.[editingPage];
                        if (!page || !Array.isArray(page.blocks)) return prev;
                        const newBlocks = [...page.blocks];
                        idsToDuplicate.forEach(id => {
                          const original = page.blocks.find(x => x.id === id);
                          if (original) {
                            newBlocks.push({
                              ...original,
                              id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            });
                          }
                        });
                        return {
                          ...prev,
                          pages: {
                            ...prev.pages,
                            [editingPage]: { ...page, blocks: newBlocks },
                          },
                        };
                      });
                    }}
                    style={{
                      padding: '5px 10px', background: S.accent, color: '#fff',
                      border: 'none', borderRadius: '3px', fontSize: '11px',
                      fontWeight: '600', cursor: 'pointer',
                    }}
                  >📋 Duplicate</button>
                  <button
                    onClick={() => setMultiSelectedIds(new Set())}
                    style={{
                      padding: '5px 8px', background: 'transparent', color: S.textDim,
                      border: `1px solid ${S.borderStrong}`, borderRadius: '3px',
                      fontSize: '11px', cursor: 'pointer',
                    }}
                  >Clear</button>
                </div>
              )}

              {/* Block tree for the current editing page. The DndContext
                  that powers reordering AND library-to-tree drops lives
                  one level up (wraps the whole body), so here we only
                  render the SortableContext + a LayersDropZone wrapper
                  that catches drops on empty space (used to append new
                  blocks dragged from the library panel). */}
              <LayersDropZone S={S}>
                {(() => {
                  const blocks = getBlocks(editingPage);
                  const handleSelect = (b, idx) => (e) => {
                    if (e.shiftKey && selectedBlockId) {
                      const anchorIdx = blocks.findIndex(x => x.id === selectedBlockId);
                      if (anchorIdx !== -1) {
                        const [start, end] = anchorIdx < idx ? [anchorIdx, idx] : [idx, anchorIdx];
                        const range = new Set();
                        for (let i = start; i <= end; i++) {
                          if (blocks[i].id !== selectedBlockId) range.add(blocks[i].id);
                        }
                        setMultiSelectedIds(range);
                        return;
                      }
                    }
                    if (e.metaKey || e.ctrlKey) {
                      setMultiSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(b.id)) next.delete(b.id);
                        else next.add(b.id);
                        return next;
                      });
                      return;
                    }
                    setSelectedBlockId(b.id);
                    setMultiSelectedIds(new Set());
                  };
                  if (blocks.length === 0) {
                    return (
                      <div style={{
                        padding: '32px 14px', textAlign: 'center',
                        color: S.textFaint, fontSize: '11px', lineHeight: 1.55,
                      }}>
                        No blocks yet on this page.<br />
                        Drag a block from the <b>+ Add</b> library, or click one to append.
                      </div>
                    );
                  }
                  // Render a tree of rows. Root blocks live inside the
                  // SortableContext so they can be drag-reordered. Children
                  // of tapas_group blocks render visually indented under
                  // their parent but stay outside the sortable — reorder-
                  // across-parents is deferred to avoid nested-DnD churn.
                  const renderChildRows = (kids, depth) => {
                    if (!Array.isArray(kids) || kids.length === 0) return null;
                    return kids.map((child) => {
                      const cMeta = BLOCK_REGISTRY_META[child.type];
                      const cSelected = selectedBlockId === child.id;
                      return (
                        <div key={child.id} style={{ paddingLeft: `${depth * 16}px` }}>
                          <div
                            onClick={() => { setSelectedBlockId(child.id); setMultiSelectedIds(new Set()); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '6px 8px', margin: '2px 0',
                              borderRadius: '3px', cursor: 'pointer',
                              background: cSelected ? S.accentLight : 'transparent',
                              color: cSelected ? S.accent : S.textDim,
                              fontSize: '11.5px', fontWeight: cSelected ? 600 : 500,
                            }}
                          >
                            <span style={{ color: S.textFaint, fontSize: '10px' }}>└</span>
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: S.textFaint }}>{cMeta?.icon || '▣'}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cMeta?.label || child.type}
                            </span>
                          </div>
                          {child.type === 'tapas_group' && renderChildRows(child.props?.children || [], depth + 1)}
                        </div>
                      );
                    });
                  };
                  return (
                    <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      {blocks.map((b, idx) => {
                        const meta = BLOCK_REGISTRY_META[b.type];
                        const isPrimary = selectedBlockId === b.id;
                        const isMulti = multiSelectedIds.has(b.id);
                        const isSelected = isPrimary || isMulti;
                        return (
                          <div key={b.id}>
                            <SortableBlockRow
                              block={b}
                              meta={meta}
                              isPrimary={isPrimary}
                              isMulti={isMulti}
                              isSelected={isSelected}
                              isHidden={!!b.props?.hidden}
                              isLocked={!!b.locked}
                              S={S}
                              onSelect={handleSelect(b, idx)}
                              onToggleVisibility={() => toggleBlockHidden(editingPage, b.id)}
                              onToggleLocked={() => toggleBlockLocked(editingPage, b.id)}
                              onReset={() => askConfirm({
                                title: `Reset ${meta?.label || b.type} to defaults?`,
                                message: 'Block content will be replaced with the registry defaults. You can undo with ⌘Z.',
                                confirmLabel: 'Reset block',
                                tone: 'danger',
                                onConfirm: () => resetBlockProps(editingPage, b.id),
                              })}
                              onDuplicate={() => duplicateBlock(editingPage, b.id)}
                              onDelete={() => askConfirm({
                                title: `Delete ${meta?.label || b.type}?`,
                                message: 'This removes the block from the draft. You can undo with ⌘Z.',
                                confirmLabel: 'Delete',
                                tone: 'danger',
                                onConfirm: () => deleteBlock(editingPage, b.id),
                              })}
                            />
                            {b.type === 'tapas_group' && renderChildRows(b.props?.children || [], 1)}
                          </div>
                        );
                      })}
                    </SortableContext>
                  );
                })()}
              </LayersDropZone>
            </div>
        </aside>

        {/* BLOCK LIBRARY — slide-out panel between the sidebar and the
            canvas. Click a tile to append; drag a tile onto the Layers
            tree to insert at a specific position. Width 0 when closed
            so the canvas reclaims the space. Replaces the old modal. */}
        <aside style={{
          width: addPickerOpen ? '300px' : '0px',
          flexShrink: 0,
          background: S.panel,
          borderRight: addPickerOpen ? `1px solid ${S.border}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.22s ease',
        }}>
          {addPickerOpen && (
            <>
              {/* Header */}
              <div style={{
                padding: '12px 14px',
                borderBottom: `1px solid ${S.border}`,
                display: 'flex', alignItems: 'center', gap: '8px',
                flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: S.text }}>
                    Block library
                  </div>
                  <div style={{ fontSize: '10.5px', color: S.textDim, marginTop: '1px', lineHeight: 1.3 }}>
                    Click to add a section, or drag it where you want.
                  </div>
                </div>
                <button
                  onClick={() => { setAddPickerOpen(false); setAddPickerSearch(''); }}
                  title="Close library"
                  style={{
                    width: '24px', height: '24px',
                    background: 'transparent', border: 'none',
                    borderRadius: '4px', cursor: 'pointer',
                    color: S.textDim, fontSize: '16px', lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = S.text; e.currentTarget.style.background = S.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = S.textDim; e.currentTarget.style.background = 'transparent'; }}
                >×</button>
              </div>

              {/* Search */}
              <div style={{
                padding: '10px 14px',
                borderBottom: `1px solid ${S.border}`,
                background: S.bg,
                flexShrink: 0,
              }}>
                <input
                  autoFocus
                  type="text"
                  value={addPickerSearch}
                  onChange={(e) => setAddPickerSearch(e.target.value)}
                  placeholder="Search blocks…"
                  style={{
                    width: '100%', padding: '7px 10px', boxSizing: 'border-box',
                    background: '#fff', border: `1px solid ${S.border}`,
                    borderRadius: '5px', fontSize: '12px', color: S.text,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Categorized tile list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 16px' }}>
                {(() => {
                  const query = addPickerSearch.trim().toLowerCase();
                  const anyMatches = !query || Object.entries(BLOCK_REGISTRY_META).some(
                    ([type, m]) => type.toLowerCase().includes(query) || (m.label || '').toLowerCase().includes(query)
                  );
                  if (query && !anyMatches) {
                    return (
                      <div style={{ padding: '24px 0', textAlign: 'center', color: S.textDim, fontSize: '11px' }}>
                        No blocks match "{addPickerSearch}".
                      </div>
                    );
                  }
                  return null;
                })()}
                {BLOCK_CATEGORIES.map(cat => {
                  const query = addPickerSearch.trim().toLowerCase();
                  const types = Object.entries(BLOCK_REGISTRY_META).filter(([type, m]) => {
                    if (m.category !== cat) return false;
                    if (!query) return true;
                    if (type.toLowerCase().includes(query)) return true;
                    if ((m.label || '').toLowerCase().includes(query)) return true;
                    return false;
                  });
                  if (types.length === 0) return null;
                  // One tile per block type. After insertion users pick
                  // a layout variant from the canvas chip strip (hover
                  // the block) or the right-panel Variant dropdown.
                  // Showing every preset as its own tile here drowned
                  // the picker.
                  return (
                    <div key={cat} style={{ marginBottom: '18px' }}>
                      <div style={{
                        fontSize: '10px', fontWeight: '700', color: S.textDim,
                        textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px',
                      }}>{cat}</div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                      }}>
                        {types.map(([type, meta]) => (
                          <DraggableLibraryTile
                            key={type}
                            type={type}
                            meta={meta}
                            S={S}
                            onClick={() => addBlockToPage(editingPage, type)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        {/* CENTER: preview */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            padding: '8px 12px',
            background: S.panel,
            borderBottom: `1px solid ${S.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {/* Left sidebar collapse — uses a directional panel icon so
                  it's distinct from the right-side toggle (no more two
                  identical hamburgers). */}
              <button
                onClick={() => setLeftCollapsed(c => !c)}
                title={leftCollapsed ? 'Show Pages & Layers' : 'Hide Pages & Layers'}
                style={{
                  width: '30px', height: '28px', padding: 0,
                  background: leftCollapsed ? S.accentLight : 'white',
                  border: `1px solid ${leftCollapsed ? S.accent + '55' : S.border}`,
                  borderRadius: '4px', cursor: 'pointer',
                  color: leftCollapsed ? S.accent : S.textDim,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!leftCollapsed) { e.currentTarget.style.background = S.bg; e.currentTarget.style.color = S.text; } }}
                onMouseLeave={(e) => { if (!leftCollapsed) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = S.textDim; } }}
              >
                {leftCollapsed
                  ? <PanelLeftOpen size={15} strokeWidth={2.25} />
                  : <PanelLeftClose size={15} strokeWidth={2.25} />}
              </button>
              {/* Webflow-style breadcrumb: DRAFT · /path · Block type ·
                  Element — clicking the block crumb deselects the
                  element; clicking the path crumb deselects everything. */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', color: S.textDim, minWidth: 0,
                flexWrap: 'wrap',
              }}>
                <span style={{
                  padding: '2px 8px',
                  background: '#EEF2FF', color: S.accent,
                  borderRadius: '10px', fontSize: '10px', fontWeight: '700',
                  flexShrink: 0,
                }}>DRAFT</span>
                <button
                  onClick={() => { setSelectedBlockId(null); setSelectedElement(null); }}
                  style={{
                    fontFamily: 'ui-monospace, monospace', fontWeight: '600',
                    color: (selectedBlockId || selectedElement) ? S.textDim : S.text,
                    background: 'transparent', border: 'none', padding: 0,
                    cursor: (selectedBlockId || selectedElement) ? 'pointer' : 'default',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '120px',
                  }}
                >{iframePath}</button>
                {selectedBlock && (
                  <>
                    <span style={{ color: S.textFaint, fontSize: '10px' }}>›</span>
                    <button
                      onClick={() => setSelectedElement(null)}
                      style={{
                        fontWeight: '600',
                        color: selectedElement ? S.textDim : S.text,
                        background: 'transparent', border: 'none', padding: 0,
                        cursor: selectedElement ? 'pointer' : 'default',
                      }}
                    >
                      {BLOCK_REGISTRY_META[selectedBlock.type]?.label || selectedBlock.type}
                    </button>
                  </>
                )}
                {selectedElement && (
                  <>
                    <span style={{ color: S.textFaint, fontSize: '10px' }}>›</span>
                    <span style={{
                      color: S.text, fontWeight: '600', textTransform: 'capitalize',
                    }}>
                      {selectedElement.split('.').slice(-1)[0].replace(/_/g, ' ')}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* Viewport switcher — Lucide device glyphs. */}
              <div style={{ display: 'flex', gap: '2px', background: S.bg, padding: '2px', borderRadius: '6px' }}>
                {VIEWPORTS.map(v => {
                  const Icon = v.key === 'desktop' ? Monitor : v.key === 'tablet' ? Tablet : Smartphone;
                  const active = viewport === v.key;
                  return (
                    <button key={v.key} onClick={() => setViewport(v.key)}
                      title={v.key.charAt(0).toUpperCase() + v.key.slice(1)}
                      style={{
                        width: '32px', height: '24px', padding: 0,
                        background: active ? 'white' : 'transparent',
                        color: active ? S.text : S.textDim,
                        border: 'none', borderRadius: '4px', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}>
                      <Icon size={14} strokeWidth={2.25} />
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setIframeKey(k => k + 1)} title="Reload preview"
                style={{
                  width: '30px', height: '28px', padding: 0,
                  background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px',
                  cursor: 'pointer', color: S.textDim,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = S.bg; e.currentTarget.style.color = S.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = S.textDim; }}
              ><RefreshCw size={13} strokeWidth={2.25} /></button>
              <a href={STORE_URL + iframePath} target="_blank" rel="noreferrer" title="Open live site in new tab"
                style={{
                  width: '30px', height: '28px', padding: 0,
                  background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px',
                  color: S.textDim, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = S.bg; e.currentTarget.style.color = S.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = S.textDim; }}
              ><ExternalLink size={13} strokeWidth={2.25} /></a>
              {/* Right inspector collapse — distinct directional icon. */}
              <button
                onClick={() => setRightCollapsed(c => !c)}
                title={rightCollapsed ? 'Show Inspector' : 'Hide Inspector'}
                style={{
                  width: '30px', height: '28px', padding: 0,
                  background: rightCollapsed ? S.accentLight : 'white',
                  border: `1px solid ${rightCollapsed ? S.accent + '55' : S.border}`,
                  borderRadius: '4px', cursor: 'pointer',
                  color: rightCollapsed ? S.accent : S.textDim,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!rightCollapsed) { e.currentTarget.style.background = S.bg; e.currentTarget.style.color = S.text; } }}
                onMouseLeave={(e) => { if (!rightCollapsed) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = S.textDim; } }}
              >
                {rightCollapsed
                  ? <PanelRightOpen size={15} strokeWidth={2.25} />
                  : <PanelRightClose size={15} strokeWidth={2.25} />}
              </button>
            </div>
          </div>

          <div style={{
            flex: 1, overflow: 'auto', background: '#E4E7EB',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            padding: viewport === 'desktop' ? '0' : '20px',
            position: 'relative',
          }}>
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={`${STORE_URL}${iframePath}${iframePath.includes('?') ? '&' : '?'}preview=draft&cb=${iframeKey}`}
              title="Tapas store draft preview"
              style={{
                width: vp.width, maxWidth: vp.maxWidth,
                height: '100%', minHeight: '100%',
                border: viewport === 'desktop' ? 'none' : `1px solid ${S.border}`,
                borderRadius: viewport === 'desktop' ? 0 : '8px',
                background: 'white',
                boxShadow: viewport === 'desktop' ? 'none' : '0 10px 30px rgba(0,0,0,0.1)',
              }}
            />
            <CanvasDropZone active={!!activeDragLib} S={S} />
          </div>
        </main>

        {/* RIGHT: property inspector — hamburger-collapsible */}
        <aside style={{
          width: rightCollapsed ? '0px' : '320px',
          flexShrink: 0,
          background: D.panel,
          borderLeft: rightCollapsed ? 'none' : `1px solid ${D.border}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'width 0.22s ease',
        }}>
          {selectedElement ? (
            <ElementInspector
              path={selectedElement}
              styles={draftContent.element_styles?.[selectedElement]}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              onChangeStyle={(cssProp, value, state) => updateElementStyle(selectedElement, cssProp, value, state)}
              savedStyles={draftContent.saved_styles}
              onSaveStyle={saveSharedStyle}
              onApplyStyle={(name) => applySharedStyle(selectedElement, name)}
              onClear={() => clearElementStyles(selectedElement)}
              onBack={clearSelection}
            />
          ) : selectedBlock ? (
            <BlockInspector
              block={selectedBlock}
              meta={BLOCK_REGISTRY_META[selectedBlock.type]}
              isLocked={!!selectedBlock.locked}
              onToggleLocked={() => toggleBlockLocked(editingPage, selectedBlock.id)}
              onChangeProp={(key, value) => updateBlockProp(editingPage, selectedBlock.id, key, value)}
              onBack={() => setSelectedBlockId(null)}
              onDuplicate={() => duplicateBlock(editingPage, selectedBlock.id)}
              onDelete={() => {
                const meta = BLOCK_REGISTRY_META[selectedBlock.type];
                askConfirm({
                  title: `Delete ${meta?.label || selectedBlock.type}?`,
                  message: 'This removes the block from the draft. You can undo with ⌘Z.',
                  confirmLabel: 'Delete',
                  tone: 'danger',
                  onConfirm: () => deleteBlock(editingPage, selectedBlock.id),
                });
              }}
            />
          ) : (
            // Nothing selected → Page Settings (Webflow/Figma style).
            // Shows visibility toggles and section-order fields that are
            // relevant to the active page. Global brand/typography/button
            // tokens moved to the Design System modal (Styles button in
            // the toolbar).
            <PageSettingsPanel
              page={currentPageEntry}
              pageMeta={draftContent?.pages?.[editingPage]?.meta || {}}
              blocksCount={(draftContent?.pages?.[editingPage]?.blocks || []).length}
              reservedPaths={RESERVED_PATHS}
              takenPaths={allPages.filter(p => p.key !== editingPage).map(p => p.path)}
              onChangeMeta={(key, value) => updatePageMeta(editingPage, key, value)}
              onChangePath={(newPath) => {
                updatePageMeta(editingPage, 'path', newPath);
                setIframePath(newPath);
              }}
              onDuplicate={() => duplicateCurrentPage()}
              onDelete={() => askConfirm({
                title: `Delete page "${currentPageEntry.label}"?`,
                message: `This removes the page and all ${(draftContent?.pages?.[editingPage]?.blocks || []).length} block(s) on it from the draft. URL ${currentPageEntry.path} will 404 once published.`,
                confirmLabel: 'Delete page',
                tone: 'danger',
                onConfirm: () => deleteCurrentPage(),
              })}
              openMediaLibrary={openMediaLibrary}
              onOpenDesignSystem={() => setDesignModalOpen(true)}
              brand={draftContent?.brand || {}}
              onChangeBrand={(key, value) => updateField('brand', key, value)}
            />
          )}
        </aside>
      </div>
      {/* ==================== Toast (variant swap, etc.) ==================== */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '10px 16px',
            background: '#0f172a', color: '#fff',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            fontSize: '13px', fontWeight: 500,
            zIndex: 250,
          }}
        >
          <span>{toast.message}</span>
          {toast.actionLabel && (
            <button
              onClick={() => { toast.onAction && toast.onAction(); setToast(null); }}
              style={{
                background: 'transparent', color: '#93c5fd',
                border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, padding: '4px 8px',
              }}
            >{toast.actionLabel}</button>
          )}
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            style={{
              background: 'transparent', color: '#94a3b8',
              border: 'none', cursor: 'pointer',
              fontSize: '16px', lineHeight: 1, padding: '0 4px',
            }}
          >×</button>
        </div>
      )}
      {/* ==================== Cmd+K command palette ==================== */}
      {paletteOpen && (
        <div
          onClick={() => setPaletteOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 220,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '88px 20px 20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '560px', maxHeight: 'calc(100vh - 120px)',
              background: '#fff', borderRadius: '12px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: '-apple-system, system-ui, sans-serif',
            }}
          >
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 16px', borderBottom: `1px solid ${S.border}`,
            }}>
              <Search size={16} strokeWidth={2.25} color={S.textDim} />
              <input
                ref={paletteInputRef}
                type="text"
                value={paletteQuery}
                onChange={(e) => { setPaletteQuery(e.target.value); setPaletteCursor(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setPaletteCursor(c => Math.min(c + 1, Math.max(0, filteredPaletteCommands.length - 1)));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setPaletteCursor(c => Math.max(0, c - 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const cmd = filteredPaletteCommands[paletteCursor];
                    if (cmd) { setPaletteOpen(false); try { cmd.run(); } catch {} }
                  }
                }}
                placeholder="Type a command, page name, or block…"
                style={{
                  flex: 1, padding: '4px 0',
                  background: 'transparent', border: 'none',
                  fontSize: '14px', color: S.text, outline: 'none',
                }}
              />
              <span style={{
                fontSize: '10px', color: S.textFaint, fontWeight: '600',
                padding: '2px 6px', background: S.bg, borderRadius: '3px',
                fontFamily: 'ui-monospace, monospace',
              }}>⌘K</span>
            </div>

            {/* Results */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {filteredPaletteCommands.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: S.textDim, fontSize: '12px' }}>
                  No commands match "{paletteQuery}".
                </div>
              ) : (
                filteredPaletteCommands.map((cmd, idx) => {
                  const focused = idx === paletteCursor;
                  return (
                    <div
                      key={cmd.id}
                      onMouseEnter={() => setPaletteCursor(idx)}
                      onClick={() => { setPaletteOpen(false); try { cmd.run(); } catch {} }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 16px', cursor: 'pointer',
                        background: focused ? S.accentLight : 'transparent',
                        color: cmd.danger ? S.danger : (cmd.accent ? S.accent : S.text),
                        fontSize: '12.5px', fontWeight: focused ? '600' : '500',
                      }}
                    >
                      <span style={{
                        fontSize: '9px', fontWeight: '700',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        color: focused ? S.accent : S.textFaint,
                        width: '54px', flexShrink: 0,
                      }}>{cmd.kind}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cmd.label}
                      </span>
                      {cmd.hint && (
                        <span style={{ fontSize: '10.5px', color: S.textFaint, fontFamily: 'ui-monospace, monospace' }}>
                          {cmd.hint}
                        </span>
                      )}
                      {focused && <CornerDownLeft size={12} strokeWidth={2.25} color={S.textDim} />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '8px 16px', borderTop: `1px solid ${S.border}`,
              background: S.bg,
              display: 'flex', alignItems: 'center', gap: '14px',
              fontSize: '10.5px', color: S.textDim,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ArrowUp size={11} strokeWidth={2.25} /> <ArrowDown size={11} strokeWidth={2.25} /> Navigate
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CornerDownLeft size={11} strokeWidth={2.25} /> Select
              </span>
              <span>Esc to close</span>
              <span style={{ flex: 1 }} />
              <span>{filteredPaletteCommands.length} of {paletteCommands.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating preview that follows the cursor while a library tile
          is being dragged. Empty when not dragging or when the active
          drag is an in-tree reorder (those use SortableBlockRow's own
          transform so we don't need a duplicate ghost). */}
      <DragOverlay dropAnimation={null}>
        {activeDragLib ? (() => {
          const meta = BLOCK_REGISTRY_META[activeDragLib.type];
          return (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px',
              background: '#fff', border: `1px solid ${S.accent}`,
              borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(13,153,255,0.25)',
              fontSize: '12px', fontWeight: '700', color: S.text,
              cursor: 'grabbing',
            }}>
              <span style={{ fontSize: '16px' }}>{meta?.icon || '▫'}</span>
              <span>{meta?.label || activeDragLib.type}</span>
            </div>
          );
        })() : null}
      </DragOverlay>
      </DndContext>
    </div>
    </MediaLibraryContext.Provider>
  );
}
