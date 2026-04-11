import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_CONTENT, CONTENT_SCHEMA } from '../utils/siteContentSchema';

// =====================================================================
// SiteContent — dashboard editor for the store's editable content.
//
// Loads the `store_content` row from app_settings, merges it with
// DEFAULT_CONTENT, and renders one card per schema section with the
// appropriate input for each field.
//
// Saves write the whole blob back to app_settings.value. The store
// picks up changes on its next page load (1–2 seconds).
// =====================================================================

const STORE_URL = 'https://www.tapasreadingcafe.com';

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
  padding: '10px 14px',
  border: '1px solid #dfe4ea',
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  background: 'white',
  color: '#2c3e50',
  boxSizing: 'border-box',
};

function TextField({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{field.label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

function TextArea({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{field.label}</label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={4}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
      />
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

function ColorField({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{field.label}</label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          style={{ width: '48px', height: '42px', border: '1px solid #dfe4ea', borderRadius: '6px', cursor: 'pointer', padding: '2px' }}
        />
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="#2C1810"
          style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
        />
      </div>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

function FontField({ field, value, onChange }) {
  const COMMON = ['Playfair Display','Lato','Inter','Roboto','Open Sans','Merriweather','Lora','Raleway','Cormorant Garamond','EB Garamond','Crimson Pro','Libre Baskerville','Montserrat','Poppins'];
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{field.label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        list={`font-options-${field.key}`}
        placeholder="Playfair Display"
        style={{ ...inputStyle, fontFamily: value ? `"${value}", serif` : 'inherit' }}
      />
      <datalist id={`font-options-${field.key}`}>
        {COMMON.map(f => <option key={f} value={f} />)}
      </datalist>
      {field.hint && <div style={hintStyle}>{field.hint}</div>}
    </div>
  );
}

const FIELD_RENDERERS = {
  text:     TextField,
  textarea: TextArea,
  color:    ColorField,
  font:     FontField,
};

export default function SiteContent() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'store_content')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.value) {
        const raw = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setContent(deepMerge(DEFAULT_CONTENT, raw));
      } else {
        setContent(DEFAULT_CONTENT);
      }
    } catch (err) {
      console.error('[SiteContent] load failed', err);
      setError(err.message || 'Failed to load site content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = (sectionKey, fieldKey, value) => {
    setContent(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [fieldKey]: value },
    }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: 'store_content',
        value: content,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (error) throw error;
      setSavedAt(new Date());
      setDirty(false);
    } catch (err) {
      console.error('[SiteContent] save failed', err);
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const resetSection = (sectionKey) => {
    if (!window.confirm(`Reset all fields in "${sectionKey}" back to defaults?`)) return;
    setContent(prev => ({ ...prev, [sectionKey]: { ...DEFAULT_CONTENT[sectionKey] } }));
    setDirty(true);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#2c3e50' }}>
              🎨 Edit Website
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#7a8a98', fontSize: '14px' }}>
              Edit every text, color, and font on <a href={STORE_URL} target="_blank" rel="noreferrer" style={{ color: '#667eea', textDecoration: 'none' }}>{STORE_URL.replace('https://','')}</a>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {savedAt && !dirty && (
              <span style={{ color: '#48BB78', fontSize: '13px', fontWeight: '600' }}>
                ✅ Saved {savedAt.toLocaleTimeString()}
              </span>
            )}
            {dirty && (
              <span style={{ color: '#ED8936', fontSize: '13px', fontWeight: '600' }}>
                ● Unsaved changes
              </span>
            )}
            <a
              href={STORE_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '10px 18px',
                background: 'white',
                border: '1px solid #dfe4ea',
                borderRadius: '6px',
                color: '#2c3e50',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '13px',
              }}
            >
              👁 View site
            </a>
            <button
              onClick={save}
              disabled={saving || !dirty}
              style={{
                padding: '10px 22px',
                background: dirty ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#dfe4ea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (saving || !dirty) ? 'not-allowed' : 'pointer',
                fontWeight: '700',
                fontSize: '14px',
              }}
            >
              {saving ? '⏳ Saving…' : '💾 Save all changes'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', color: '#856404', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8a98a6' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {CONTENT_SCHEMA.map(section => {
            const sectionValue = content[section.key] || {};
            return (
              <div key={section.key} style={{
                background: 'white',
                borderRadius: '10px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: '700' }}>
                      {section.icon} {section.title}
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: '#8a98a6', fontSize: '13px' }}>{section.subtitle}</p>
                  </div>
                  <button
                    onClick={() => resetSection(section.key)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      border: '1px solid #dfe4ea',
                      borderRadius: '4px',
                      color: '#8a98a6',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    Reset section
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: section.key === 'brand' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                  {section.fields.map(field => {
                    const Renderer = FIELD_RENDERERS[field.type] || TextField;
                    return (
                      <Renderer
                        key={field.key}
                        field={field}
                        value={sectionValue[field.key]}
                        onChange={(v) => updateField(section.key, field.key, v)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky footer save bar */}
      {dirty && !loading && (
        <div style={{
          position: 'sticky',
          bottom: '20px',
          marginTop: '24px',
          background: 'linear-gradient(135deg, #2c3e50, #34495e)',
          borderRadius: '10px',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          color: 'white',
        }}>
          <span style={{ fontWeight: '600' }}>● You have unsaved changes</span>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #D4A853, #C49040)',
              color: '#2c3e50',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px',
            }}
          >
            {saving ? '⏳ Saving…' : '💾 Save all changes'}
          </button>
        </div>
      )}
    </div>
  );
}
