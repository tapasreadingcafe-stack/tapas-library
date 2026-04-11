import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_CONTENT, CONTENT_SCHEMA } from '../utils/siteContentSchema';

// =====================================================================
// SiteContent — split-screen visual editor for the storefront.
//
// Left pane: form editor (sections + fields)
// Right pane: live iframe of www.tapasreadingcafe.com
//
// When you save, the iframe reloads so you can see changes immediately.
// "Show me" buttons on each section postMessage to the iframe telling
// it to scroll to the matching section and flash-highlight it.
//
// Viewport toggle: Desktop / Tablet / Mobile (changes iframe width).
// Page toggle: Home / Books / Book detail / About / Offers / Profile.
// =====================================================================

const STORE_URL = 'https://www.tapasreadingcafe.com';

// Maps section keys → a { path, sectionId } so the editor can tell the
// iframe which URL to load and which in-page anchor to scroll to.
const SECTION_TARGETS = {
  brand:      { path: '/',        sectionId: 'section-home-hero' },
  contact:    { path: '/about',   sectionId: 'section-about-visit' },
  home:       { path: '/',        sectionId: 'section-home-hero' },
  about:      { path: '/about',   sectionId: 'section-about-hero' },
  offers:     { path: '/offers',  sectionId: 'section-offers-hero' },
  newsletter: { path: '/',        sectionId: 'section-newsletter' },
};

const VIEWPORTS = [
  { key: 'desktop', label: '🖥 Desktop', width: '100%',   maxWidth: '1400px' },
  { key: 'tablet',  label: '📱 Tablet',  width: '820px',  maxWidth: '820px' },
  { key: 'mobile',  label: '📞 Mobile',  width: '420px',  maxWidth: '420px' },
];

const PAGES = [
  { path: '/',       label: 'Home' },
  { path: '/books',  label: 'Books' },
  { path: '/about',  label: 'About' },
  { path: '/offers', label: 'Offers' },
];

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

function TextField({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{field.label}</label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}
function TextArea({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{field.label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}
function ColorField({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{field.label}</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          style={{ width: '40px', height: '36px', border: '1px solid #dfe4ea', borderRadius: '6px', cursor: 'pointer', padding: '2px' }} />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="#2C1810" style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} />
      </div>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}
function FontField({ field, value, onChange }) {
  const COMMON = ['Playfair Display','Lato','Inter','Roboto','Open Sans','Merriweather','Lora','Raleway','Cormorant Garamond','EB Garamond','Crimson Pro','Libre Baskerville','Montserrat','Poppins'];
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{field.label}</label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        list={`font-options-${field.key}`} placeholder="Playfair Display"
        style={{ ...inputStyle, fontFamily: value ? `"${value}", serif` : 'inherit' }} />
      <datalist id={`font-options-${field.key}`}>
        {COMMON.map(f => <option key={f} value={f} />)}
      </datalist>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}
const FIELD_RENDERERS = { text: TextField, textarea: TextArea, color: ColorField, font: FontField };

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
  const iframeRef = useRef(null);

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

  const updateField = (sectionKey, fieldKey, value) => {
    setContent(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [fieldKey]: value } }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: 'store_content',
        value: content,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (error) throw error;
      setSavedAt(new Date());
      setDirty(false);
      // Reload iframe so changes show up.
      setIframeKey(k => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // Send a scroll-to message to the iframe.
  const jumpToSection = (sectionKey) => {
    setActiveSection(sectionKey);
    const target = SECTION_TARGETS[sectionKey];
    if (!target || !iframeRef.current) return;
    // If the iframe isn't on the right path, swap src first, then scroll.
    if (iframePath !== target.path) {
      setIframePath(target.path);
      // Scroll will happen after the iframe reloads and posts 'tapas:ready'.
      pendingScrollRef.current = target.sectionId;
    } else {
      iframeRef.current.contentWindow?.postMessage(
        { type: 'tapas:highlight', sectionId: target.sectionId },
        '*'
      );
    }
  };

  const pendingScrollRef = useRef(null);

  // When the iframe posts 'tapas:ready', flush any pending scroll target.
  useEffect(() => {
    const onMessage = (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'tapas:ready' && pendingScrollRef.current) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'tapas:highlight', sectionId: pendingScrollRef.current },
          '*'
        );
        pendingScrollRef.current = null;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const vp = VIEWPORTS.find(v => v.key === viewport) || VIEWPORTS[0];
  const currentSection = CONTENT_SCHEMA.find(s => s.key === activeSection) || CONTENT_SCHEMA[0];

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
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
            🎨 Edit Website
          </h1>
          <p style={{ margin: 0, color: '#8a98a6', fontSize: '12px' }}>
            Live preview on the right. Click Save to see changes.
          </p>
        </div>

        {/* Section tabs */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '6px', flexWrap: 'wrap', background: '#fafbfc' }}>
          {CONTENT_SCHEMA.map(section => (
            <button
              key={section.key}
              onClick={() => jumpToSection(section.key)}
              style={{
                padding: '8px 12px',
                background: activeSection === section.key ? '#667eea' : 'white',
                color: activeSection === section.key ? 'white' : '#5a6c7d',
                border: `1px solid ${activeSection === section.key ? '#667eea' : '#dfe4ea'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}
            >
              {section.icon} {section.title}
            </button>
          ))}
        </div>

        {/* Fields for the active section */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ color: '#8a98a6', textAlign: 'center', padding: '40px' }}>Loading…</div>
          ) : (
            <>
              <div style={{ marginBottom: '18px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px', color: '#2c3e50', fontWeight: '700' }}>
                  {currentSection.icon} {currentSection.title}
                </h2>
                <p style={{ margin: 0, color: '#8a98a6', fontSize: '12px' }}>
                  {currentSection.subtitle}
                </p>
              </div>

              {currentSection.fields.map(field => {
                const Renderer = FIELD_RENDERERS[field.type] || TextField;
                return (
                  <Renderer
                    key={field.key}
                    field={field}
                    value={content[currentSection.key]?.[field.key]}
                    onChange={(v) => updateField(currentSection.key, field.key, v)}
                  />
                );
              })}

              <button
                onClick={() => {
                  if (!window.confirm(`Reset all ${currentSection.title} fields to defaults?`)) return;
                  setContent(prev => ({ ...prev, [currentSection.key]: { ...DEFAULT_CONTENT[currentSection.key] } }));
                  setDirty(true);
                }}
                style={{
                  marginTop: '8px',
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid #dfe4ea',
                  borderRadius: '4px',
                  color: '#8a98a6',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Reset this section
              </button>
            </>
          )}
        </div>

        {/* Footer save bar */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #f0f0f0', background: '#fafbfc' }}>
          {error && (
            <div style={{ marginBottom: '10px', padding: '8px 12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', color: '#856404', fontSize: '12px' }}>
              ⚠️ {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={save}
              disabled={saving || !dirty}
              style={{
                flex: 1,
                padding: '11px',
                background: dirty ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#dfe4ea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (saving || !dirty) ? 'not-allowed' : 'pointer',
                fontWeight: '700',
                fontSize: '13px',
              }}
            >
              {saving ? '⏳ Saving…' : dirty ? '💾 Save & preview' : '✅ All saved'}
            </button>
            <button
              onClick={() => setIframeKey(k => k + 1)}
              title="Reload preview"
              style={{
                padding: '11px 14px',
                background: 'white',
                border: '1px solid #dfe4ea',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ↻
            </button>
          </div>
          {savedAt && !dirty && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#48BB78', textAlign: 'center', fontWeight: '600' }}>
              ✅ Saved {savedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </aside>

      {/* ========================================= */}
      {/* RIGHT: Live preview                       */}
      {/* ========================================= */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Preview toolbar */}
        <div style={{
          padding: '12px 16px',
          background: 'white',
          borderBottom: '1px solid #dfe4ea',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          {/* Page tabs */}
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

          {/* Viewport + URL */}
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
