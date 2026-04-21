// =====================================================================
// SettingsPanel — Phase 5 right-panel Settings tab (spec § 4).
//
// Edits node-level metadata (tag, id, attributes, ARIA) — not styles.
// Styles belong to classes and are handled by StylePanel.
//
// Shipping this session: tag picker, ID, classes read-only, attributes
// key/value list, ARIA label/role, and tag-specific sections for
// <a> (href/target) and <img> (src/alt/loading).
//
// Deferred: visibility conditions (needs CMS collections), link-type
// picker (page/email/tel/file), embed raw HTML editor.
// =====================================================================

import React, { useState, useEffect } from 'react';
import { AssetPicker } from './WebsiteEditor.assets';
import { findCollectionAncestor, stringHasBinding } from '../utils/cmsBindings';
import { supabase } from '../utils/supabase';

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

// Shared dropdown style used by the Link + Image + Slider sections.
const selectStyle = {
  width: '100%', height: '22px',
  background: W.input, color: W.text,
  border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
  fontSize: '11px',
};

// Curated tag list — grouped so the picker isn't a wall of options.
// Kept in sync with mutations.SAFE_TAGS (subset).
const TAG_GROUPS = [
  { group: 'Layout', tags: ['div', 'section', 'header', 'nav', 'aside', 'main', 'article', 'footer'] },
  { group: 'Heading', tags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
  { group: 'Text',    tags: ['p', 'span', 'em', 'strong', 'small', 'blockquote', 'code', 'pre', 'label'] },
  { group: 'Media',   tags: ['img', 'video', 'iframe', 'picture'] },
  { group: 'List',    tags: ['ul', 'ol', 'li'] },
  { group: 'Link',    tags: ['a', 'button'] },
  { group: 'Form',    tags: ['form', 'input', 'textarea', 'select', 'option'] },
];

// ---------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------
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

function Row({ label, children, inline }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: inline ? '6px' : '8px',
      padding: '4px 0',
    }}>
      <span style={{ width: '64px', flexShrink: 0, color: W.textDim, fontSize: '11px' }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Text({ value, onChange, placeholder, mono = true }) {
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
        fontSize: '11px', fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
        outline: 'none',
      }}
    />
  );
}

// ---------------------------------------------------------------------
// Attributes key/value list
// ---------------------------------------------------------------------
function AttributesList({ attributes, onSet, onRename }) {
  const entries = Object.entries(attributes || {});
  // Filter out keys that live in dedicated rows so they don't show up
  // twice. The renderer still sees them because the list targets node.attributes directly.
  const managed = new Set([
    'id', 'href', 'target', 'rel',
    'src', 'alt', 'loading',
    'aria-label', 'role',
  ]);
  const extras = entries.filter(([k]) => !managed.has(k));

  const [draftKey, setDraftKey] = useState('');
  const [draftVal, setDraftVal] = useState('');
  const add = () => {
    const k = draftKey.trim();
    if (!k) return;
    if (managed.has(k)) return; // tell user to use the dedicated row
    onSet(k, draftVal);
    setDraftKey(''); setDraftVal('');
  };

  return (
    <div>
      {extras.length === 0 && (
        <div style={{ color: W.textFaint, fontSize: '11px', padding: '4px 0' }}>
          No custom attributes.
        </div>
      )}
      {extras.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: '4px', padding: '3px 0' }}>
          <input
            defaultValue={k}
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (next && next !== k) onRename(k, next);
            }}
            style={{
              flex: 1, minWidth: 0, height: '22px',
              padding: '0 5px',
              background: W.input, color: W.text,
              border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
              fontSize: '11px', fontFamily: 'ui-monospace, monospace',
            }}
          />
          <input
            value={v ?? ''}
            onChange={(e) => onSet(k, e.target.value)}
            style={{
              flex: 1.5, minWidth: 0, height: '22px',
              padding: '0 5px',
              background: W.input, color: W.text,
              border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
              fontSize: '11px', fontFamily: 'ui-monospace, monospace',
            }}
          />
          <button
            onClick={() => onSet(k, '')}
            title="Remove"
            style={{
              width: '22px', height: '22px', padding: 0,
              background: 'transparent', color: W.textDim,
              border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
              cursor: 'pointer',
            }}
          >×</button>
        </div>
      ))}
      {/* Add row */}
      <div style={{ display: 'flex', gap: '4px', padding: '6px 0 2px' }}>
        <input
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          placeholder="key"
          style={{
            flex: 1, minWidth: 0, height: '22px',
            padding: '0 5px',
            background: W.input, color: W.text,
            border: `1px dashed ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px', fontFamily: 'ui-monospace, monospace',
          }}
        />
        <input
          value={draftVal}
          onChange={(e) => setDraftVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="value"
          style={{
            flex: 1.5, minWidth: 0, height: '22px',
            padding: '0 5px',
            background: W.input, color: W.text,
            border: `1px dashed ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '11px', fontFamily: 'ui-monospace, monospace',
          }}
        />
        <button
          onClick={add}
          disabled={!draftKey.trim()}
          style={{
            width: '22px', height: '22px', padding: 0,
            background: W.accentDim, color: W.accent,
            border: `1px solid ${W.accent}`, borderRadius: '3px',
            cursor: 'pointer', fontWeight: 700,
          }}
        >+</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// SettingsPanel — entry point
// ---------------------------------------------------------------------
export default function SettingsPanel({
  node, pageId,
  onSetTag, onSetAttribute, onRenameAttribute,
  previewSliderId, onTogglePreviewSlider,
  tree, onSetTextContent,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!node) {
    return (
      <div style={{ padding: '24px 12px', color: W.textFaint, fontSize: '11px', textAlign: 'center' }}>
        Select an element on the canvas.
      </div>
    );
  }

  const attrs = node.attributes || {};
  const isLink   = node.tag === 'a';
  const isImage  = node.tag === 'img';
  const isSlider = node.tag === 'slider';
  const isPreviewing = previewSliderId && previewSliderId === node.id;

  // Phase I3 — surface the "Bind to CMS field" picker only when the
  // selection is inside a collection_list. Looking up the ancestor on
  // every render is fine; the walk is O(depth-to-node) and trees are
  // well under a few hundred nodes.
  const collectionAncestor = tree ? findCollectionAncestor(tree, node.id) : null;

  // Derived curated tag groups, plus the element's current tag pinned
  // to the top group if it's outside our curated list (rare — tolerated).
  const allCuratedTags = new Set(TAG_GROUPS.flatMap((g) => g.tags));
  const extraCurrent = !allCuratedTags.has(node.tag) ? node.tag : null;

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <Section title="Element">
        <Row label="Tag">
          <select
            value={node.tag}
            onChange={(e) => onSetTag(e.target.value)}
            style={{
              width: '100%', height: '24px',
              padding: '0 6px',
              background: W.input, color: W.text,
              border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
              fontSize: '11px', fontFamily: 'ui-monospace, monospace',
            }}
          >
            {extraCurrent && (
              <option value={extraCurrent}>{extraCurrent} (legacy)</option>
            )}
            {TAG_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.tags.map((t) => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            ))}
          </select>
        </Row>
        <Row label="ID">
          <Text
            value={attrs.id}
            onChange={(v) => onSetAttribute('id', v)}
            placeholder="my-unique-id"
          />
        </Row>
        <Row label="Classes">
          <div style={{
            minHeight: '24px', padding: '3px 6px',
            background: W.input, color: W.textDim,
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            fontSize: '10.5px', fontFamily: 'ui-monospace, monospace',
            display: 'flex', flexWrap: 'wrap', gap: '4px',
          }}>
            {(node.classes || []).length === 0 && (
              <span style={{ color: W.textFaint }}>— (edit in Style tab)</span>
            )}
            {(node.classes || []).map((c) => (
              <span key={c} style={{
                padding: '1px 6px', borderRadius: '2px',
                background: W.accentDim, color: W.accent,
              }}>{c}</span>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Accessibility">
        <Row label="Aria">
          <Text
            value={attrs['aria-label']}
            onChange={(v) => onSetAttribute('aria-label', v)}
            placeholder="e.g. Close menu"
            mono={false}
          />
        </Row>
        <Row label="Role">
          <Text
            value={attrs.role}
            onChange={(v) => onSetAttribute('role', v)}
            placeholder="e.g. button"
          />
        </Row>
        {!isImage && (
          // alt is only a legal attribute on <img> (and a few others).
          // Image's dedicated section has alt as a first-class row.
          <></>
        )}
      </Section>

      {isLink && (
        <Section title="Link">
          <Row label="URL">
            <Text
              value={attrs.href}
              onChange={(v) => onSetAttribute('href', v)}
              placeholder="https://… or /path"
            />
          </Row>
          <Row label="Target">
            <select
              value={attrs.target || ''}
              onChange={(e) => onSetAttribute('target', e.target.value)}
              style={{
                width: '100%', height: '22px',
                background: W.input, color: W.text,
                border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
                fontSize: '11px',
              }}
            >
              <option value="">Same window</option>
              <option value="_blank">New tab</option>
              <option value="_self">Self</option>
              <option value="_parent">Parent</option>
              <option value="_top">Top</option>
            </select>
          </Row>
          <Row label="Rel">
            <Text
              value={attrs.rel}
              onChange={(v) => onSetAttribute('rel', v)}
              placeholder="noopener, nofollow"
            />
          </Row>
        </Section>
      )}

      {isImage && (
        <Section title="Image">
          <Row label="Source">
            <Text
              value={attrs.src}
              onChange={(v) => onSetAttribute('src', v)}
              placeholder="https://…/photo.jpg"
            />
          </Row>
          <div style={{ padding: '2px 0 6px 72px' }}>
            <button
              onClick={() => setPickerOpen(true)}
              style={{
                padding: '4px 10px', fontSize: '10.5px', fontWeight: 600,
                background: W.accentDim, color: W.accent,
                border: `1px solid ${W.accent}`, borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              ▤ Replace from library
            </button>
          </div>
          <Row label="Alt">
            <Text
              value={attrs.alt}
              onChange={(v) => onSetAttribute('alt', v)}
              placeholder="Describe the image"
              mono={false}
            />
          </Row>
          <Row label="Loading">
            <select
              value={attrs.loading || ''}
              onChange={(e) => onSetAttribute('loading', e.target.value)}
              style={{
                width: '100%', height: '22px',
                background: W.input, color: W.text,
                border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
                fontSize: '11px',
              }}
            >
              <option value="">Auto</option>
              <option value="lazy">Lazy</option>
              <option value="eager">Eager</option>
            </select>
          </Row>
        </Section>
      )}

      <Section title="Attributes">
        <AttributesList
          attributes={attrs}
          onSet={onSetAttribute}
          onRename={onRenameAttribute}
        />
      </Section>

      <div style={{
        padding: '16px 12px', borderTop: `1px solid ${W.panelBorder}`,
        color: W.textFaint, fontSize: '10.5px', lineHeight: 1.5,
      }}>
        Visibility conditions and embed raw-HTML editor land alongside
        CMS collections in a later phase.
      </div>

      {isSlider && (
        <Section title="Slider">
          <Row label="Autoplay">
            <select
              value={String(attrs.autoplay ?? 'true')}
              onChange={(e) => onSetAttribute('autoplay', e.target.value)}
              style={selectStyle}
            >
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </Row>
          <Row label="Interval">
            <Text
              value={attrs.interval}
              onChange={(v) => onSetAttribute('interval', v)}
              placeholder="4500"
            />
          </Row>
          <Row label="Loop">
            <select
              value={String(attrs.loop ?? 'true')}
              onChange={(e) => onSetAttribute('loop', e.target.value)}
              style={selectStyle}
            >
              <option value="true">Wrap around</option>
              <option value="false">Stop at ends</option>
            </select>
          </Row>
          <Row label="Transition">
            <select
              value={attrs.transition || 'slide'}
              onChange={(e) => onSetAttribute('transition', e.target.value)}
              style={selectStyle}
            >
              <option value="slide">Slide</option>
              <option value="fade">Fade</option>
            </select>
          </Row>
          <Row label="Arrows">
            <select
              value={String(attrs.show_arrows ?? 'true')}
              onChange={(e) => onSetAttribute('show_arrows', e.target.value)}
              style={selectStyle}
            >
              <option value="true">Show</option>
              <option value="false">Hide</option>
            </select>
          </Row>
          <Row label="Dots">
            <select
              value={String(attrs.show_dots ?? 'true')}
              onChange={(e) => onSetAttribute('show_dots', e.target.value)}
              style={selectStyle}
            >
              <option value="true">Show</option>
              <option value="false">Hide</option>
            </select>
          </Row>
          <div style={{ padding: '6px 0 2px 72px' }}>
            <button
              onClick={() => onTogglePreviewSlider?.(node.id)}
              style={{
                padding: '4px 10px', fontSize: '10.5px', fontWeight: 600,
                background: isPreviewing ? W.accent : W.accentDim,
                color:      isPreviewing ? '#fff'   : W.accent,
                border: `1px solid ${W.accent}`, borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              {isPreviewing ? '◼ Stop preview' : '▶ Preview slider'}
            </button>
          </div>
        </Section>
      )}

      {collectionAncestor && (
        <BindingSection
          node={node}
          ancestor={collectionAncestor}
          onSetAttribute={onSetAttribute}
          onSetTextContent={onSetTextContent}
          isLink={isLink}
          isImage={isImage}
        />
      )}

      <AssetPicker
        open={pickerOpen}
        pageId={pageId}
        onClose={() => setPickerOpen(false)}
        onPick={(asset) => {
          if (!asset) return;
          onSetAttribute('src', asset.url);
          // Seed alt from the filename only when it's currently empty,
          // so the staff's custom caption isn't clobbered.
          if (!attrs.alt) {
            const base = (asset.name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
            if (base) onSetAttribute('alt', base);
          }
        }}
      />
    </div>
  );
}


// ---------------------------------------------------------------------
// BindingSection — Phase I3 "Bind to CMS field" picker
// ---------------------------------------------------------------------
// Shown only when the selected node is a descendant of a
// collection_list. Loads the ancestor collection's schema and offers
// one-click bind buttons that replace the leaf's textContent / src /
// alt / href with a `{{field}}` token.
function BindingSection({ node, ancestor, onSetAttribute, onSetTextContent, isLink, isImage }) {
  const slug = ancestor?.attributes?.collection_slug || '';
  const [fields, setFields] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!slug) { setFields([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('store_collections')
          .select('fields')
          .eq('slug', slug)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) setFields(Array.isArray(data?.fields) ? data.fields : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const attrs = node.attributes || {};
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const firstRun = (hasChildren && typeof children[0]?.text === 'string' && !children[0].tag) ? children[0] : null;
  const currentText = firstRun ? firstRun.text
                     : typeof node.textContent === 'string' ? node.textContent
                     : '';
  const isTextLeaf = !hasChildren || firstRun != null;
  const textBound = stringHasBinding(currentText);
  const srcBound  = stringHasBinding(attrs.src);
  const altBound  = stringHasBinding(attrs.alt);
  const hrefBound = stringHasBinding(attrs.href);

  const bindText = (fieldKey) => {
    if (!onSetTextContent) return;
    onSetTextContent(node.id, `{{${fieldKey}}}`);
  };
  const bindAttr = (attrKey, fieldKey) => onSetAttribute(attrKey, `{{${fieldKey}}}`);
  const unbindText = () => onSetTextContent?.(node.id, '');
  const unbindAttr = (attrKey) => onSetAttribute(attrKey, '');

  return (
    <Section title="Bind to CMS">
      <div style={{ color: W.textFaint, fontSize: '10.5px', marginBottom: '4px' }}>
        Inside collection <code style={{ color: W.accent }}>{slug || '(none)'}</code>.
        Tokens render as the item's field value on the storefront.
      </div>
      {err && (
        <div style={{ color: '#ff9a9a', fontSize: '10.5px', padding: '4px 0' }}>⚠ {err}</div>
      )}
      {fields.length === 0 && !err && (
        <div style={{ color: W.textFaint, fontSize: '10.5px', padding: '4px 0' }}>
          No fields defined yet — add some in the CMS panel.
        </div>
      )}
      {isTextLeaf && onSetTextContent && (
        <BindRow label="Text" bound={textBound} fields={fields}
          onPick={bindText} onUnbind={unbindText} />
      )}
      {isImage && (
        <>
          <BindRow label="Image src" bound={srcBound} fields={fields}
            onPick={(k) => bindAttr('src', k)} onUnbind={() => unbindAttr('src')} />
          <BindRow label="Alt text" bound={altBound} fields={fields}
            onPick={(k) => bindAttr('alt', k)} onUnbind={() => unbindAttr('alt')} />
        </>
      )}
      {isLink && (
        <BindRow label="Link href" bound={hrefBound} fields={fields}
          onPick={(k) => bindAttr('href', k)} onUnbind={() => unbindAttr('href')} />
      )}
    </Section>
  );
}

function BindRow({ label, bound, fields, onPick, onUnbind }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
      <span style={{ width: '72px', flexShrink: 0, color: W.textDim, fontSize: '11px' }}>
        {label}
      </span>
      <select
        value=""
        onChange={(e) => { if (e.target.value) onPick(e.target.value); }}
        style={{ ...selectStyle, flex: 1 }}
      >
        <option value="">{bound ? '✓ bound — replace…' : 'Select field…'}</option>
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label || f.key} ({f.type})
          </option>
        ))}
      </select>
      {bound && (
        <button
          onClick={onUnbind}
          title="Unbind (clear this field)"
          style={{
            width: '22px', height: '22px', padding: 0,
            background: 'transparent', color: '#ff9a9a',
            border: `1px solid ${W.inputBorder}`, borderRadius: '3px',
            cursor: 'pointer', fontSize: '12px', fontWeight: 700,
          }}
        >×</button>
      )}
    </div>
  );
}
