import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_CONTENT, CONTENT_SCHEMA, sectionForFieldPath } from '../utils/siteContentSchema';

// =====================================================================
// SiteContent — visual-ish editor for the storefront.
//
// Left: form sidebar (section tabs + fields).
// Right: live iframe of www.tapasreadingcafe.com.
//
// Features:
//   - Autosave: debounced 900ms after any change
//   - Click-to-edit: click text on the preview → dashboard jumps to
//     the matching field (via postMessage from StoreEditorSync)
//   - Image upload: ImageField uploads to Supabase storage bucket
//     'site-content' and stores the public URL
//   - Viewport toggle: Desktop / Tablet / Mobile iframe widths
//   - Page tabs: switch iframe src between /, /books, /about, /offers
// =====================================================================

const STORE_URL = 'https://www.tapasreadingcafe.com';
const STORAGE_BUCKET = 'site-content';

const VIEWPORTS = [
  { key: 'desktop', label: '🖥 Desktop', width: '100%',  maxWidth: '1400px' },
  { key: 'tablet',  label: '📱 Tablet',  width: '820px', maxWidth: '820px' },
  { key: 'mobile',  label: '📞 Mobile',  width: '420px', maxWidth: '420px' },
];

const PAGES = [
  { path: '/',       label: 'Home' },
  { path: '/books',  label: 'Books' },
  { path: '/about',  label: 'About' },
  { path: '/offers', label: 'Offers' },
];

// For each schema section, which iframe path the dashboard should
// jump to when the user selects that section.
const SECTION_DEFAULT_PATH = {
  brand:            '/',
  contact:          '/about',
  home:             '/',
  images:           '/',
  about:            '/about',
  about_values:     '/about',
  offers:           '/offers',
  offers_why_join:  '/offers',
  offers_cta:       '/offers',
  newsletter:       '/',
};

// Each schema section has a "real" storage key — sections like
// `about_values` and `offers_why_join` write into `about` / `offers`
// respectively (see CONTENT_SCHEMA `parent` field).
function storageKeyForSection(section) {
  return section.parent || section.key;
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = { ...base };
  for (const k of Object.keys(override)) {
    const bv = base[k];
    const ov = override[k];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      out[k] = deepMerge(bv, ov);
    } else if (ov !== null && ov !== undefined && ov !== '') {
      out[k] = ov;
    }
  }
  return out;
}

// ---- Field renderers ----------------------------------------------------

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '700',
  color: '#5a6c7d',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
};
const hintStyle = {
  fontSize: '11px',
  color: '#8a98a6',
  marginTop: '4px',
  fontStyle: 'italic',
};
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #dfe4ea',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
  background: 'white',
  color: '#2c3e50',
  boxSizing: 'border-box',
};

function TextField({ field, value, onChange, inputRef }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{field.label}</label>
      <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

function TextArea({ field, value, onChange, inputRef }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{field.label}</label>
      <textarea ref={inputRef} value={value || ''} onChange={e => onChange(e.target.value)} rows={3}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

function ColorField({ field, value, onChange, inputRef }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{field.label}</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          style={{ width: '40px', height: '36px', border: '1px solid #dfe4ea', borderRadius: '6px', cursor: 'pointer', padding: '2px' }} />
        <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="#2C1810" style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} />
      </div>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

function FontField({ field, value, onChange, inputRef }) {
  const COMMON = ['Playfair Display','Lato','Inter','Roboto','Open Sans','Merriweather','Lora','Raleway','Cormorant Garamond','EB Garamond','Crimson Pro','Libre Baskerville','Montserrat','Poppins'];
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{field.label}</label>
      <input ref={inputRef} type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        list={`font-options-${field.key}`} placeholder="Playfair Display"
        style={{ ...inputStyle, fontFamily: value ? `"${value}", serif` : 'inherit' }} />
      <datalist id={`font-options-${field.key}`}>
        {COMMON.map(f => <option key={f} value={f} />)}
      </datalist>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

function ImageField({ field, value, onChange, inputRef }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${field.key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
      onChange(publicUrl);
    } catch (err) {
      console.error('[ImageField] upload failed', err);
      setUploadError(
        err.message?.includes('not found') || err.message?.includes('Bucket')
          ? `Create a public bucket named "${STORAGE_BUCKET}" in Supabase → Storage first.`
          : (err.message || 'Upload failed.')
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{field.label}</label>
      {value && (
        <div style={{ marginBottom: '8px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #dfe4ea', background: '#f5f7fa' }}>
          <img src={value} alt={field.label} style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... or upload"
          style={{ ...inputStyle, flex: 1, fontSize: '12px', fontFamily: 'monospace' }}
        />
        <label style={{
          padding: '10px 14px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          opacity: uploading ? 0.7 : 1,
        }}>
          {uploading ? '⏳' : '📤 Upload'}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Remove"
            style={{ padding: '10px 12px', background: 'white', border: '1px solid #dfe4ea', borderRadius: '6px', cursor: 'pointer', color: '#9B2335', fontSize: '14px' }}
          >
            🗑
          </button>
        )}
      </div>
      {uploadError && <div style={{ ...hintStyle, color: '#9B2335', fontStyle: 'normal' }}>⚠️ {uploadError}</div>}
      {field.hint && !uploadError && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

const FIELD_RENDERERS = {
  text: TextField,
  textarea: TextArea,
  color: ColorField,
  font: FontField,
  image: ImageField,
};

// ---- Main component -----------------------------------------------------

export default function SiteContent() {
  const [content, setContent]     = useState(DEFAULT_CONTENT);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [savedAt, setSavedAt]     = useState(null);
  const [error, setError]         = useState('');
  const [dirty, setDirty]         = useState(false);
  const [activeSection, setActiveSection] = useState('brand');
  const [viewport, setViewport]   = useState('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [iframePath, setIframePath] = useState('/');
  const [focusFieldKey, setFocusFieldKey] = useState(null);
  const iframeRef = useRef(null);
  const fieldRefs = useRef({});
  const pendingScrollRef = useRef(null);
  const autosaveTimerRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase
        .from('app_settings').select('value').eq('key', 'store_content').maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.value) {
        const raw = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setContent(deepMerge(DEFAULT_CONTENT, raw));
      } else {
        setContent(DEFAULT_CONTENT);
      }
    } catch (err) {
      setError(err.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = (storageKey, fieldKey, value) => {
    setContent(prev => ({
      ...prev,
      [storageKey]: { ...(prev[storageKey] || {}), [fieldKey]: value },
    }));
    setDirty(true);
  };

  // ---- save -------------------------------------------------------
  const doSave = useCallback(async (nextContent) => {
    setSaving(true); setError('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: 'store_content',
        value: nextContent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (error) throw error;
      setSavedAt(new Date());
      setDirty(false);
      setIframeKey(k => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, []);

  // ---- autosave (debounced) ---------------------------------------
  useEffect(() => {
    if (!dirty || loading) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      doSave(content);
    }, 900);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [content, dirty, loading, doSave]);

  // ---- section jump -----------------------------------------------
  const jumpToSection = (sectionKey, { sectionScrollId } = {}) => {
    setActiveSection(sectionKey);
    const path = SECTION_DEFAULT_PATH[sectionKey] || '/';
    if (iframePath !== path) {
      setIframePath(path);
      pendingScrollRef.current = sectionScrollId || null;
    } else if (sectionScrollId) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'tapas:highlight', sectionId: sectionScrollId },
        '*'
      );
    }
  };

  // ---- receive messages from the iframe ---------------------------
  useEffect(() => {
    const onMessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      // Iframe ready → flush any pending scroll target.
      if (msg.type === 'tapas:ready' && pendingScrollRef.current) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'tapas:highlight', sectionId: pendingScrollRef.current },
          '*'
        );
        pendingScrollRef.current = null;
      }

      // User clicked a [data-editable] element in the iframe.
      if (msg.type === 'tapas:edit-field' && typeof msg.fieldPath === 'string') {
        const sectionKey = sectionForFieldPath(msg.fieldPath);
        if (!sectionKey) return;
        setActiveSection(sectionKey);
        const fieldKey = msg.fieldPath.split('.')[1];
        setFocusFieldKey(fieldKey);
        // Give the form a tick to render before focusing.
        setTimeout(() => {
          const el = fieldRefs.current[`${sectionKey}.${fieldKey}`];
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.transition = 'background 0.3s';
            el.style.background = '#fff3cd';
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
      height: 'calc(100vh - 60px)',
      overflow: 'hidden',
      background: '#f5f7fa',
    }}>
      {/* ========================================= */}
      {/* LEFT: Editor sidebar                      */}
      {/* ========================================= */}
      <aside style={{
        width: '400px',
        flexShrink: 0,
        background: 'white',
        borderRight: '1px solid #dfe4ea',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f0f0f0' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '700', color: '#2c3e50' }}>
            🎨 Edit Website
          </h1>
          <p style={{ margin: 0, color: '#8a98a6', fontSize: '12px' }}>
            Click any text on the preview to edit. Changes save automatically.
          </p>
        </div>

        {/* Section tabs */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '5px', flexWrap: 'wrap', background: '#fafbfc', maxHeight: '140px', overflowY: 'auto' }}>
          {CONTENT_SCHEMA.map(section => (
            <button
              key={section.key}
              onClick={() => jumpToSection(section.key)}
              style={{
                padding: '6px 10px',
                background: activeSection === section.key ? '#667eea' : 'white',
                color: activeSection === section.key ? 'white' : '#5a6c7d',
                border: `1px solid ${activeSection === section.key ? '#667eea' : '#dfe4ea'}`,
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}
            >
              {section.icon} {section.title}
            </button>
          ))}
        </div>

        {/* Fields for the active section */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {loading ? (
            <div style={{ color: '#8a98a6', textAlign: 'center', padding: '40px' }}>Loading…</div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '15px', color: '#2c3e50', fontWeight: '700' }}>
                  {currentSection.icon} {currentSection.title}
                </h2>
                <p style={{ margin: 0, color: '#8a98a6', fontSize: '11px', lineHeight: '1.4' }}>
                  {currentSection.subtitle}
                </p>
              </div>

              {currentSection.fields.map(field => {
                const Renderer = FIELD_RENDERERS[field.type] || TextField;
                const value = content[currentStorage]?.[field.key];
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
              })}

              <button
                onClick={() => {
                  if (!window.confirm(`Reset all ${currentSection.title} fields to defaults?`)) return;
                  const defaults = DEFAULT_CONTENT[currentStorage] || {};
                  // Only reset the fields that belong to this schema section.
                  const keysToReset = currentSection.fields.map(f => f.key);
                  setContent(prev => ({
                    ...prev,
                    [currentStorage]: keysToReset.reduce((acc, k) => ({ ...acc, [k]: defaults[k] }), { ...(prev[currentStorage] || {}) }),
                  }));
                  setDirty(true);
                }}
                style={{
                  marginTop: '6px',
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid #dfe4ea',
                  borderRadius: '4px',
                  color: '#8a98a6',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                Reset this section
              </button>
            </>
          )}
        </div>

        {/* Status footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fafbfc', fontSize: '11px' }}>
          {error && (
            <div style={{ marginBottom: '8px', padding: '8px 10px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', color: '#856404' }}>
              ⚠️ {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#8a98a6' }}>
            {saving ? (
              <span style={{ color: '#667eea', fontWeight: '700' }}>⏳ Saving…</span>
            ) : dirty ? (
              <span style={{ color: '#ED8936', fontWeight: '700' }}>● Unsaved — autosave in ~1s</span>
            ) : savedAt ? (
              <span style={{ color: '#48BB78', fontWeight: '700' }}>✅ Saved {savedAt.toLocaleTimeString()}</span>
            ) : (
              <span>Ready</span>
            )}
            <button
              onClick={() => setIframeKey(k => k + 1)}
              title="Reload preview"
              style={{ padding: '4px 10px', background: 'white', border: '1px solid #dfe4ea', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              ↻ Reload
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================= */}
      {/* RIGHT: Live preview                       */}
      {/* ========================================= */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Preview toolbar */}
        <div style={{
          padding: '10px 16px',
          background: 'white',
          borderBottom: '1px solid #dfe4ea',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {PAGES.map(p => (
              <button
                key={p.path}
                onClick={() => setIframePath(p.path)}
                style={{
                  padding: '6px 14px',
                  background: iframePath === p.path ? '#2c3e50' : 'white',
                  color: iframePath === p.path ? 'white' : '#5a6c7d',
                  border: `1px solid ${iframePath === p.path ? '#2c3e50' : '#dfe4ea'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', background: '#f5f7fa', padding: '3px', borderRadius: '6px' }}>
              {VIEWPORTS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setViewport(v.key)}
                  style={{
                    padding: '6px 12px',
                    background: viewport === v.key ? 'white' : 'transparent',
                    color: viewport === v.key ? '#2c3e50' : '#8a98a6',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    boxShadow: viewport === v.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <a
              href={STORE_URL + iframePath}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '6px 12px',
                background: 'white',
                border: '1px solid #dfe4ea',
                borderRadius: '4px',
                color: '#5a6c7d',
                fontSize: '12px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              ↗ Open in new tab
            </a>
          </div>
        </div>

        {/* Iframe container */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          background: '#e8ecf0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: viewport === 'desktop' ? '0' : '20px',
        }}>
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={STORE_URL + iframePath}
            title="Tapas store preview"
            style={{
              width: vp.width,
              maxWidth: vp.maxWidth,
              height: '100%',
              minHeight: '100%',
              border: viewport === 'desktop' ? 'none' : '1px solid #dfe4ea',
              borderRadius: viewport === 'desktop' ? 0 : '8px',
              background: 'white',
              boxShadow: viewport === 'desktop' ? 'none' : '0 10px 30px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      </main>
    </div>
  );
}
