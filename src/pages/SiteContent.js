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
  catalog: '/books', footer: '/', visibility: '/', styles: '/', layout: '/',
  section_style_home_hero: '/', section_style_home_staff_picks: '/', section_style_home_cafe_story: '/',
  section_style_about_hero: '/about', section_style_offers_hero: '/offers',
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

const S = {
  bg:       '#F5F6F8',
  panel:    '#FFFFFF',
  border:   '#E4E7EB',
  borderStrong: '#CBD2D9',
  text:     '#1F2933',
  textDim:  '#7B8794',
  textFaint:'#A8B1BB',
  accent:   '#4F46E5',
  accentLight:'#EEF2FF',
  success:  '#10B981',
  warning:  '#F59E0B',
  danger:   '#EF4444',
};

// ---- Field renderers --------------------------------------------------

const inputBaseStyle = {
  width: '100%',
  padding: '6px 10px',
  border: `1px solid ${S.border}`,
  borderRadius: '6px',
  fontSize: '12px',
  fontFamily: 'inherit',
  outline: 'none',
  background: '#FFF',
  color: S.text,
  boxSizing: 'border-box',
  height: '32px',
};
const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '500',
  color: S.textDim,
  marginBottom: '4px',
};
const hintStyle = {
  fontSize: '11px',
  color: S.textFaint,
  marginTop: '4px',
};

function Row({ label, children, inline }) {
  if (inline) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
        <label style={{ ...labelStyle, marginBottom: 0, flexShrink: 0, width: '110px' }}>{label}</label>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function TextField({ field, value, onChange, inputRef }) {
  return (
    <Row label={field.label} inline>
      <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)} style={inputBaseStyle} />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

function TextArea({ field, value, onChange, inputRef }) {
  return (
    <Row label={field.label}>
      <textarea ref={inputRef} value={value || ''} onChange={e => onChange(e.target.value)} rows={3}
        style={{ ...inputBaseStyle, height: 'auto', resize: 'vertical', lineHeight: '1.5', padding: '8px 10px' }} />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

function ColorField({ field, value, onChange, inputRef }) {
  return (
    <Row label={field.label} inline>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '6px',
            background: value || 'transparent',
            border: `1px solid ${S.border}`,
            backgroundImage: value ? 'none' : 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
          }} />
          <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        </div>
        <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="Transparent" style={{ ...inputBaseStyle, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase' }} />
      </div>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

function FontField({ field, value, onChange, inputRef }) {
  const COMMON = ['Playfair Display','Lato','Inter','Roboto','Open Sans','Merriweather','Lora','Raleway','Cormorant Garamond','EB Garamond','Crimson Pro','Libre Baskerville','Montserrat','Poppins'];
  return (
    <Row label={field.label} inline>
      <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        list={`font-options-${field.key}`} placeholder="Playfair Display"
        style={{ ...inputBaseStyle, fontFamily: value ? `"${value}", serif` : 'inherit' }} />
      <datalist id={`font-options-${field.key}`}>
        {COMMON.map(f => <option key={f} value={f} />)}
      </datalist>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
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
    <Row label={field.label}>
      {value && (
        <div style={{ marginBottom: '8px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${S.border}` }}>
          <img src={value} alt={field.label} style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="https://… or upload"
          style={{ ...inputBaseStyle, flex: 1, fontSize: '11px', fontFamily: 'ui-monospace, monospace' }} />
        <label style={{
          padding: '0 10px', height: '32px', display: 'inline-flex', alignItems: 'center',
          background: S.accent, color: 'white', border: 'none', borderRadius: '6px',
          cursor: 'pointer', fontSize: '11px', fontWeight: '600', opacity: uploading ? 0.7 : 1,
        }}>
          {uploading ? '⏳' : '📤'}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} title="Remove"
            style={{ padding: '0 10px', height: '32px', background: 'white', border: `1px solid ${S.border}`, borderRadius: '6px', cursor: 'pointer', color: S.danger, fontSize: '12px' }}>🗑</button>
        )}
      </div>
      {uploadError && <div style={{ ...hintStyle, color: S.danger }}>⚠️ {uploadError}</div>}
      {!uploadError && field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

function ToggleField({ field, value, onChange }) {
  const on = value !== false;
  return (
    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: S.bg, borderRadius: '6px' }}>
      <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
        style={{
          width: '32px', height: '18px', borderRadius: '9px',
          background: on ? S.success : S.borderStrong, border: 'none', cursor: 'pointer',
          position: 'relative', flexShrink: 0, transition: 'background 0.15s',
        }}>
        <span style={{
          position: 'absolute', top: '2px', left: on ? '16px' : '2px',
          width: '14px', height: '14px', background: 'white', borderRadius: '50%',
          transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }} />
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', color: S.text, fontWeight: '500' }}>{field.label}</div>
        {field.hint && <div style={{ ...hintStyle, marginTop: 0 }}>{field.hint}</div>}
      </div>
    </div>
  );
}

function NumberField({ field, value, onChange, inputRef }) {
  const v = Number(value) || 0;
  const min = field.min ?? 0;
  const max = field.max ?? 200;
  return (
    <Row label={field.label} inline>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input type="range" min={min} max={max} value={v}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: S.accent }} />
        <div style={{ position: 'relative', width: '64px', flexShrink: 0 }}>
          <input ref={inputRef} type="number" min={min} max={max} value={v}
            onChange={e => onChange(Number(e.target.value))}
            style={{ ...inputBaseStyle, textAlign: 'right', paddingRight: '22px' }} />
          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: S.textFaint, pointerEvents: 'none' }}>px</span>
        </div>
      </div>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

function SelectField({ field, value, onChange, inputRef }) {
  return (
    <Row label={field.label} inline>
      <select ref={inputRef} value={value || (field.options?.[0]?.value ?? '')}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputBaseStyle, cursor: 'pointer' }}>
        {(field.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
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
    <Row label={field.label}>
      <div style={{ background: S.bg, borderRadius: '6px', padding: '4px', border: `1px solid ${S.border}` }}>
        {ordered.map((id, idx) => (
          <div key={id} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'white', padding: '8px 10px', borderRadius: '4px',
            marginBottom: idx === ordered.length - 1 ? 0 : '2px',
            border: `1px solid ${S.border}`,
          }}>
            <span style={{ color: S.textFaint, fontSize: '12px' }}>⋮⋮</span>
            <span style={{ flex: 1, fontSize: '12px', color: S.text, fontWeight: '500' }}>{labelFor(id)}</span>
            <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}
              style={{ width: '22px', height: '22px', padding: 0, background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? S.textFaint : S.textDim, fontSize: '11px' }}>↑</button>
            <button type="button" onClick={() => move(idx, 1)} disabled={idx === ordered.length - 1}
              style={{ width: '22px', height: '22px', padding: 0, background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', cursor: idx === ordered.length - 1 ? 'not-allowed' : 'pointer', color: idx === ordered.length - 1 ? S.textFaint : S.textDim, fontSize: '11px' }}>↓</button>
          </div>
        ))}
      </div>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </Row>
  );
}

const FIELD_RENDERERS = {
  text: TextField, textarea: TextArea, color: ColorField, font: FontField,
  image: ImageField, toggle: ToggleField, number: NumberField, select: SelectField,
  sectionOrder: SectionOrderField,
};

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

  const updateField = (storageKey, fieldKey, value) => {
    setDraftContent(prev => ({
      ...prev,
      [storageKey]: { ...(prev[storageKey] || {}), [fieldKey]: value },
    }));
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
    if (iframePath !== path) setIframePath(path);
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

        <button
          onClick={revertDraft}
          disabled={!dirty || pushing}
          style={{
            padding: '7px 14px',
            background: 'white',
            border: `1px solid ${S.border}`,
            borderRadius: '6px',
            color: dirty ? S.danger : S.textFaint,
            cursor: !dirty || pushing ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          Discard changes
        </button>
        <button
          onClick={pushToLive}
          disabled={!dirty || pushing || saving}
          style={{
            padding: '8px 18px',
            background: dirty ? S.accent : S.borderStrong,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (!dirty || pushing || saving) ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            boxShadow: dirty ? '0 2px 8px rgba(79,70,229,0.35)' : 'none',
          }}
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
            {PAGES.map(p => (
              <button
                key={p.path}
                onClick={() => setIframePath(p.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  marginBottom: '2px',
                  background: iframePath === p.path ? S.accentLight : 'transparent',
                  color: iframePath === p.path ? S.accent : S.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: iframePath === p.path ? '600' : '500',
                  textAlign: 'left',
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
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
                        }}
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
              src={`${STORE_URL}${iframePath}${iframePath.includes('?') ? '&' : '?'}preview=draft`}
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

        {/* RIGHT: property inspector — Figma-style collapsible sections */}
        <aside style={{
          width: '340px',
          flexShrink: 0,
          background: S.panel,
          borderLeft: `1px solid ${S.border}`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ color: S.textDim, textAlign: 'center', padding: '40px' }}>Loading…</div>
            ) : (
              CONTENT_SCHEMA.map(section => {
                const storage = storageKeyForSection(section);
                const isExpanded = expanded.has(section.key);
                const isActive = activeSection === section.key;

                return (
                  <div
                    key={section.key}
                    ref={(el) => { sectionRefs.current[section.key] = el; }}
                    style={{
                      borderBottom: `1px solid ${S.border}`,
                      background: isActive ? S.accentLight + '55' : 'transparent',
                    }}
                  >
                    {/* Section header */}
                    <button
                      onClick={() => toggleExpand(section.key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{
                        fontSize: '9px',
                        color: S.textDim,
                        width: '12px',
                        display: 'inline-block',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s',
                      }}>▶</span>
                      <span style={{ fontSize: '12px' }}>{section.icon}</span>
                      <span style={{
                        flex: 1,
                        fontSize: '12px',
                        fontWeight: '600',
                        color: S.text,
                        textTransform: 'none',
                        letterSpacing: '0',
                      }}>
                        {section.title}
                      </span>
                      <span
                        title="Reset to defaults"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!window.confirm(`Reset ${section.title}?`)) return;
                          const defaults = DEFAULT_CONTENT[storage] || {};
                          const keysToReset = section.fields.map(f => f.key);
                          setDraftContent(prev => ({
                            ...prev,
                            [storage]: keysToReset.reduce(
                              (acc, k) => ({ ...acc, [k]: defaults[k] }),
                              { ...(prev[storage] || {}) }
                            ),
                          }));
                        }}
                        style={{
                          color: S.textFaint,
                          fontSize: '12px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = S.textDim; e.currentTarget.style.background = S.bg; }}
                        onMouseLeave={e => { e.currentTarget.style.color = S.textFaint; e.currentTarget.style.background = 'transparent'; }}
                      >↺</span>
                    </button>

                    {/* Section body */}
                    {isExpanded && (
                      <div style={{ padding: '4px 16px 14px' }}>
                        {section.subtitle && (
                          <p style={{
                            margin: '0 0 12px',
                            color: S.textDim,
                            fontSize: '10.5px',
                            lineHeight: '1.4',
                            fontStyle: 'italic',
                          }}>
                            {section.subtitle}
                          </p>
                        )}
                        {section.fields.map(field => {
                          const Renderer = FIELD_RENDERERS[field.type] || TextField;
                          const value = draftContent[storage]?.[field.key];
                          const refKey = `${section.key}.${field.key}`;
                          return (
                            <Renderer
                              key={field.key}
                              field={field}
                              value={value}
                              inputRef={(el) => { fieldRefs.current[refKey] = el; }}
                              onChange={(v) => updateField(storage, field.key, v)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
