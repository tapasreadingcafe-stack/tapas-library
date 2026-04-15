import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_CONTENT, CONTENT_SCHEMA, sectionForFieldPath } from '../utils/siteContentSchema';

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

function ImageField({ field, value, onChange, inputRef }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
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
          placeholder="URL or upload"
          style={{ ...inputBaseStyle, flex: 1, fontFamily: 'ui-monospace, monospace' }} />
        <label style={{
          padding: '0 10px', height: '28px', display: 'inline-flex', alignItems: 'center',
          background: D.accent, color: 'white', border: 'none', borderRadius: '2px',
          cursor: 'pointer', fontSize: '11px', fontWeight: '600', opacity: uploading ? 0.7 : 1,
        }}>
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

const FIELD_RENDERERS = {
  text: TextField, textarea: TextArea, color: ColorField, font: FontField,
  image: ImageField, toggle: ToggleField, number: NumberField, select: SelectField,
  sectionOrder: SectionOrderField,
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

// ---- Main --------------------------------------------------------------

export default function SiteContent() {
  // Two separate content states — draft is what you're editing, live is
  // what's pushed to production. The dashboard always edits draft.
  const [draftContent, setDraftContent] = useState(DEFAULT_CONTENT);
  const [liveContent,  setLiveContent]  = useState(DEFAULT_CONTENT);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [pushing, setPushing]   = useState(false);
  const [pushedAt, setPushedAt] = useState(null);
  const [error,   setError]     = useState('');
  const [activeSection, setActiveSection] = useState('brand');
  // Right-panel top tab. 'design' is the full field editor; 'prototype'
  // is a placeholder for interaction / animation settings — not wired up
  // yet but we show it clearly marked as coming soon instead of a dead tab.
  const [panelTab, setPanelTab] = useState('design');
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

  // Push — copies draft → live.
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
        if (selectedElement) {
          setSelectedElement(null);
          try { iframeRef.current?.contentWindow?.postMessage({ type: 'tapas:clear-selection' }, '*'); } catch {}
        }
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedElement]);

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
        setSelectedElement(msg.fieldPath);
        return;
      }
      if (msg.type === 'tapas:deselect') {
        setSelectedElement(null);
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
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const vp = VIEWPORTS.find(v => v.key === viewport) || VIEWPORTS[0];
  const currentSection = CONTENT_SCHEMA.find(s => s.key === activeSection) || CONTENT_SCHEMA[0];
  const currentStorage = storageKeyForSection(currentSection);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      background: S.bg,
      fontFamily: '-apple-system, system-ui, sans-serif',
    }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: S.text }}>🎨 Edit Website</span>
          <span style={{ color: S.textFaint, fontSize: '12px' }}>·</span>
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

        {/* LEFT: pages + sections */}
        <aside style={{
          width: '240px',
          flexShrink: 0,
          background: S.panel,
          borderRight: `1px solid ${S.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 14px 6px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: S.textDim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Pages
            </div>
            {PAGES.map(p => {
              const active = iframePath === p.path;
              return (
                <button
                  key={p.path}
                  onClick={() => setIframePath(p.path)}
                  title={`Open ${p.label} in the preview`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    marginBottom: '2px',
                    background: active ? S.accentLight : 'transparent',
                    color: active ? S.accent : S.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: active ? '600' : '500',
                    textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = S.bg; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: `1px solid ${S.border}`, marginTop: '6px' }}>
            {SECTION_GROUPS.map(group => (
              <div key={group.key}>
                <div style={{
                  padding: '12px 14px 6px',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: S.textDim,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {group.icon} {group.label}
                </div>
                <div style={{ padding: '0 8px 8px' }}>
                  {group.sectionKeys.map(key => {
                    const section = CONTENT_SCHEMA.find(s => s.key === key);
                    if (!section) return null;
                    const active = activeSection === section.key;
                    return (
                      <button
                        key={section.key}
                        onClick={() => jumpToSection(section.key)}
                        title={section.subtitle || section.title}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 8px',
                          background: active ? S.accentLight : 'transparent',
                          color: active ? S.accent : S.text,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11.5px',
                          fontWeight: active ? '600' : '400',
                          textAlign: 'left',
                          marginBottom: '1px',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = S.bg; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ opacity: 0.8 }}>{section.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{section.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Add section / element buttons — bottom of the left sidebar.
              These are affordances so the user has a visible place to add
              new content; currently they add a custom inline block the
              user can rename and fill in, rather than extending the
              hardcoded schema. */}
          <div style={{
            marginTop: 'auto',
            padding: '12px 10px 14px',
            borderTop: `1px solid ${S.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('New section name:');
                if (!name) return;
                setDraftContent(prev => {
                  const custom = Array.isArray(prev.custom_sections) ? prev.custom_sections : [];
                  return {
                    ...prev,
                    custom_sections: [...custom, { id: `custom_${Date.now()}`, title: name, body: '' }],
                  };
                });
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', padding: '8px 10px',
                background: 'transparent',
                border: `1px dashed ${S.borderStrong}`,
                borderRadius: '4px',
                color: S.textDim, cursor: 'pointer',
                fontSize: '11.5px', fontWeight: '600',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = S.accent;
                e.currentTarget.style.color = S.accent;
                e.currentTarget.style.background = S.accentLight;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = S.borderStrong;
                e.currentTarget.style.color = S.textDim;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              + Add section
            </button>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('New element name:');
                if (!name) return;
                setDraftContent(prev => {
                  const custom = Array.isArray(prev.custom_elements) ? prev.custom_elements : [];
                  return {
                    ...prev,
                    custom_elements: [...custom, { id: `el_${Date.now()}`, label: name, value: '' }],
                  };
                });
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', padding: '6px 10px',
                background: 'transparent',
                border: `1px dashed ${S.border}`,
                borderRadius: '4px',
                color: S.textFaint, cursor: 'pointer',
                fontSize: '11px', fontWeight: '500',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = S.textDim; e.currentTarget.style.borderColor = S.borderStrong; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = S.textFaint; e.currentTarget.style.borderColor = S.border; }}
            >
              + Add element
            </button>
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
            <div style={{ fontSize: '11px', color: S.textDim }}>
              Previewing <span style={{ color: S.text, fontFamily: 'ui-monospace, monospace', fontWeight: '600' }}>{STORE_URL + iframePath}</span>
              <span style={{
                marginLeft: '8px', padding: '2px 8px',
                background: '#EEF2FF', color: S.accent,
                borderRadius: '10px', fontSize: '10px', fontWeight: '700',
              }}>DRAFT</span>
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

        {/* RIGHT: property inspector — Figma-style, one active section */}
        <aside style={{
          width: '320px',
          flexShrink: 0,
          background: D.panel,
          borderLeft: `1px solid ${D.border}`,
          display: 'flex',
          flexDirection: 'column',
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
          ) : (
          <>
          {/* Design / Prototype tab bar */}
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${D.border}`,
            background: D.panel,
            flexShrink: 0,
          }}>
            <button
              onClick={() => setPanelTab('design')}
              style={{
                flex: 1,
                padding: '12px 0',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: panelTab === 'design' ? '600' : '500',
                color: panelTab === 'design' ? D.text : D.textDim,
                borderBottom: panelTab === 'design' ? `2px solid ${D.text}` : '2px solid transparent',
                marginBottom: '-1px',
                background: 'transparent',
                border: 'none',
                borderBottomStyle: 'solid',
                borderBottomWidth: '2px',
                cursor: 'pointer',
                transition: 'color 150ms',
              }}
            >
              Design
            </button>
            <button
              onClick={() => setPanelTab('prototype')}
              style={{
                flex: 1,
                padding: '12px 0',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: panelTab === 'prototype' ? '600' : '500',
                color: panelTab === 'prototype' ? D.text : D.textDim,
                borderBottom: panelTab === 'prototype' ? `2px solid ${D.text}` : '2px solid transparent',
                marginBottom: '-1px',
                background: 'transparent',
                border: 'none',
                borderBottomStyle: 'solid',
                borderBottomWidth: '2px',
                cursor: 'pointer',
                transition: 'color 150ms',
              }}
            >
              Prototype
            </button>
          </div>

          {panelTab === 'prototype' && (
            <div style={{ padding: '56px 24px', textAlign: 'center', color: D.textDim, fontSize: '12px', lineHeight: 1.7, background: D.panel }}>
              <div style={{ fontSize: '42px', marginBottom: '14px' }}>🎬</div>
              <div style={{ fontWeight: '700', color: D.text, marginBottom: '8px', fontSize: '13px' }}>Prototype — coming soon</div>
              <p style={{ margin: '0 auto 18px', maxWidth: '260px' }}>
                Interactive prototypes with animations, transitions, and click-through flows will land here.
              </p>
              <button
                onClick={() => setPanelTab('design')}
                style={{
                  padding: '7px 16px',
                  background: D.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ← Back to Design
              </button>
            </div>
          )}

          {/* Section header — Figma "Frame" style */}
          {panelTab === 'design' && !loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 14px',
              borderBottom: `1px solid ${D.border}`,
              background: D.panel,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '12px' }}>{currentSection.icon}</span>
              <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: D.text, letterSpacing: '0.1px' }}>
                {currentSection.title}
                <span style={{ marginLeft: '6px', color: D.textFaint, fontSize: '9px' }}>▾</span>
              </span>
              <button
                title="Reset section"
                onClick={() => {
                  if (!window.confirm(`Reset ${currentSection.title}?`)) return;
                  const defaults = DEFAULT_CONTENT[currentStorage] || {};
                  const keysToReset = currentSection.fields.map(f => f.key);
                  setDraftContent(prev => ({
                    ...prev,
                    [currentStorage]: keysToReset.reduce(
                      (acc, k) => ({ ...acc, [k]: defaults[k] }),
                      { ...(prev[currentStorage] || {}) }
                    ),
                  }));
                }}
                style={{
                  background: 'transparent', border: 'none',
                  color: D.textFaint, cursor: 'pointer',
                  fontSize: '12px', padding: '4px 6px', borderRadius: '2px',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = D.text; e.currentTarget.style.background = D.panelAlt; }}
                onMouseLeave={e => { e.currentTarget.style.color = D.textFaint; e.currentTarget.style.background = 'transparent'; }}
              >↺</button>
            </div>
          )}

          {/* Fields */}
          {panelTab === 'design' && (
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '12px', paddingBottom: '40px', background: D.panel }}>
            {loading ? (
              <div style={{ color: D.textDim, textAlign: 'center', padding: '40px', fontSize: '11px' }}>Loading…</div>
            ) : (
              <>
                {/* Canvas-editing hint */}
                <div style={{
                  margin: '0 12px 14px',
                  padding: '10px 12px',
                  background: D.accentFaint,
                  border: `1px solid rgba(13,153,255,0.25)`,
                  borderRadius: '4px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: '12px', color: D.accent, flexShrink: 0 }}>✎</span>
                  <div style={{ fontSize: '10.5px', color: D.text, lineHeight: '1.45' }}>
                    <strong>Tip:</strong> click any text on the preview to edit its CSS styles directly.
                  </div>
                </div>

                {currentSection.subtitle && (
                  <div style={{
                    padding: '0 16px 14px',
                    color: D.textFaint,
                    fontSize: '10.5px',
                    lineHeight: '1.45',
                    fontStyle: 'italic',
                  }}>
                    {currentSection.subtitle}
                  </div>
                )}
                {(() => {
                  const subGroups = SECTION_SUB_GROUPS[currentSection.key];
                  const renderField = (field) => {
                    const Renderer = FIELD_RENDERERS[field.type] || TextField;
                    const value = draftContent[currentStorage]?.[field.key];
                    const refKey = `${currentSection.key}.${field.key}`;
                    return (
                      <Renderer
                        key={field.key}
                        field={field}
                        value={value}
                        inputRef={(el) => { fieldRefs.current[refKey] = el; }}
                        onChange={(v) => updateField(currentStorage, field.key, v)}
                      />
                    );
                  };
                  if (!subGroups) {
                    return currentSection.fields.map(renderField);
                  }
                  // Grouped render: Figma-style collapsible subsections.
                  // Any field not mentioned in a group falls into a
                  // trailing "Other" subsection so we never drop data.
                  const mentioned = new Set(subGroups.flatMap(g => g.keys));
                  const other = currentSection.fields.filter(f => !mentioned.has(f.key));
                  // Custom colors are a dynamic array appended to the
                  // Fill subsection. Stored at brand.custom_colors so
                  // it lives alongside the schema-defined colors.
                  const customColors = (draftContent[currentStorage]?.custom_colors) || [];
                  const addCustomColor = () => {
                    setDraftContent(prev => ({
                      ...prev,
                      [currentStorage]: {
                        ...(prev[currentStorage] || {}),
                        custom_colors: [...((prev[currentStorage] || {}).custom_colors || []), '#FFFFFF'],
                      },
                    }));
                  };
                  const setCustomColor = (idx, val) => {
                    setDraftContent(prev => {
                      const arr = [...(((prev[currentStorage] || {}).custom_colors) || [])];
                      arr[idx] = val;
                      return { ...prev, [currentStorage]: { ...(prev[currentStorage] || {}), custom_colors: arr } };
                    });
                  };
                  const removeCustomColor = (idx) => {
                    setDraftContent(prev => {
                      const arr = [...(((prev[currentStorage] || {}).custom_colors) || [])];
                      arr.splice(idx, 1);
                      return { ...prev, [currentStorage]: { ...(prev[currentStorage] || {}), custom_colors: arr } };
                    });
                  };
                  return (
                    <>
                      {subGroups.map(group => {
                        const groupFields = group.keys
                          .map(k => currentSection.fields.find(f => f.key === k))
                          .filter(Boolean);
                        if (groupFields.length === 0 && !group.hasAdd) return null;
                        const isFill = group.hasAdd && currentSection.key === 'brand';
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
                      {currentSection.key === 'brand' && (
                        <SelectionColorsFooter
                          colors={{
                            'Primary':       draftContent[currentStorage]?.primary_color,
                            'Primary dark':  draftContent[currentStorage]?.primary_color_dark,
                            'Primary light': draftContent[currentStorage]?.primary_color_light,
                            'Accent':        draftContent[currentStorage]?.accent_color,
                            'Accent dark':   draftContent[currentStorage]?.accent_color_dark,
                            'Cream':         draftContent[currentStorage]?.cream_color,
                            'Sand':          draftContent[currentStorage]?.sand_color,
                          }}
                        />
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
          )}
          </>
          )}
        </aside>
      </div>
    </div>
  );
}
