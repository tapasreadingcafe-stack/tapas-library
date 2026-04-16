import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_CONTENT, CONTENT_SCHEMA, sectionForFieldPath } from '../utils/siteContentSchema';
import {
  BLOCK_REGISTRY_META, BLOCK_CATEGORIES, EDITABLE_PAGES, makeBlock,
} from '../utils/blockRegistryMeta';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const STORE_URL = 'https://www.tapasreadingcafe.com';
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

// "Selection colors" footer — Figma shows a compact summary of every
// color used by the current selection at the bottom of the inspector.
// We mirror that for the Brand section so the user can see all defined
// colors at a glance, even when collapsed.
function SelectionColorsFooter({ colors }) {
  const entries = Object.entries(colors || {}).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <div style={{ borderTop: `1px solid ${D.border}`, padding: '12px 14px 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', marginBottom: '10px',
        fontSize: '11px', fontWeight: '600', color: D.text, letterSpacing: '0.2px',
      }}>
        <span style={{ color: D.textDim, fontSize: '9px', marginRight: '8px' }}>▶</span>
        Selection colors
      </div>
      <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entries.map(([label, value]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 6px', background: D.input, borderRadius: '2px', height: '26px',
          }}>
            <div style={{
              width: '14px', height: '14px', borderRadius: '2px',
              background: value, border: `1px solid ${D.border}`,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '11px', fontFamily: 'ui-monospace, monospace',
              color: D.text, flex: 1, letterSpacing: '0.3px',
            }}>{value.replace('#', '').toUpperCase().slice(0, 6)}</span>
            <span style={{ fontSize: '10px', color: D.textFaint }}>100%</span>
          </div>
        ))}
      </div>
    </div>
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
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
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

const CSS_RENDERERS = {
  'css-text':   CssTextField,
  'css-size':   CssSizeField,
  'css-select': CssSelectField,
  'css-color':  CssColorField,
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
function BlockInspector({ block, meta, onChangeProp, onBack, onDelete, onDuplicate }) {
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

      {/* Fields — rendered via the same FIELD_RENDERERS the schema
          sections use, so dark theme + inline validation flow through
          automatically. Missing props fall back to defaultProps so the
          user sees a useful starting value. */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '12px', paddingBottom: '40px', background: D.panel }}>
        {(!meta.schema || meta.schema.length === 0) ? (
          <div style={{ padding: '24px 16px', color: D.textFaint, fontSize: '11px', lineHeight: 1.55, textAlign: 'center' }}>
            This block has no editable fields yet.
          </div>
        ) : (
          meta.schema.map(field => {
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

function ElementInspector({ path, styles, onChangeStyle, onClear, onBack, expandedGroups, toggleGroup }) {
  const shortPath = path.split('.').slice(-1)[0].replace(/_/g, ' ');
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
        <button
          onClick={onClear}
          disabled={!styles || Object.keys(styles).length === 0}
          title="Clear all overrides on this element"
          style={{ background: 'transparent', border: 'none', color: D.textDim, fontSize: '12px', cursor: 'pointer', padding: '4px 6px', borderRadius: '2px' }}
        >
          ↺
        </button>
      </div>

      {/* Groups */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px', background: D.panel }}>
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
                  {group.fields.map(field => {
                    const Renderer = CSS_RENDERERS[field.type] || CssTextField;
                    const value = styles?.[field.cssProp];
                    return (
                      <Renderer
                        key={field.cssProp}
                        field={field}
                        value={value}
                        onChange={(v) => onChangeStyle(field.cssProp, v)}
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

// ---- SortableBlockRow --------------------------------------------------
// One row in the Layers tree. Uses @dnd-kit's useSortable to make the row
// reorderable via drag-and-drop. The drag handle (⋮⋮) on the left is the
// only drag-activator — the rest of the row keeps its click-to-select
// behavior. We also add a small pointer-distance activation constraint at
// the DndContext level so a quick click doesn't get interpreted as a drag.
function SortableBlockRow({
  block, meta, isPrimary, isMulti, isSelected,
  onSelect, onDuplicate, onDelete, S,
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
          color: S.textFaint, fontSize: '14px',
          cursor: isDragging ? 'grabbing' : 'grab',
          textAlign: 'center', userSelect: 'none',
          lineHeight: 1, letterSpacing: '-3px',
        }}
      >⋮⋮</span>
      <span style={{ fontSize: '13px', flexShrink: 0, width: '16px', textAlign: 'center' }}>
        {meta?.icon || '▫'}
      </span>
      <span style={{
        flex: 1, minWidth: 0, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: isSelected ? S.accent : S.text,
        fontWeight: isSelected ? '600' : '500',
      }}>
        {meta?.label || block.type}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        title="Duplicate (⌘D)"
        style={{
          width: '20px', height: '20px', padding: 0,
          background: 'transparent', border: 'none',
          color: S.textDim, cursor: 'pointer',
          fontSize: '11px', borderRadius: '2px',
        }}
      >⎘</button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete (⌫)"
        style={{
          width: '20px', height: '20px', padding: 0,
          background: 'transparent', border: 'none',
          color: S.textDim, cursor: 'pointer',
          fontSize: '12px', borderRadius: '2px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = S.danger; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = S.textDim; }}
      >✕</button>
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
  visibilityFields,
  visibilityValues,
  sectionOrderFields,
  sectionOrderValues,
  onChangeVisibility,
  onChangeSectionOrder,
  onOpenDesignSystem,
}) {
  // Visibility fields are keyed like "home_hero", "about_values".
  // Filter to the active page's prefix so users only see toggles that
  // affect what they're currently looking at.
  const pageVisibility = visibilityFields.filter(f => f.key.startsWith(page.key + '_'));

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

      {/* Canvas-editing tip */}
      <div style={{
        margin: '14px 14px 16px', padding: '10px 12px',
        background: D.accentFaint, border: `1px solid rgba(13,153,255,0.25)`,
        borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '12px', color: D.accent, flexShrink: 0 }}>✎</span>
        <div style={{ fontSize: '10.5px', color: D.text, lineHeight: '1.45' }}>
          <strong>Tip:</strong> click a block or text on the canvas to edit it.
          Nothing selected? This panel shows page-level settings.
        </div>
      </div>

      {/* Visibility toggles for this page */}
      {pageVisibility.length > 0 && (
        <SubSection title="Sections on this page" defaultOpen={true}>
          {pageVisibility.map(field => (
            <ToggleField
              key={field.key}
              field={{
                ...field,
                // Strip the page prefix from labels so "Home — Hero"
                // reads as just "Hero" inside the page panel.
                label: field.label.replace(/^[A-Za-z]+\s*—\s*/, ''),
              }}
              value={visibilityValues[field.key]}
              onChange={(v) => onChangeVisibility(field.key, v)}
            />
          ))}
        </SubSection>
      )}

      {/* Section order (home only, or any page that has a *_section_order field) */}
      {sectionOrderFields.length > 0 && (
        <SubSection title="Section order" defaultOpen={true}>
          {sectionOrderFields.map(field => {
            const Renderer = FIELD_RENDERERS[field.type] || TextField;
            return (
              <Renderer
                key={field.key}
                field={field}
                value={sectionOrderValues[field.key]}
                onChange={(v) => onChangeSectionOrder(field.key, v)}
              />
            );
          })}
        </SubSection>
      )}

      {pageVisibility.length === 0 && sectionOrderFields.length === 0 && (
        <div style={{ padding: '16px 16px 0', color: D.textFaint, fontSize: '11px', lineHeight: 1.6 }}>
          No page-level settings for <strong style={{ color: D.textDim }}>{page.label}</strong>.
          Add or edit blocks from the Layers panel, or click a block on the canvas to edit its properties.
        </div>
      )}

      {/* Footer link to Design System */}
      <div style={{ padding: '20px 16px 0', marginTop: '16px', borderTop: `1px solid ${D.divider}` }}>
        <div style={{ fontSize: '10px', color: D.textFaint, marginTop: '14px', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Global design
        </div>
        <button
          onClick={onOpenDesignSystem}
          style={{
            width: '100%', padding: '9px 12px',
            background: D.panelAlt, color: D.text,
            border: `1px solid ${D.border}`, borderRadius: '4px',
            cursor: 'pointer', fontSize: '11px', fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = D.inputHover; }}
          onMouseLeave={e => { e.currentTarget.style.background = D.panelAlt; }}
        >
          <span>🎨</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Open Design System</span>
          <span style={{ color: D.textFaint }}>→</span>
        </button>
        <div style={{ fontSize: '10px', color: D.textFaint, marginTop: '6px', lineHeight: 1.5 }}>
          Site-wide brand, typography, buttons, and images.
        </div>
      </div>
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

      const live  = liveRaw  ? deepMerge(DEFAULT_CONTENT, liveRaw)  : DEFAULT_CONTENT;
      // If there's no draft yet, initialise it from live.
      const draft = draftRaw ? deepMerge(DEFAULT_CONTENT, draftRaw) : live;

      setLiveContent(live);
      setDraftContent(draft);
    } catch (err) {
      setError(err.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const addBlockToPage = useCallback((pageKey, type, atIndex) => {
    const fresh = makeBlock(type);
    mutateBlocks(pageKey, (blocks) => {
      const idx = typeof atIndex === 'number' ? atIndex : blocks.length;
      const next = [...blocks];
      next.splice(idx, 0, fresh);
      return next;
    });
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

  // Phase 5: Custom pages. The 6 "fixed" pages from EDITABLE_PAGES
  // always exist. Custom pages are any page in draftContent.pages that
  // has meta.custom === true — created by the staff via the "+ New
  // page" button. They're merged here and used everywhere a page list
  // is rendered (picker, SEO, store-url navigation).
  const allPages = useMemo(() => {
    const pages = draftContent?.pages || {};
    const customEntries = Object.entries(pages)
      .filter(([, p]) => p?.meta?.custom)
      .map(([key, p]) => ({
        key,
        label: p.meta?.label || key,
        path: p.meta?.path || `/${key}`,
        custom: true,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...EDITABLE_PAGES, ...customEntries];
  }, [draftContent]);
  const currentPageEntry = allPages.find(p => p.key === editingPage) || EDITABLE_PAGES[0];

  // Update a single CSS property on the currently selected element.
  // Empty string clears the override.
  const updateElementStyle = (path, cssProp, value) => {
    setDraftContent(prev => {
      const currentMap = prev.element_styles || {};
      const currentEl  = currentMap[path] || {};
      const nextEl     = { ...currentEl };
      if (value === '' || value === null || value === undefined) delete nextEl[cssProp];
      else nextEl[cssProp] = value;
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

  // Revert — discard draft, reload from live.
  const revertDraft = () => {
    if (!window.confirm('Discard all unpushed changes and revert to the live version?')) return;
    setDraftContent(liveContent);
    saveDraft(liveContent);
  };

  // ---- Phase 6: Scheduled publishes ----------------------------------
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
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
    if (!window.confirm('Clear all style overrides on this element?')) return;
    setDraftContent(prev => {
      const next = { ...(prev.element_styles || {}) };
      delete next[path];
      return { ...prev, element_styles: next };
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
                        {activeKey === 'brand' && (
                          <SelectionColorsFooter
                            colors={{
                              'Primary':       draftContent[storage]?.primary_color,
                              'Primary dark':  draftContent[storage]?.primary_color_dark,
                              'Primary light': draftContent[storage]?.primary_color_light,
                              'Accent':        draftContent[storage]?.accent_color,
                              'Accent dark':   draftContent[storage]?.accent_color_dark,
                              'Cream':         draftContent[storage]?.cream_color,
                              'Sand':          draftContent[storage]?.sand_color,
                            }}
                          />
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
          onClick={() => { setNewPageOpen(false); setNewPageLabel(''); setNewPagePath(''); }}
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
                Must start with "/". Reserved paths (/, /books, /about, /offers, /blog, /events, /cart, /checkout, /login, /profile) can't be used.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setNewPageOpen(false); setNewPageLabel(''); setNewPagePath(''); }}
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
                  if (!label) { alert('Page name is required.'); return; }
                  if (!path.startsWith('/')) path = '/' + path;
                  if (path.length < 2) { alert('URL path must have at least one character after "/".'); return; }
                  const RESERVED = new Set(['/', '/books', '/about', '/offers', '/blog', '/events', '/cart', '/checkout', '/login', '/profile', '/order', '/member']);
                  if (RESERVED.has(path) || path.startsWith('/books/') || path.startsWith('/blog/') || path.startsWith('/order/')) {
                    alert(`"${path}" is reserved. Pick a different path.`);
                    return;
                  }
                  // Make sure no existing page (fixed or custom) uses this path
                  const pathTaken = allPages.some(p => p.path === path);
                  if (pathTaken) { alert(`A page already uses "${path}".`); return; }
                  const key = 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
                  setDraftContent(prev => ({
                    ...prev,
                    pages: {
                      ...(prev.pages || {}),
                      [key]: {
                        meta: { custom: true, label, path, title: label + ' — Tapas Library', description: '' },
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
                  ⭐ Block Templates
                </div>
                <div style={{ fontSize: '12px', color: S.textDim, marginTop: '2px' }}>
                  {templates.length === 0
                    ? 'Save a block as a template from the canvas toolbar (⭐ button).'
                    : `${templates.length} saved. Click to insert into ${allPages.find(p => p.key === editingPage)?.label || editingPage}.`}
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
              {templates.length === 0 ? (
                <div style={{
                  padding: '48px 20px', textAlign: 'center',
                  color: S.textDim, fontSize: '13px', lineHeight: 1.6,
                }}>
                  No templates saved yet.<br />
                  Hover over any block on the canvas and click <b>⭐</b> to save it as a template.
                </div>
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

      {/* ==================== Add section picker modal ==================== */}
      {addPickerOpen && (
        <div
          onClick={() => { setAddPickerOpen(false); setAddPickerSearch(''); }}
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
                  Add section to <span style={{ color: S.accent }}>{allPages.find(p => p.key === editingPage)?.label || editingPage}</span>
                </div>
                <div style={{ fontSize: '12px', color: S.textDim, marginTop: '2px' }}>
                  Pick a block type to append to the page.
                </div>
              </div>
              <button
                onClick={() => { setAddPickerOpen(false); setAddPickerSearch(''); }}
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

            {/* Search bar */}
            <div style={{
              padding: '12px 24px',
              borderBottom: `1px solid ${S.border}`,
              background: S.bg,
            }}>
              <input
                autoFocus
                type="text"
                value={addPickerSearch}
                onChange={(e) => setAddPickerSearch(e.target.value)}
                placeholder="🔍 Search blocks…"
                style={{
                  width: '100%', padding: '9px 12px',
                  background: '#fff', border: `1px solid ${S.border}`,
                  borderRadius: '6px', fontSize: '13px', color: S.text,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
              {(() => {
                const query = addPickerSearch.trim().toLowerCase();
                const anyMatches = !query || Object.entries(BLOCK_REGISTRY_META).some(
                  ([type, m]) => type.toLowerCase().includes(query) || (m.label || '').toLowerCase().includes(query)
                );
                if (query && !anyMatches) {
                  return (
                    <div style={{ padding: '32px', textAlign: 'center', color: S.textDim, fontSize: '13px' }}>
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
                  return type.toLowerCase().includes(query) || (m.label || '').toLowerCase().includes(query);
                });
                if (types.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: '24px' }}>
                    <div style={{
                      fontSize: '10px', fontWeight: '700', color: S.textDim,
                      textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px',
                    }}>{cat}</div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '10px',
                    }}>
                      {types.map(([type, meta]) => (
                        <button
                          key={type}
                          onClick={() => {
                            addBlockToPage(editingPage, type);
                            setAddPickerOpen(false);
                            setAddPickerSearch('');
                          }}
                          style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'flex-start', gap: '6px',
                            padding: '14px 14px',
                            background: '#fff',
                            border: `1px solid ${S.border}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = S.accent;
                            e.currentTarget.style.background = S.accentLight;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,153,255,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = S.border;
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <span style={{ fontSize: '22px' }}>{meta.icon || '▫'}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: S.text }}>
                            {meta.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== Top toolbar ==================== */}
      <div style={{
        height: '52px',
        flexShrink: 0,
        background: S.panel,
        borderBottom: `1px solid ${S.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: S.text, flexShrink: 0 }}>🎨 Edit Website</span>
          <span style={{ color: S.textFaint, fontSize: '12px', flexShrink: 0 }}>·</span>

          {/* Toolbar page switcher — drives the same editingPage state as
              the left sidebar Pages list. Matches Figma's top-bar page
              picker so users can switch without opening the sidebar. */}
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
              padding: '6px 28px 6px 10px',
              background: '#fff', border: `1px solid ${S.border}`,
              borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: S.text,
              cursor: 'pointer', outline: 'none',
              flexShrink: 0,
            }}
          >
            <optgroup label="Fixed pages">
              {EDITABLE_PAGES.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </optgroup>
            {allPages.some(p => p.custom) && (
              <optgroup label="Custom pages">
                {allPages.filter(p => p.custom).map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Status pill */}
          {saving ? (
            <span style={{ fontSize: '11px', color: S.accent, fontWeight: '600' }}>⏳ Saving draft…</span>
          ) : dirty ? (
            <span style={{
              fontSize: '11px', color: S.warning, fontWeight: '600',
              padding: '3px 10px', borderRadius: '20px',
              background: '#FFFBEB', border: `1px solid ${S.warning}33`,
            }}>● Unpublished changes</span>
          ) : pushedAt ? (
            <span style={{ fontSize: '11px', color: S.success, fontWeight: '600' }}>
              ✓ Published {pushedAt.toLocaleTimeString()}
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: S.textDim }}>In sync with live site</span>
          )}
        </div>

        {/* Undo / redo */}
        <div style={{ display: 'flex', gap: '2px', background: S.bg, padding: '2px', borderRadius: '6px' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            style={{
              width: '28px', height: '24px',
              background: canUndo ? 'white' : 'transparent',
              border: 'none', borderRadius: '4px',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              color: canUndo ? S.text : S.textFaint,
              fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              boxShadow: canUndo ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >↶</button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            style={{
              width: '28px', height: '24px',
              background: canRedo ? 'white' : 'transparent',
              border: 'none', borderRadius: '4px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              color: canRedo ? S.text : S.textFaint,
              fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              boxShadow: canRedo ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >↷</button>
        </div>

        {/* Phase 5: revision history */}
        <button
          onClick={() => setHistoryModalOpen(true)}
          title="View publish history"
          style={{
            padding: '7px 12px',
            background: 'white',
            border: `1px solid ${S.border}`,
            borderRadius: '6px',
            color: S.text,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = S.bg; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
        >📜 History</button>

        {/* Phase 6: schedule publish */}
        <button
          onClick={() => setScheduleModalOpen(true)}
          disabled={!dirty}
          title={dirty ? 'Schedule the draft to publish at a future time' : 'Edit the draft before scheduling'}
          style={{
            padding: '7px 12px',
            background: 'white',
            border: `1px solid ${S.border}`,
            borderRadius: '6px',
            color: dirty ? S.text : S.textFaint,
            cursor: dirty ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: '600',
          }}
          onMouseEnter={e => { if (dirty) e.currentTarget.style.background = S.bg; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
        >⏰ Schedule</button>

        {/* Design System modal trigger — global tokens (brand, typography,
            buttons, images) live behind this button rather than the
            sidebar so they don't clutter page-level editing. */}
        <button
          onClick={() => setDesignModalOpen(true)}
          title="Edit global brand, typography, buttons, and images"
          style={{
            padding: '7px 12px',
            background: 'white',
            border: `1px solid ${S.border}`,
            borderRadius: '6px',
            color: S.text,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = S.bg; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
        >🎨 Styles</button>

        <button
          onClick={revertDraft}
          disabled={!dirty || pushing}
          title="Revert draft to the live version"
          style={{
            padding: '7px 14px',
            background: 'white',
            border: `1px solid ${S.border}`,
            borderRadius: '6px',
            color: dirty ? S.danger : S.textFaint,
            cursor: !dirty || pushing ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (dirty && !pushing) { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = S.danger + '55'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = S.border; }}
        >
          Discard changes
        </button>
        <button
          onClick={pushToLive}
          disabled={!dirty || pushing || saving}
          title={dirty ? 'Publish draft to live site' : 'Nothing to publish'}
          style={{
            padding: '8px 18px',
            background: dirty ? S.accent : S.borderStrong,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (!dirty || pushing || saving) ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            boxShadow: dirty ? '0 2px 8px rgba(13,153,255,0.35)' : 'none',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (dirty && !pushing) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,153,255,0.45)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = dirty ? '0 2px 8px rgba(13,153,255,0.35)' : 'none'; }}
        >
          {pushing ? '⏳ Publishing…' : '🚀 Push to live'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: '#FEF3F2', color: S.danger, fontSize: '12px', borderBottom: `1px solid ${S.border}` }}>
          ⚠️ {error}
        </div>
      )}

      {/* ==================== Body: 3 panels ==================== */}
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
                  <optgroup label="Fixed pages">
                    {EDITABLE_PAGES.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </optgroup>
                  {allPages.some(p => p.custom) && (
                    <optgroup label="Custom pages">
                      {allPages.filter(p => p.custom).map(p => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {currentPageEntry?.custom && (
                  <div style={{
                    marginTop: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: '10px', color: S.textDim,
                  }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>{currentPageEntry.path}</span>
                    <button
                      onClick={() => {
                        askConfirm({
                          title: `Delete page "${currentPageEntry.label}"?`,
                          message: `This removes the page and all ${(draftContent?.pages?.[editingPage]?.blocks || []).length} block(s) on it from the draft. URL ${currentPageEntry.path} will 404 once published.`,
                          confirmLabel: 'Delete page',
                          tone: 'danger',
                          onConfirm: () => {
                            setDraftContent(prev => {
                              const nextPages = { ...(prev.pages || {}) };
                              delete nextPages[editingPage];
                              return { ...prev, pages: nextPages };
                            });
                            setEditingPage('home');
                            setSelectedBlockId(null);
                            setIframePath('/');
                          },
                        });
                      }}
                      style={{
                        padding: '1px 6px', background: 'transparent',
                        color: S.danger || '#dc2626',
                        border: `1px solid ${S.border}`, borderRadius: '3px',
                        fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                      }}
                    >Delete page</button>
                  </div>
                )}

                {/* SEO meta — collapsible so it doesn't clutter the tree */}
                <details style={{ marginTop: '10px' }}>
                  <summary style={{
                    cursor: 'pointer', userSelect: 'none',
                    fontSize: '10px', fontWeight: '700', color: S.textDim,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    padding: '4px 0',
                  }}>
                    🔎 SEO &amp; meta
                  </summary>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '600', color: S.textDim, display: 'block', marginBottom: '3px' }}>
                        Page title <span style={{ color: S.textFaint, fontWeight: 400 }}>(&lt;title&gt;)</span>
                      </label>
                      <input
                        type="text"
                        value={draftContent?.pages?.[editingPage]?.meta?.title || ''}
                        onChange={(e) => {
                          const title = e.target.value;
                          setDraftContent(prev => {
                            const page = prev.pages?.[editingPage] || { meta: {}, blocks: [] };
                            return {
                              ...prev,
                              pages: {
                                ...prev.pages,
                                [editingPage]: {
                                  ...page,
                                  meta: { ...(page.meta || {}), title },
                                },
                              },
                            };
                          });
                        }}
                        placeholder="e.g. Home — Tapas Library"
                        style={{
                          width: '100%', padding: '6px 8px',
                          background: '#fff', border: `1px solid ${S.border}`,
                          borderRadius: '4px', fontSize: '11px', color: S.text,
                          outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '600', color: S.textDim, display: 'block', marginBottom: '3px' }}>
                        Meta description
                      </label>
                      <textarea
                        value={draftContent?.pages?.[editingPage]?.meta?.description || ''}
                        onChange={(e) => {
                          const description = e.target.value;
                          setDraftContent(prev => {
                            const page = prev.pages?.[editingPage] || { meta: {}, blocks: [] };
                            return {
                              ...prev,
                              pages: {
                                ...prev.pages,
                                [editingPage]: {
                                  ...page,
                                  meta: { ...(page.meta || {}), description },
                                },
                              },
                            };
                          });
                        }}
                        placeholder="Short summary for search results & social previews (150–160 chars)"
                        rows={3}
                        style={{
                          width: '100%', padding: '6px 8px',
                          background: '#fff', border: `1px solid ${S.border}`,
                          borderRadius: '4px', fontSize: '11px', color: S.text,
                          outline: 'none', boxSizing: 'border-box',
                          fontFamily: 'inherit', resize: 'vertical',
                        }}
                      />
                      <div style={{ fontSize: '10px', color: S.textFaint, marginTop: '3px', textAlign: 'right' }}>
                        {(draftContent?.pages?.[editingPage]?.meta?.description || '').length}/160
                      </div>
                    </div>

                    {/* OG image for social sharing */}
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '600', color: S.textDim, display: 'block', marginBottom: '3px' }}>
                        Share image <span style={{ color: S.textFaint, fontWeight: 400 }}>(og:image · 1200×630)</span>
                      </label>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={draftContent?.pages?.[editingPage]?.meta?.og_image || ''}
                          onChange={(e) => {
                            const og_image = e.target.value;
                            setDraftContent(prev => {
                              const page = prev.pages?.[editingPage] || { meta: {}, blocks: [] };
                              return {
                                ...prev,
                                pages: {
                                  ...prev.pages,
                                  [editingPage]: { ...page, meta: { ...(page.meta || {}), og_image } },
                                },
                              };
                            });
                          }}
                          placeholder="https://… or pick from library"
                          style={{
                            flex: 1, padding: '6px 8px',
                            background: '#fff', border: `1px solid ${S.border}`,
                            borderRadius: '4px', fontSize: '11px', color: S.text,
                            outline: 'none', boxSizing: 'border-box',
                            fontFamily: 'ui-monospace, monospace',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => openMediaLibrary({ onPick: (url) => {
                            setDraftContent(prev => {
                              const page = prev.pages?.[editingPage] || { meta: {}, blocks: [] };
                              return {
                                ...prev,
                                pages: {
                                  ...prev.pages,
                                  [editingPage]: { ...page, meta: { ...(page.meta || {}), og_image: url } },
                                },
                              };
                            });
                          }})}
                          title="Pick from media library"
                          style={{
                            padding: '0 8px', height: '26px',
                            background: S.bg, color: S.text, border: `1px solid ${S.border}`,
                            borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
                          }}
                        >📁</button>
                      </div>
                    </div>

                    {/* Google SERP preview */}
                    {(() => {
                      const pageMeta = draftContent?.pages?.[editingPage]?.meta || {};
                      const t = pageMeta.title || 'Page title';
                      const d = pageMeta.description || 'Your meta description will appear here as a preview in Google search results.';
                      const pagePath = allPages.find(p => p.key === editingPage)?.path || '/';
                      const host = 'tapasreadingcafe.com';
                      return (
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: S.textDim, marginBottom: '6px' }}>
                            Google preview
                          </div>
                          <div style={{
                            padding: '10px 12px',
                            background: '#fff', border: `1px solid ${S.border}`,
                            borderRadius: '6px',
                            fontFamily: 'arial, sans-serif',
                          }}>
                            <div style={{ fontSize: '11px', color: '#006621', marginBottom: '2px' }}>
                              {host}{pagePath === '/' ? '' : pagePath}
                            </div>
                            <div style={{
                              fontSize: '15px', color: '#1a0dab', fontWeight: 400, lineHeight: 1.3,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                            }}>{t}</div>
                            <div style={{
                              fontSize: '11px', color: '#545454', marginTop: '2px', lineHeight: 1.4,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>{d}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Social card (OG) preview */}
                    {(() => {
                      const pageMeta = draftContent?.pages?.[editingPage]?.meta || {};
                      const t = pageMeta.title || 'Page title';
                      const d = pageMeta.description || 'Your meta description…';
                      const img = pageMeta.og_image;
                      return (
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: S.textDim, marginBottom: '6px' }}>
                            Social card preview
                          </div>
                          <div style={{
                            background: '#fff', border: `1px solid ${S.border}`,
                            borderRadius: '8px', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: '100%', aspectRatio: '1200 / 630',
                              background: img ? `url(${img}) center/cover` : 'linear-gradient(135deg, #667eea, #764ba2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: '11px', fontWeight: 600, letterSpacing: '1px',
                              textTransform: 'uppercase', opacity: img ? 1 : 0.9,
                            }}>
                              {!img && 'No share image set'}
                            </div>
                            <div style={{ padding: '10px 12px', borderTop: `1px solid ${S.border}` }}>
                              <div style={{ fontSize: '10px', color: S.textDim, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                tapasreadingcafe.com
                              </div>
                              <div style={{
                                fontSize: '13px', fontWeight: 700, color: S.text,
                                marginTop: '3px', lineHeight: 1.3,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                              }}>{t}</div>
                              <div style={{
                                fontSize: '11px', color: S.textDim, marginTop: '2px', lineHeight: 1.4,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}>{d}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </details>
              </div>

              {/* Add section button */}
              <div style={{ padding: '12px 14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setAddPickerOpen(true)}
                  style={{
                    flex: 1, minWidth: '120px', padding: '10px 12px',
                    background: S.accent, color: '#fff',
                    border: 'none', borderRadius: '4px',
                    fontSize: '12px', fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 1px 3px rgba(13,153,255,0.3)',
                  }}
                >+ Add section</button>
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

              {/* Block tree for the current editing page — drag-to-reorder
                  via @dnd-kit. The drag handle (⋮⋮ on the left of each
                  row) is the only drag activator; the rest of the row
                  retains click-to-select. On drop we splice the blocks
                  array via the existing mutateBlocks path so undo/redo
                  and autosave keep working. */}
              <div style={{ padding: '0 8px 12px', flex: 1 }}>
                {(() => {
                  const blocks = getBlocks(editingPage);
                  if (blocks.length === 0) {
                    return (
                      <div style={{
                        padding: '32px 14px', textAlign: 'center',
                        color: S.textFaint, fontSize: '11px', lineHeight: 1.55,
                      }}>
                        No blocks yet on this page.<br />
                        This page is rendering its legacy layout. Click <b>+ Add section</b> above to start building with blocks.
                      </div>
                    );
                  }
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
                  return (
                    <DndContext
                      sensors={dndSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const oldIdx = blocks.findIndex(b => b.id === active.id);
                        const newIdx = blocks.findIndex(b => b.id === over.id);
                        if (oldIdx < 0 || newIdx < 0) return;
                        mutateBlocks(editingPage, (b) => arrayMove(b, oldIdx, newIdx));
                      }}
                    >
                      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                        {blocks.map((b, idx) => {
                          const meta = BLOCK_REGISTRY_META[b.type];
                          const isPrimary = selectedBlockId === b.id;
                          const isMulti = multiSelectedIds.has(b.id);
                          const isSelected = isPrimary || isMulti;
                          return (
                            <SortableBlockRow
                              key={b.id}
                              block={b}
                              meta={meta}
                              isPrimary={isPrimary}
                              isMulti={isMulti}
                              isSelected={isSelected}
                              S={S}
                              onSelect={handleSelect(b, idx)}
                              onDuplicate={() => duplicateBlock(editingPage, b.id)}
                              onDelete={() => askConfirm({
                                title: `Delete ${meta?.label || b.type}?`,
                                message: 'This removes the block from the draft. You can undo with ⌘Z.',
                                confirmLabel: 'Delete',
                                tone: 'danger',
                                onConfirm: () => deleteBlock(editingPage, b.id),
                              })}
                            />
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>
            </div>
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
              {/* Hamburger toggle for the left sidebar — mirrors the
                  outer dashboard's collapsible nav pattern. */}
              <button
                onClick={() => setLeftCollapsed(c => !c)}
                title={leftCollapsed ? 'Show pages panel' : 'Hide pages panel'}
                style={{
                  width: '28px', height: '28px', padding: 0,
                  background: leftCollapsed ? S.accentLight : 'white',
                  border: `1px solid ${leftCollapsed ? S.accent + '55' : S.border}`,
                  borderRadius: '4px', cursor: 'pointer',
                  color: leftCollapsed ? S.accent : S.textDim,
                  fontSize: '14px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!leftCollapsed) { e.currentTarget.style.background = S.bg; e.currentTarget.style.color = S.text; } }}
                onMouseLeave={(e) => { if (!leftCollapsed) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = S.textDim; } }}
              >☰</button>
              <div style={{ fontSize: '11px', color: S.textDim, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Previewing <span style={{ color: S.text, fontFamily: 'ui-monospace, monospace', fontWeight: '600' }}>{STORE_URL + iframePath}</span>
                <span style={{
                  marginLeft: '8px', padding: '2px 8px',
                  background: '#EEF2FF', color: S.accent,
                  borderRadius: '10px', fontSize: '10px', fontWeight: '700',
                }}>DRAFT</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '2px', background: S.bg, padding: '2px', borderRadius: '6px' }}>
                {VIEWPORTS.map(v => (
                  <button key={v.key} onClick={() => setViewport(v.key)}
                    title={v.key}
                    style={{
                      padding: '5px 10px',
                      background: viewport === v.key ? 'white' : 'transparent',
                      color: viewport === v.key ? S.text : S.textDim,
                      border: 'none', borderRadius: '4px', cursor: 'pointer',
                      fontSize: '13px',
                      boxShadow: viewport === v.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}>
                    {v.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setIframeKey(k => k + 1)} title="Reload preview"
                style={{ padding: '6px 10px', background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: S.textDim }}>
                ↻
              </button>
              <a href={STORE_URL + iframePath} target="_blank" rel="noreferrer"
                style={{ padding: '6px 10px', background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', color: S.textDim, fontSize: '11px', textDecoration: 'none', fontWeight: '600' }}>
                ↗ Open live
              </a>
              {/* Hamburger toggle for the right inspector panel. */}
              <button
                onClick={() => setRightCollapsed(c => !c)}
                title={rightCollapsed ? 'Show inspector' : 'Hide inspector'}
                style={{
                  width: '28px', height: '28px', padding: 0,
                  background: rightCollapsed ? S.accentLight : 'white',
                  border: `1px solid ${rightCollapsed ? S.accent + '55' : S.border}`,
                  borderRadius: '4px', cursor: 'pointer',
                  color: rightCollapsed ? S.accent : S.textDim,
                  fontSize: '14px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!rightCollapsed) { e.currentTarget.style.background = S.bg; e.currentTarget.style.color = S.text; } }}
                onMouseLeave={(e) => { if (!rightCollapsed) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = S.textDim; } }}
              >☰</button>
            </div>
          </div>

          <div style={{
            flex: 1, overflow: 'auto', background: '#E4E7EB',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            padding: viewport === 'desktop' ? '0' : '20px',
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
              onChangeStyle={(cssProp, value) => updateElementStyle(selectedElement, cssProp, value)}
              onClear={() => clearElementStyles(selectedElement)}
              onBack={clearSelection}
            />
          ) : selectedBlock ? (
            <BlockInspector
              block={selectedBlock}
              meta={BLOCK_REGISTRY_META[selectedBlock.type]}
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
              visibilityFields={CONTENT_SCHEMA.find(s => s.key === 'visibility')?.fields || []}
              visibilityValues={draftContent.visibility || {}}
              sectionOrderFields={(CONTENT_SCHEMA.find(s => s.key === 'layout')?.fields || []).filter(f => f.key.startsWith(currentPageEntry.key + '_'))}
              sectionOrderValues={draftContent.layout || {}}
              onChangeVisibility={(key, value) => updateField('visibility', key, value)}
              onChangeSectionOrder={(key, value) => updateField('layout', key, value)}
              onOpenDesignSystem={() => setDesignModalOpen(true)}
            />
          )}
        </aside>
      </div>
    </div>
    </MediaLibraryContext.Provider>
  );
}
