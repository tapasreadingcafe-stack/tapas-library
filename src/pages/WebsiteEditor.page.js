// =====================================================================
// PagePanel — right-panel "Page" tab. Lane A / item 3.
//
// Edits page-level fields that don't belong to any single element:
// SEO (title, description, OG image), canonical URL, robots:noindex.
// A Google search snippet + social card preview mirror what visitors
// will see so staff can iterate copy without opening a separate tool.
//
// All writes go through onUpdateMeta which routes to updatePageMeta
// via applyEdit, so changes hit the undo stack and autosave the same
// as element-level mutations.
// =====================================================================

import React from 'react';

const W = {
  panelBorder: '#2a2a2a',
  text:        '#e5e5e5',
  textDim:     '#a0a0a0',
  textFaint:   '#6a6a6a',
  accent:      '#146ef5',
  accentDim:   '#146ef522',
  input:       '#1a1a1a',
  inputBorder: '#3a3a3a',
  labelSize:   '11px',
  labelLetter: '0.05em',
};

// Character caps Google typically truncates at. Numbers are
// conventional — we only use them to color the counter, never
// to hard-stop typing.
const TITLE_SOFT_LIMIT = 60;
const DESC_SOFT_LIMIT  = 160;

function Section({ title, children }) {
  return (
    <div style={{ borderTop: `1px solid ${W.panelBorder}` }}>
      <div style={{
        padding: '10px 12px 4px',
        color: W.textDim, fontSize: W.labelSize, fontWeight: 700,
        letterSpacing: W.labelLetter, textTransform: 'uppercase',
      }}>{title}</div>
      <div style={{ padding: '0 12px 10px' }}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '3px',
      }}>
        <span style={{ color: W.textDim, fontSize: '11px' }}>{label}</span>
        {hint && <span style={{ color: W.textFaint, fontSize: '10px' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', height: '24px',
        padding: '0 6px',
        background: W.input, color: W.text,
        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'ui-monospace, monospace',
        outline: 'none',
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', padding: '6px',
        background: W.input, color: W.text,
        border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
        fontSize: '11px', fontFamily: 'inherit',
        outline: 'none', resize: 'vertical',
      }}
    />
  );
}

function CountChip({ value, limit }) {
  const len = (value || '').length;
  const over = len > limit;
  const warn = len > limit * 0.9 && !over;
  const color = over ? '#ff6b6b' : warn ? '#f5a623' : W.textFaint;
  return (
    <span style={{ color, fontSize: '10px', fontFamily: 'ui-monospace, monospace' }}>
      {len} / {limit}
    </span>
  );
}

// Google SERP preview — intentionally styled to approximate what the
// search result actually looks like. Truncates to soft limits with an
// ellipsis so staff see the practical cut-off.
function GooglePreview({ title, description, siteUrl, slug }) {
  const shown = (s, limit) => {
    const v = (s || '').trim();
    if (!v) return '';
    return v.length > limit ? v.slice(0, limit - 1).trimEnd() + '…' : v;
  };
  const host = (siteUrl || 'yourdomain.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const crumbPath = (slug || '/').split('/').filter(Boolean).join(' › ');
  return (
    <div style={{
      padding: '10px 12px', margin: '4px 12px 10px',
      background: '#fff', color: '#202124',
      borderRadius: '6px',
      fontFamily: 'arial, sans-serif',
    }}>
      <div style={{ fontSize: '12px', lineHeight: 1.3 }}>
        <span style={{ color: '#202124' }}>{host}</span>
        {crumbPath && <span style={{ color: '#5f6368' }}> › {crumbPath}</span>}
      </div>
      <div style={{
        fontSize: '18px', lineHeight: 1.3, color: '#1a0dab',
        marginTop: '2px', fontWeight: 400,
      }}>
        {shown(title, TITLE_SOFT_LIMIT) || 'Untitled page'}
      </div>
      <div style={{
        fontSize: '13px', lineHeight: 1.45, color: '#4d5156',
        marginTop: '4px',
      }}>
        {shown(description, DESC_SOFT_LIMIT) || 'No description yet — search engines will use a page excerpt.'}
      </div>
    </div>
  );
}

// OG / Twitter card preview — rectangular, image on top, title +
// description below. Mirrors the Slack / Facebook / iMessage unfurl
// well enough that staff can judge the image + copy together.
function SocialPreview({ title, description, ogImage, siteUrl }) {
  const host = (siteUrl || 'yourdomain.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <div style={{
      margin: '4px 12px 10px',
      background: '#1a1a1a',
      border: `1px solid ${W.inputBorder}`,
      borderRadius: '6px',
      overflow: 'hidden',
    }}>
      {ogImage ? (
        <img
          src={ogImage}
          alt=""
          style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block', background: '#2a2a2a' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div style={{
          height: '120px', background: '#2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: W.textFaint, fontSize: '10.5px',
        }}>
          No OG image set (1200×630 recommended)
        </div>
      )}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: '10px', color: W.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {host}
        </div>
        <div style={{ color: W.text, fontSize: '13px', fontWeight: 600, marginTop: '2px', lineHeight: 1.3 }}>
          {title || 'Untitled page'}
        </div>
        <div style={{ color: W.textDim, fontSize: '11px', marginTop: '3px', lineHeight: 1.4 }}>
          {description || ''}
        </div>
      </div>
    </div>
  );
}

export default function PagePanel({ page, pageKey, siteUrl, onUpdateMeta }) {
  if (!page) {
    return (
      <div style={{ padding: '24px 12px', color: W.textFaint, fontSize: '11px', textAlign: 'center' }}>
        No page loaded.
      </div>
    );
  }
  const meta = page.meta || {};
  const slug = page.slug || '/';
  const update = (patch) => onUpdateMeta?.(patch);

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <Section title="Page">
        <Field label="Slug" hint={<code style={{ fontFamily: 'ui-monospace, monospace' }}>{slug}</code>}>
          {/* Slug edit is intentionally read-only in this pass —
              changing a live slug invalidates inbound links and belongs
              behind a "Move page" flow with a proper warning. */}
          <div style={{ color: W.textFaint, fontSize: '10.5px' }}>
            Edit in the Page settings dialog (coming next).
          </div>
        </Field>
      </Section>

      <Section title="SEO">
        <Field label="Title" hint={<CountChip value={meta.title} limit={TITLE_SOFT_LIMIT} />}>
          <TextInput
            value={meta.title}
            onChange={(v) => update({ title: v })}
            placeholder="Summer Sale — 30% off"
          />
        </Field>
        <Field label="Description" hint={<CountChip value={meta.description} limit={DESC_SOFT_LIMIT} />}>
          <TextArea
            value={meta.description}
            onChange={(v) => update({ description: v })}
            placeholder="One or two sentences shown in search results."
            rows={3}
          />
        </Field>
        <Field label="OG image">
          <TextInput
            value={meta.og_image}
            onChange={(v) => update({ og_image: v })}
            placeholder="https://…/og.jpg (1200×630)"
          />
        </Field>
        <Field label="Canonical URL">
          <TextInput
            value={meta.canonical_url}
            onChange={(v) => update({ canonical_url: v })}
            placeholder={`${siteUrl || ''}${slug}`}
          />
        </Field>
        <Field label="Index">
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: W.text, fontSize: '11px', cursor: 'pointer',
            padding: '4px 0',
          }}>
            <input
              type="checkbox"
              checked={!!meta.robots_noindex}
              onChange={(e) => update({ robots_noindex: e.target.checked || '' })}
            />
            <span>Hide this page from search engines</span>
          </label>
        </Field>
      </Section>

      <Section title="Google preview">
        <div style={{ margin: '0 -12px' }}>
          <GooglePreview
            title={meta.title}
            description={meta.description}
            siteUrl={siteUrl}
            slug={slug}
          />
        </div>
      </Section>

      <Section title="Social preview">
        <div style={{ margin: '0 -12px' }}>
          <SocialPreview
            title={meta.title}
            description={meta.description}
            ogImage={meta.og_image}
            siteUrl={siteUrl}
          />
        </div>
      </Section>
    </div>
  );
}
