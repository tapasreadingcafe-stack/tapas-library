// =====================================================================
// LandingEditor
//
// Staff-facing form that writes to app_settings.landing_content. The
// storefront's LandingPage.js reads the same key, so edits here go
// live without a deploy.
//
// Keep intentionally spartan — not trying to be the full block editor,
// just the inputs needed to tune copy, stats, services, book titles,
// events, and footer links. Each section has a small "Reset to default"
// shortcut pulled from the shared DEFAULT_LANDING_CONTENT so staff can
// undo a run-away edit.
// =====================================================================
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

// Duplicate the defaults here so the staff bundle doesn't reach into
// the storefront app's imports (different React trees, different
// builds). Any schema change has to be mirrored in both files until
// we extract a shared package.
const LANDING_CONTENT_KEY = 'landing_content';

const DEFAULT = {
  hero: {
    tag: 'Reading room · Book club · Small plates',
    heading_lead: 'A quiet room for',
    heading_accent: 'big books',
    heading_middle: '&',
    heading_underlined: 'small plates.',
    copy: "Tapas Reading Cafe is a neighborhood library-cafe — borrow a book, order a plate, and stay as long as the chapter asks for. Weekly book clubs, silent reading hours, and a shelf that's always rotating.",
    primary_cta: 'Browse the library',
    primary_href: '/books',
    secondary_cta: 'See events',
    secondary_href: '#events',
    sticker_line1: 'Open today',
    sticker_line2: '10a – 11p',
    art_caption: 'library.jpg — our wall of books',
    stats: [
      { value: '2,400+', label: 'BOOKS ON SHELF' },
      { value: '6',      label: 'WEEKLY CLUBS' },
      { value: '312',    label: 'ACTIVE MEMBERS' },
    ],
  },
  marquee: 'Borrow a book · stay for a plate · join a club · read on the house',
  services: {
    kicker: 'Our Services',
    heading_lead: 'Everything a reader needs,',
    heading_accent: 'under one roof.',
    lede: 'Three ways to use the room: take a book home, borrow one for a week, or come read with a group. Coffee, wine, and tapas served throughout.',
    items: [
      { icon: 'Aa', title: 'Buying Books',        copy: 'A small, carefully-chosen shelf for purchase — new releases, small presses, and staff favorites. Always 10% off for members.', cta: 'Visit the shop',       href: '/books' },
      { icon: '↺',  title: 'Lending Library',     copy: 'Over 2,400 books you can borrow on the honor system. Take two home at a time, return within three weeks.',                       cta: 'Browse the library',   href: '/books' },
      { icon: '☕', title: 'Events & Book Clubs', copy: 'Six weekly clubs, poetry suppers, and silent reading Saturdays. Come once as a guest — decide later.',                              cta: 'See the calendar',     href: '#events' },
    ],
  },
  arrivals: {
    kicker: 'New on the shelf',
    heading_lead: "This week's",
    heading_accent: 'arrivals.',
    lede: "Freshly unpacked from the small-press boxes and the translators' stacks. Borrow for free, or take one home.",
    books: [
      { cover: 'cover-1', title: 'The Magic Mountain',   author: 'Thomas Mann',         badge: 'Slow Fiction' },
      { cover: 'cover-2', title: 'The Years',            author: 'Annie Ernaux',        badge: 'Memoir' },
      { cover: 'cover-3', title: 'Solenoid',             author: 'Mircea Cărtărescu',   badge: 'Translation' },
      { cover: 'cover-4', title: 'Bluets',               author: 'Maggie Nelson',       badge: 'Poetry' },
      { cover: 'cover-5', title: "A Room of One's Own",  author: 'Virginia Woolf',      badge: 'Essays' },
      { cover: 'cover-6', title: 'The Waves',            author: 'Virginia Woolf',      badge: 'Novel' },
      { cover: 'cover-2', title: 'Minor Detail',         author: 'Adania Shibli',       badge: 'Translation' },
      { cover: 'cover-1', title: 'Checkout 19',          author: 'Claire-Louise Bennett', badge: 'Novel' },
    ],
  },
  membership: {
    kicker: 'Pricing & Plans',
    heading_lead: 'Two ways to',
    heading_accent: 'pull up a chair.',
    lede: 'Drop in whenever you like — or become a member and unlock every club, a quarterly book, and 10% off the kitchen.',
    free: {
      kicker: 'Drop-in',
      title:  'The Reading Room',
      copy:   'Free to enter. Borrow one book at a time, read all afternoon. Buy a coffee or a plate if the mood strikes.',
      features: ['Lending library, honor system', 'Wi-Fi, quiet tables, long hours', 'One guest club visit per month'],
      price: 'Free',
      price_suffix: '',
      cta: 'Visit today',
      cta_href: '#visit',
    },
    paid: {
      kicker: 'Membership',
      title:  'The Chair',
      copy:   'A seat at every club, a book of your choice each quarter, 10% off the kitchen, and first dibs on supper events.',
      features: ['All six weekly book clubs', 'One book per quarter, on us', '10% off food, wine & coffee', 'Priority RSVP for supper events'],
      price: '$18',
      price_suffix: '/month',
      cta: 'Become a member',
      cta_href: '#join',
    },
  },
  events: {
    kicker: 'Upcoming Events',
    heading_lead: 'On the calendar',
    heading_accent: 'this season.',
    lede: 'Weekly clubs, translator evenings, poetry suppers, and the occasional quiet Saturday. All welcome, members first.',
    items: [
      { month: 'Apr', day: '23', title: 'Slow Fiction',         emph: 'Club',            copy: 'Opening pages of The Magic Mountain. Sherry & olives.',        tag: 'p', tag_text: 'Weekly · Thu 7p' },
      { month: 'Apr', day: '27', title: 'Translators &',        emph: 'Twilight',        copy: 'An evening with translator Margaret Jull Costa on Saramago.',   tag: 'o', tag_text: 'Guest · Mon 7:30p' },
      { month: 'May', day: '02', title: 'Saturday',             emph: 'Silent Reading',  copy: 'Two quiet hours, a pot of coffee, a plate of toast. No phones.', tag: 'l', tag_text: 'Weekly · Sat 10a' },
      { month: 'May', day: '08', title: 'Poetry on',            emph: 'Small Plates',    copy: 'A tasting menu paired to six poems. Lorca, Szymborska, Berry.',  tag: 'k', tag_text: 'Prix Fixe · Fri 8p' },
      { month: 'May', day: '15', title: 'First-Draft',          emph: 'Friday',          copy: 'One page of work-in-progress. Two minutes each, then we eat.',   tag: 'p', tag_text: 'Members · Fri 7p' },
      { month: 'May', day: '21', title: 'The',                  emph: 'Novella',         copy: 'Read a novella that afternoon; meet for dinner to discuss.',    tag: 'o', tag_text: 'Single Session · Thu 4p', title_suffix: 'Supper' },
    ],
  },
  testimonial: {
    quote: "I came in on a Tuesday for a coffee and ended up finishing my novel. Three months later I'm hosting the Silent Reading club. It is the ",
    emph: 'warmest quiet place',
    quote_after: " I've ever found.",
    author_initials: 'RK',
    author_name: 'Rukmini K.',
    author_role: 'Member since 2024 · Silent Reading host',
  },
  newsletter: {
    kicker: 'The Dispatch',
    heading_lead: 'A letter on',
    heading_emph: "what we're reading.",
    copy: "One email a month. This week's shelf, next week's clubs, and a paragraph we couldn't stop thinking about.",
    placeholder: 'your@email.com',
    button_label: 'Subscribe',
    success_label: 'Thanks — see you soon',
  },
  footer: {
    brand_name: 'Tapas reading cafe',
    brand_tagline: 'a small room for big books',
    brand_blurb: 'A neighborhood library-cafe serving small plates, natural wine, and six weekly book clubs.',
    visit_heading: 'Visit',
    visit_lines: ['14 Haven Street', 'Reading, MA 01867', 'Tue–Sun · 10a–11p'],
    read_heading: 'Read',
    read_links: [
      { label: 'Library',     href: '/books' },
      { label: 'Book Clubs',  href: '#events' },
      { label: 'The Journal', href: '/blog' },
      { label: 'Archive',     href: '#archive' },
    ],
    more_heading: 'More',
    more_links: [
      { label: 'Private Events', href: '#events' },
      { label: 'Gift Cards',     href: '#gift' },
      { label: 'Careers',        href: '#careers' },
      { label: 'Contact',        href: '#contact' },
    ],
    copyright: '© Tapas Reading Cafe · Reading, MA',
  },
};

// Small shared styles so the page feels consistent with the rest of
// the dashboard without pulling a UI library in.
const S = {
  page:       { padding: '24px 32px', maxWidth: '1040px', margin: '0 auto' },
  h1:         { fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: '#1a1a1a' },
  crumb:      { fontSize: '13px', color: '#64748b', marginBottom: '20px' },
  bar:        { position: 'sticky', top: 0, background: '#fff', padding: '12px 0', zIndex: 5, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  section:    { marginTop: '28px', padding: '18px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px' },
  sectionH:   { fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sectionSub: { fontSize: '12px', color: '#64748b', marginBottom: '16px' },
  field:      { display: 'block', marginBottom: '14px' },
  label:      { display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
  input:      { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#1a1a1a' },
  textarea:   { width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', minHeight: '80px', fontFamily: 'inherit', color: '#1a1a1a' },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  btn:        { padding: '8px 16px', background: '#146ef5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  btnGhost:   { padding: '6px 12px', background: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  btnDanger:  { padding: '6px 12px', background: 'transparent', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  addBtn:     { padding: '6px 12px', background: '#f1f5f9', color: '#1a1a1a', border: '1px dashed #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12.5px', marginTop: '8px' },
  listItem:   { padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e5e7eb' },
  listHead:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  listTitle:  { fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' },
};

function Field({ label, children }) {
  return (
    <label style={S.field}>
      <span style={S.label}>{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, ...rest }) {
  return <input style={S.input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

function TextArea({ value, onChange, rows = 3 }) {
  return <textarea style={{ ...S.textarea, minHeight: rows * 22 + 'px' }} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

// List editor for an array of objects. `fields` describes which sub-
// inputs to render per item. Single-string arrays (visit_lines etc.)
// go through StringListEditor below.
function ListEditor({ label, items, fields, onChange, defaultItem, itemLabel }) {
  const setItem = (i, patch) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i) => {
    const next = items.slice();
    next.splice(i, 1);
    onChange(next);
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => onChange([...(items || []), { ...(defaultItem || {}) }]);
  return (
    <div>
      <div style={S.label}>{label}</div>
      {(items || []).map((it, i) => (
        <div key={i} style={S.listItem}>
          <div style={S.listHead}>
            <span style={S.listTitle}>{itemLabel ? itemLabel(it, i) : `#${i + 1}`}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button type="button" style={S.btnGhost} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button type="button" style={S.btnGhost} onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button>
              <button type="button" style={S.btnDanger} onClick={() => remove(i)}>Remove</button>
            </div>
          </div>
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.multiline
                ? <TextArea value={it[f.key]} onChange={(v) => setItem(i, { [f.key]: v })} rows={f.rows || 2} />
                : <Input    value={it[f.key]} onChange={(v) => setItem(i, { [f.key]: v })} />}
            </Field>
          ))}
        </div>
      ))}
      <button type="button" style={S.addBtn} onClick={add}>+ Add</button>
    </div>
  );
}

function StringListEditor({ label, items, onChange }) {
  const set = (i, v) => {
    const next = items.slice(); next[i] = v; onChange(next);
  };
  const remove = (i) => {
    const next = items.slice(); next.splice(i, 1); onChange(next);
  };
  const add = () => onChange([...(items || []), '']);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={S.label}>{label}</div>
      {(items || []).map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
          <Input value={v} onChange={(nv) => set(i, nv)} />
          <button type="button" style={S.btnDanger} onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <button type="button" style={S.addBtn} onClick={add}>+ Add line</button>
    </div>
  );
}

function Section({ title, sub, onReset, children }) {
  return (
    <div style={S.section}>
      <h2 style={S.sectionH}>
        <span>{title}</span>
        {onReset && <button type="button" style={S.btnGhost} onClick={onReset}>Reset section</button>}
      </h2>
      {sub && <div style={S.sectionSub}>{sub}</div>}
      {children}
    </div>
  );
}

export default function LandingEditor() {
  const [state, setState] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', LANDING_CONTENT_KEY)
          .maybeSingle();
        if (error) throw error;
        if (data?.value) {
          // Shallow merge so a partially-saved row doesn't drop
          // sections that haven't been touched yet.
          const merged = { ...DEFAULT };
          for (const k of Object.keys(DEFAULT)) {
            if (data.value[k] && typeof data.value[k] === 'object' && !Array.isArray(data.value[k])) {
              merged[k] = { ...DEFAULT[k], ...data.value[k] };
            } else if (data.value[k] !== undefined) {
              merged[k] = data.value[k];
            }
          }
          setState(merged);
        }
      } catch (err) {
        setStatus(`Load failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async () => {
    setSaving(true); setStatus('');
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: LANDING_CONTENT_KEY,
        value: state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (error) throw error;
      setStatus('Saved — refresh the live site to see changes.');
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [state]);

  const setSection = (key, value) => setState((s) => ({ ...s, [key]: value }));
  const patchSection = (key, patch) => setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  const resetSection = (key) => setState((s) => ({ ...s, [key]: DEFAULT[key] }));

  if (loading) return <div style={S.page}>Loading…</div>;

  const hero = state.hero;
  const services = state.services;
  const arrivals = state.arrivals;
  const membership = state.membership;
  const events = state.events;
  const t = state.testimonial;
  const nl = state.newsletter;
  const f = state.footer;

  return (
    <div style={S.page}>
      <div style={S.bar}>
        <div>
          <h1 style={S.h1}>Landing Page</h1>
          <div style={S.crumb}>Edits the copy & cards on the homepage at tapasreadingcafe.com.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {status && <span style={{ fontSize: '12px', color: status.startsWith('Save') && !status.includes('failed') ? '#059669' : '#b91c1c' }}>{status}</span>}
          <button style={S.btn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {/* HERO */}
      <Section title="Hero" sub="The big headline, tagline, CTAs and stats at the top of the page." onReset={() => resetSection('hero')}>
        <Field label="Tag pill"><Input value={hero.tag} onChange={(v) => patchSection('hero', { tag: v })} /></Field>
        <div style={S.row2}>
          <Field label="Heading · lead"><Input value={hero.heading_lead} onChange={(v) => patchSection('hero', { heading_lead: v })} /></Field>
          <Field label="Heading · accent (purple italic)"><Input value={hero.heading_accent} onChange={(v) => patchSection('hero', { heading_accent: v })} /></Field>
          <Field label="Heading · connector"><Input value={hero.heading_middle} onChange={(v) => patchSection('hero', { heading_middle: v })} /></Field>
          <Field label="Heading · underlined"><Input value={hero.heading_underlined} onChange={(v) => patchSection('hero', { heading_underlined: v })} /></Field>
        </div>
        <Field label="Body copy"><TextArea value={hero.copy} onChange={(v) => patchSection('hero', { copy: v })} rows={4} /></Field>
        <div style={S.row2}>
          <Field label="Primary button"><Input value={hero.primary_cta} onChange={(v) => patchSection('hero', { primary_cta: v })} /></Field>
          <Field label="Primary link"><Input value={hero.primary_href} onChange={(v) => patchSection('hero', { primary_href: v })} /></Field>
          <Field label="Secondary button"><Input value={hero.secondary_cta} onChange={(v) => patchSection('hero', { secondary_cta: v })} /></Field>
          <Field label="Secondary link"><Input value={hero.secondary_href} onChange={(v) => patchSection('hero', { secondary_href: v })} /></Field>
        </div>
        <div style={S.row2}>
          <Field label="Sticker line 1"><Input value={hero.sticker_line1} onChange={(v) => patchSection('hero', { sticker_line1: v })} /></Field>
          <Field label="Sticker line 2"><Input value={hero.sticker_line2} onChange={(v) => patchSection('hero', { sticker_line2: v })} /></Field>
        </div>
        <Field label="Hero art caption"><Input value={hero.art_caption} onChange={(v) => patchSection('hero', { art_caption: v })} /></Field>
        <ListEditor
          label="Stats (shown below the buttons)"
          items={hero.stats}
          fields={[{ key: 'value', label: 'Value (big)' }, { key: 'label', label: 'Label' }]}
          defaultItem={{ value: '', label: '' }}
          itemLabel={(s) => s.value || 'Stat'}
          onChange={(next) => patchSection('hero', { stats: next })}
        />
      </Section>

      {/* MARQUEE */}
      <Section title="Marquee" sub="Scrolling phrases in the black strip. Separate with ·" onReset={() => setSection('marquee', DEFAULT.marquee)}>
        <Field label="Text"><Input value={state.marquee} onChange={(v) => setSection('marquee', v)} /></Field>
      </Section>

      {/* SERVICES */}
      <Section title="Services" sub="Three cards below the hero." onReset={() => resetSection('services')}>
        <div style={S.row2}>
          <Field label="Kicker"><Input value={services.kicker} onChange={(v) => patchSection('services', { kicker: v })} /></Field>
          <Field label="Heading · lead"><Input value={services.heading_lead} onChange={(v) => patchSection('services', { heading_lead: v })} /></Field>
          <Field label="Heading · accent"><Input value={services.heading_accent} onChange={(v) => patchSection('services', { heading_accent: v })} /></Field>
        </div>
        <Field label="Lede"><TextArea value={services.lede} onChange={(v) => patchSection('services', { lede: v })} /></Field>
        <ListEditor
          label="Cards"
          items={services.items}
          fields={[
            { key: 'icon',  label: 'Icon glyph' },
            { key: 'title', label: 'Title' },
            { key: 'copy',  label: 'Body',   multiline: true, rows: 3 },
            { key: 'cta',   label: 'Link label' },
            { key: 'href',  label: 'Link URL' },
          ]}
          defaultItem={{ icon: '•', title: '', copy: '', cta: '', href: '#' }}
          itemLabel={(c) => c.title || 'Card'}
          onChange={(next) => patchSection('services', { items: next })}
        />
      </Section>

      {/* ARRIVALS */}
      <Section title="New arrivals" sub="Book grid below services." onReset={() => resetSection('arrivals')}>
        <div style={S.row2}>
          <Field label="Kicker"><Input value={arrivals.kicker} onChange={(v) => patchSection('arrivals', { kicker: v })} /></Field>
          <Field label="Heading · lead"><Input value={arrivals.heading_lead} onChange={(v) => patchSection('arrivals', { heading_lead: v })} /></Field>
          <Field label="Heading · accent"><Input value={arrivals.heading_accent} onChange={(v) => patchSection('arrivals', { heading_accent: v })} /></Field>
        </div>
        <Field label="Lede"><TextArea value={arrivals.lede} onChange={(v) => patchSection('arrivals', { lede: v })} /></Field>
        <ListEditor
          label="Books"
          items={arrivals.books}
          fields={[
            { key: 'title',  label: 'Title' },
            { key: 'author', label: 'Author' },
            { key: 'badge',  label: 'Badge' },
            { key: 'cover',  label: 'Cover style (cover-1 … cover-6)' },
          ]}
          defaultItem={{ title: '', author: '', badge: '', cover: 'cover-1' }}
          itemLabel={(b) => b.title || 'Book'}
          onChange={(next) => patchSection('arrivals', { books: next })}
        />
      </Section>

      {/* MEMBERSHIP */}
      <Section title="Membership" sub="Two pricing panels." onReset={() => resetSection('membership')}>
        <div style={S.row2}>
          <Field label="Kicker"><Input value={membership.kicker} onChange={(v) => patchSection('membership', { kicker: v })} /></Field>
          <Field label="Heading · lead"><Input value={membership.heading_lead} onChange={(v) => patchSection('membership', { heading_lead: v })} /></Field>
          <Field label="Heading · accent"><Input value={membership.heading_accent} onChange={(v) => patchSection('membership', { heading_accent: v })} /></Field>
        </div>
        <Field label="Lede"><TextArea value={membership.lede} onChange={(v) => patchSection('membership', { lede: v })} /></Field>

        {['free', 'paid'].map((key) => {
          const plan = membership[key];
          return (
            <div key={key} style={{ ...S.listItem, background: key === 'paid' ? '#1a1a1a08' : '#c9f27f15' }}>
              <div style={S.listTitle}>{key === 'free' ? 'Left panel (lime)' : 'Right panel (ink)'}</div>
              <div style={S.row2}>
                <Field label="Kicker"><Input value={plan.kicker} onChange={(v) => patchSection('membership', { [key]: { ...plan, kicker: v } })} /></Field>
                <Field label="Title"><Input value={plan.title}  onChange={(v) => patchSection('membership', { [key]: { ...plan, title: v } })} /></Field>
              </div>
              <Field label="Copy"><TextArea value={plan.copy} onChange={(v) => patchSection('membership', { [key]: { ...plan, copy: v } })} /></Field>
              <StringListEditor
                label="Features"
                items={plan.features}
                onChange={(next) => patchSection('membership', { [key]: { ...plan, features: next } })}
              />
              <div style={S.row2}>
                <Field label="Price"><Input value={plan.price} onChange={(v) => patchSection('membership', { [key]: { ...plan, price: v } })} /></Field>
                <Field label="Price suffix (e.g. /month)"><Input value={plan.price_suffix} onChange={(v) => patchSection('membership', { [key]: { ...plan, price_suffix: v } })} /></Field>
                <Field label="CTA label"><Input value={plan.cta}       onChange={(v) => patchSection('membership', { [key]: { ...plan, cta: v } })} /></Field>
                <Field label="CTA link"><Input  value={plan.cta_href}  onChange={(v) => patchSection('membership', { [key]: { ...plan, cta_href: v } })} /></Field>
              </div>
            </div>
          );
        })}
      </Section>

      {/* EVENTS */}
      <Section title="Events calendar" sub="Rows in the events list." onReset={() => resetSection('events')}>
        <div style={S.row2}>
          <Field label="Kicker"><Input value={events.kicker} onChange={(v) => patchSection('events', { kicker: v })} /></Field>
          <Field label="Heading · lead"><Input value={events.heading_lead} onChange={(v) => patchSection('events', { heading_lead: v })} /></Field>
          <Field label="Heading · accent"><Input value={events.heading_accent} onChange={(v) => patchSection('events', { heading_accent: v })} /></Field>
        </div>
        <Field label="Lede"><TextArea value={events.lede} onChange={(v) => patchSection('events', { lede: v })} /></Field>
        <ListEditor
          label="Events"
          items={events.items}
          fields={[
            { key: 'month',        label: 'Month (e.g. Apr)' },
            { key: 'day',          label: 'Day (e.g. 23)' },
            { key: 'title',        label: 'Title' },
            { key: 'emph',         label: 'Emphasised (purple italic)' },
            { key: 'title_suffix', label: 'After-emph suffix (optional)' },
            { key: 'copy',         label: 'Description', multiline: true, rows: 2 },
            { key: 'tag',          label: 'Tag colour (p / o / l / k)' },
            { key: 'tag_text',     label: 'Tag label' },
          ]}
          defaultItem={{ month: '', day: '', title: '', emph: '', copy: '', tag: 'p', tag_text: '' }}
          itemLabel={(e) => `${e.month} ${e.day} — ${e.title} ${e.emph}`}
          onChange={(next) => patchSection('events', { items: next })}
        />
      </Section>

      {/* TESTIMONIAL */}
      <Section title="Testimonial" sub="Orange quote block." onReset={() => resetSection('testimonial')}>
        <Field label="Quote (before emph)"><TextArea value={t.quote} onChange={(v) => patchSection('testimonial', { quote: v })} rows={3} /></Field>
        <Field label="Emph (italic)"><Input value={t.emph} onChange={(v) => patchSection('testimonial', { emph: v })} /></Field>
        <Field label="Quote (after emph)"><Input value={t.quote_after} onChange={(v) => patchSection('testimonial', { quote_after: v })} /></Field>
        <div style={S.row2}>
          <Field label="Author initials"><Input value={t.author_initials} onChange={(v) => patchSection('testimonial', { author_initials: v })} /></Field>
          <Field label="Author name"><Input value={t.author_name} onChange={(v) => patchSection('testimonial', { author_name: v })} /></Field>
        </div>
        <Field label="Author role"><Input value={t.author_role} onChange={(v) => patchSection('testimonial', { author_role: v })} /></Field>
      </Section>

      {/* NEWSLETTER */}
      <Section title="Newsletter" sub="Dark 'Dispatch' block." onReset={() => resetSection('newsletter')}>
        <div style={S.row2}>
          <Field label="Kicker"><Input value={nl.kicker} onChange={(v) => patchSection('newsletter', { kicker: v })} /></Field>
          <Field label="Heading · lead"><Input value={nl.heading_lead} onChange={(v) => patchSection('newsletter', { heading_lead: v })} /></Field>
          <Field label="Heading · emph (lime italic)"><Input value={nl.heading_emph} onChange={(v) => patchSection('newsletter', { heading_emph: v })} /></Field>
        </div>
        <Field label="Copy"><TextArea value={nl.copy} onChange={(v) => patchSection('newsletter', { copy: v })} /></Field>
        <div style={S.row2}>
          <Field label="Placeholder"><Input value={nl.placeholder} onChange={(v) => patchSection('newsletter', { placeholder: v })} /></Field>
          <Field label="Button label"><Input value={nl.button_label} onChange={(v) => patchSection('newsletter', { button_label: v })} /></Field>
          <Field label="Success label"><Input value={nl.success_label} onChange={(v) => patchSection('newsletter', { success_label: v })} /></Field>
        </div>
      </Section>

      {/* FOOTER */}
      <Section title="Footer" sub="Columns at the bottom of the page." onReset={() => resetSection('footer')}>
        <div style={S.row2}>
          <Field label="Brand name"><Input value={f.brand_name} onChange={(v) => patchSection('footer', { brand_name: v })} /></Field>
          <Field label="Brand tagline"><Input value={f.brand_tagline} onChange={(v) => patchSection('footer', { brand_tagline: v })} /></Field>
        </div>
        <Field label="Brand blurb"><TextArea value={f.brand_blurb} onChange={(v) => patchSection('footer', { brand_blurb: v })} /></Field>
        <Field label="Visit heading"><Input value={f.visit_heading} onChange={(v) => patchSection('footer', { visit_heading: v })} /></Field>
        <StringListEditor
          label="Visit lines"
          items={f.visit_lines}
          onChange={(next) => patchSection('footer', { visit_lines: next })}
        />
        <Field label="Read heading"><Input value={f.read_heading} onChange={(v) => patchSection('footer', { read_heading: v })} /></Field>
        <ListEditor
          label="Read links"
          items={f.read_links}
          fields={[{ key: 'label', label: 'Label' }, { key: 'href', label: 'URL' }]}
          defaultItem={{ label: '', href: '' }}
          itemLabel={(l) => l.label || 'Link'}
          onChange={(next) => patchSection('footer', { read_links: next })}
        />
        <Field label="More heading"><Input value={f.more_heading} onChange={(v) => patchSection('footer', { more_heading: v })} /></Field>
        <ListEditor
          label="More links"
          items={f.more_links}
          fields={[{ key: 'label', label: 'Label' }, { key: 'href', label: 'URL' }]}
          defaultItem={{ label: '', href: '' }}
          itemLabel={(l) => l.label || 'Link'}
          onChange={(next) => patchSection('footer', { more_links: next })}
        />
        <Field label="Copyright"><Input value={f.copyright} onChange={(v) => patchSection('footer', { copyright: v })} /></Field>
      </Section>

      <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingBottom: '60px' }}>
        {status && <span style={{ fontSize: '12px', alignSelf: 'center', color: status.startsWith('Save') && !status.includes('failed') ? '#059669' : '#b91c1c' }}>{status}</span>}
        <button style={S.btn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  );
}
