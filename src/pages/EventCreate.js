import React, { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';
import { uploadAsset } from '../utils/assetLibrary';

export default function EventCreate() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isReadOnly, canManageEvents } = usePermission();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = React.useRef(null);
  // The payment columns arrive with 20260827_event_payments.sql. Probe once so
  // the section can explain itself instead of failing the save on a column
  // that doesn't exist yet.
  const [paymentColsReady, setPaymentColsReady] = useState(true);
  const [tierColsReady, setTierColsReady] = useState(true);
  React.useEffect(() => {
    supabase.from('events').select('payment_qr_url').limit(1)
      .then(({ error }) => setPaymentColsReady(!error));
    supabase.from('events').select('ticket_tiers').limit(1)
      .then(({ error }) => setTierColsReady(!error));
  }, []);

  // ── Ticket options ─────────────────────────────────────────────────────────
  const addTier    = () => setForm(f => ({ ...f, ticket_tiers: [...(f.ticket_tiers || []), { label: '', price: '' }] }));
  const removeTier = (i) => setForm(f => ({ ...f, ticket_tiers: f.ticket_tiers.filter((_, x) => x !== i) }));
  const setTier    = (i, k, v) => setForm(f => ({
    ...f, ticket_tiers: f.ticket_tiers.map((t, x) => x === i ? { ...t, [k]: v } : t),
  }));
  const [customCat, setCustomCat] = useState(false);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'one_time', recurrence_rule: '',
    start_date: '', end_date: '', start_time: '', end_time: '',
    location: 'Tapas Reading Cafe', is_paid: false, ticket_price: 0,
    capacity: '', waitlist_enabled: false, image_url: '', status: 'upcoming',
    // Payment (20260827_event_payments.sql)
    payment_qr_url: '', payment_link: '', payment_note: '', payment_proof_enabled: false,
    ticket_tiers: [],
    // CMS display fields — drive how the event appears on the customer site.
    slug: '', italic_accent: '',
    category: 'book-club', badge: '', cta_type: 'rsvp', chip_color: 'lavender',
    hosts: [],
  });

  React.useEffect(() => {
    if (editId) {
      supabase.from('events').select('*').eq('id', editId).single().then(({ data }) => {
        if (data) setForm({
          title: data.title || '', description: data.description || '', event_type: data.event_type || 'one_time',
          recurrence_rule: data.recurrence_rule || '', start_date: data.start_date || '', end_date: data.end_date || '',
          start_time: data.start_time?.slice(0, 5) || '', end_time: data.end_time?.slice(0, 5) || '',
          location: data.location || '', is_paid: data.is_paid || false, ticket_price: data.ticket_price || 0,
          capacity: data.capacity || '', waitlist_enabled: data.waitlist_enabled || false,
          image_url: data.image_url || '', status: data.status || 'upcoming',
          payment_qr_url: data.payment_qr_url || '', payment_link: data.payment_link || '',
          payment_note: data.payment_note || '', payment_proof_enabled: data.payment_proof_enabled || false,
          ticket_tiers: Array.isArray(data.ticket_tiers) ? data.ticket_tiers.map(t => ({ label: t.label || '', price: t.price ?? '' })) : [],
          slug: data.slug || '', italic_accent: data.italic_accent || '',
          category: data.category || 'book-club', badge: data.badge || '',
          cta_type: data.cta_type || 'rsvp', chip_color: data.chip_color || 'lavender',
          hosts: Array.isArray(data.hosts) && data.hosts.length
            ? data.hosts.map(h => ({ name: h.name || '', url: h.url || '' }))
            : (data.host_name ? [{ name: data.host_name, url: data.host_url || '' }] : []),
        });
        setLoaded(true);
      });
    }
  }, [editId]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const setHost = (i, key, val) => setForm(prev => ({ ...prev, hosts: prev.hosts.map((h, idx) => idx === i ? { ...h, [key]: val } : h) }));
  const addHost = () => setForm(prev => ({ ...prev, hosts: [...prev.hosts, { name: '', url: '' }] }));
  const removeHost = (i) => setForm(prev => ({ ...prev, hosts: prev.hosts.filter((_, idx) => idx !== i) }));

  const slugify = (s) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

  // Downscale to max 1200px / re-encode as JPEG before upload so we don't
  // push multi-MB phone photos to the image host (and so covers load fast on
  // the storefront event page). Falls back to the original file on decode
  // trouble (e.g. HEIC) rather than hanging.
  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const done = (result) => { URL.revokeObjectURL(url); resolve(result); };
    const timer = setTimeout(() => done(file), 10000);
    img.onload = () => {
      clearTimeout(timer);
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => done(blob || file), 'image/jpeg', 0.85);
    };
    img.onerror = () => { clearTimeout(timer); done(file); };
    img.src = url;
  });

  // QR images are line art — compressing them to JPEG would soften the
  // modules and can make a code unreadable, so the original file is uploaded
  // as-is. They're small by nature.
  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('QR image is too large (max 8 MB)');
      if (qrInputRef.current) qrInputRef.current.value = '';
      return;
    }
    setUploadingQr(true);
    try {
      const asset = await uploadAsset(file, { pageId: 'event-payments' });
      set('payment_qr_url', asset.url);
      toast.success('QR uploaded');
    } catch (err) {
      toast.error('QR upload failed: ' + (err.message || err));
    } finally {
      setUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = '';
    }
  };

  // Compress, then upload to Supabase Storage (via assetLibrary) and store
  // the returned public URL in image_url. Uses the same bucket as the CMS
  // editor — no external image host / API key involved.
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const blob = await compressImage(file);
      const named = blob instanceof File ? blob : new File([blob], 'event.jpg', { type: blob.type || 'image/jpeg' });
      const asset = await uploadAsset(named, { pageId: 'events' });
      set('image_url', asset.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Image upload failed: ' + (err.message || err));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.start_date) return toast.warning('Title and start date are required');
    setSaving(true);
    try {
      // Auto-generate a unique-ish slug from the title for new events when
      // staff didn't provide one. Slug must be unique across the events
      // table — we suffix the start_date to keep collisions rare without
      // pulling a uuid library into the dashboard bundle.
      const finalSlug = form.slug.trim() || `${slugify(form.title)}-${form.start_date}`;
      // Empty <input type=date/time> and unset selects come through as ''.
      // Postgres rejects '' for date/time columns and sinks the whole row,
      // so coerce optional blanks to null.
      const orNull = (v) => (v === '' || v === undefined ? null : v);
      const payload = {
        ...form,
        slug: finalSlug,
        // Category can be a preset or a free-form custom value; trim it and
        // fall back to a default if the custom box was left blank.
        category: (form.category || '').trim() || 'book-club',
        // Empty string from the optional badge select means "no badge".
        badge: form.badge || null,
        italic_accent: form.italic_accent || null,
        image_url: form.image_url || null,
        end_date: orNull(form.end_date),
        start_time: orNull(form.start_time),
        end_time: orNull(form.end_time),
        recurrence_rule: orNull(form.recurrence_rule),
        ticket_price: parseFloat(form.ticket_price) || 0,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        updated_at: new Date().toISOString(),
      };
      // Hosts come from 20260806_event_hosts.sql. Drop blank rows and only send
      // when there's at least one named host, so events still save before that
      // migration is applied (a value against a missing column surfaces via the
      // toast below). The storefront reads `hosts` first, then the legacy
      // host_name/host_url, so we no longer write those here.
      const cleanHosts = form.hosts
        .map(h => ({ name: (h.name || '').trim(), url: (h.url || '').trim() }))
        .filter(h => h.name);
      delete payload.host_name;
      delete payload.host_url;
      if (cleanHosts.length) payload.hosts = cleanHosts; else delete payload.hosts;
      // Same guard as hosts above: without the payment migration these columns
      // don't exist, and sending them would fail the whole save.
      if (tierColsReady) {
        // Drop half-filled rows. The single ticket_price is kept in step with
        // the cheapest option so cards and lists can still show a "from" price.
        const tiers = (form.ticket_tiers || [])
          .map(t => ({ label: (t.label || '').trim(), price: parseFloat(t.price) || 0 }))
          .filter(t => t.label);
        payload.ticket_tiers = tiers;
        if (tiers.length) payload.ticket_price = Math.min(...tiers.map(t => t.price));
      } else {
        delete payload.ticket_tiers;
      }
      if (paymentColsReady) {
        payload.payment_qr_url = form.payment_qr_url || null;
        payload.payment_link = form.payment_link || null;
        payload.payment_note = form.payment_note || null;
        payload.payment_proof_enabled = !!form.payment_proof_enabled;
      } else {
        delete payload.payment_qr_url;
        delete payload.payment_link;
        delete payload.payment_note;
        delete payload.payment_proof_enabled;
      }
      const { error } = editId
        ? await supabase.from('events').update(payload).eq('id', editId)
        : await supabase.from('events').insert([payload]);
      if (error) throw error;
      toast.success(editId ? 'Event updated' : 'Event created');
      navigate('/events');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
    setSaving(false);
  };

  if (!loaded) return <p style={{ padding: '20px', color: '#999' }}>Loading...</p>;

  return (
    <div className="ec-page">
      {isReadOnly && <ViewOnlyBanner />}
      <style>{`
        .ec-page { padding: 24px 20px 40px; background: #f4f6f5; }
        .ec-wrap { max-width: 760px; margin: 0 auto; }
        .ec-head { margin-bottom: 22px; }
        .ec-head h1 { font-size: 26px; font-weight: 700; color: #111827; margin: 0 0 4px; }
        .ec-head p { margin: 0; font-size: 14px; color: #6b7280; }

        .ec-card { background: #fff; border: 1px solid #eceef1; border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); }
        .ec-card-title { font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 16px; }

        .ec-field { margin-bottom: 16px; }
        .ec-field:last-child { margin-bottom: 0; }
        .ec-field > label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .ec-req { color: #e0004f; }
        .ec-opt { color: #9aa0a6; font-weight: 400; }
        .ec-field input, .ec-field select, .ec-field textarea {
          width: 100%; padding: 11px 13px; border: 1px solid #dfe3e8; border-radius: 9px;
          font-size: 14.5px; font-family: inherit; color: #111827; background: #fff; box-sizing: border-box;
          transition: border-color 140ms, box-shadow 140ms; }
        .ec-field input:focus, .ec-field select:focus, .ec-field textarea:focus {
          outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.14); }
        .ec-field textarea { resize: vertical; min-height: 92px; }
        .ec-field input:disabled, .ec-field select:disabled, .ec-field textarea:disabled { background: #f5f6f7; color: #9aa0a6; }
        .ec-hint { font-size: 12px; color: #8a9099; margin: 6px 0 0; line-height: 1.45; }
        .ec-linkbtn { display: inline-block; margin-top: 8px; background: none; border: 0; padding: 0; color: #667eea; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .ec-linkbtn:hover { text-decoration: underline; }

        .ec-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .ec-check { display: flex; align-items: center; gap: 11px; padding: 13px 15px; border: 1px solid #eceef1; border-radius: 10px; background: #fafbfc; cursor: pointer; font-size: 14.5px; color: #374151; }
        .ec-check + .ec-check { margin-top: 10px; }
        .ec-check input { width: 18px; height: 18px; accent-color: #667eea; cursor: pointer; flex-shrink: 0; }

        .ec-note { font-size: 13px; color: #6b7280; margin: 0 0 16px; line-height: 1.5; }

        /* Hosts (repeatable) */
        .ec-host-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
        .ec-host-row input { width: auto; min-width: 0; padding: 10px 12px; }
        .ec-host-name-input { flex: 1 1 40%; }
        .ec-host-url-input { flex: 1 1 56%; }
        .ec-host-remove { flex-shrink: 0; width: 36px; height: 38px; border-radius: 8px; border: 1px solid #e6d0d6; background: #fff; color: #d43f5a; font-size: 18px; line-height: 1; cursor: pointer; }
        .ec-host-remove:hover { background: #fdeef1; }
        .ec-host-remove:disabled { opacity: 0.5; cursor: default; }
        .ec-host-add { margin-top: 4px; padding: 8px 14px; border-radius: 8px; border: 1px dashed #c3c9d4; background: #fff; color: #4a4fc4; font-weight: 600; font-size: 13px; cursor: pointer; }
        .ec-host-add:hover { border-color: #667eea; background: #f5f6ff; }

        /* Cover image */
        .event-image-row { display: flex; gap: 16px; align-items: flex-start; }
        .event-image-thumb { width: 120px; height: 120px; flex-shrink: 0; border-radius: 10px; border: 1px solid #e0e0e0; background: #f7f7f7; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .event-image-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .event-image-empty { font-size: 12px; color: #aaa; }
        .event-image-controls { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
        .event-image-upload { padding: 9px 16px; border-radius: 8px; border: 1px solid #667eea; background: #eef0fe; color: #4a4fc4; font-weight: 600; font-size: 13px; cursor: pointer; }
        .event-image-upload:disabled { opacity: 0.6; cursor: default; }
        .event-image-remove { padding: 6px 12px; border-radius: 8px; border: 1px solid #e0e0e0; background: #fff; color: #b00; font-size: 12px; cursor: pointer; }
        .event-image-hint { margin: 2px 0 0; font-size: 12px; color: #999; }

        /* Website display (collapsible) */
        .ec-details { padding: 0; overflow: hidden; }
        .ec-details > summary { list-style: none; cursor: pointer; padding: 18px 24px; font-size: 15px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 9px; }
        .ec-details > summary::-webkit-details-marker { display: none; }
        .ec-details > summary::before { content: '▸'; color: #9aa0a6; font-size: 12px; transition: transform 150ms; }
        .ec-details[open] > summary::before { transform: rotate(90deg); }
        .ec-details-body { padding: 0 24px 22px; }

        /* Actions */
        .ec-actions { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 12px; padding: 16px 0 8px; margin-top: 4px; background: linear-gradient(to top, #f4f6f5 72%, rgba(244,246,245,0)); }
        .ec-btn { padding: 12px 26px; border-radius: 10px; font-weight: 700; font-size: 14.5px; font-family: inherit; cursor: pointer; border: 0; }
        .ec-btn-primary { background: #667eea; color: #fff; box-shadow: 0 4px 14px rgba(102,126,234,0.30); }
        .ec-btn-primary:hover:not(:disabled) { background: #5561d6; }
        .ec-btn-primary:disabled { background: #c3c7d1; box-shadow: none; cursor: not-allowed; }
        .ec-btn-secondary { background: #fff; color: #374151; border: 1px solid #dfe3e8; }
        .ec-btn-secondary:hover { background: #f3f4f6; }

        @media (max-width: 640px) {
          .ec-page { padding: 16px 12px 32px; }
          .ec-card { padding: 18px 16px; }
          .ec-row { grid-template-columns: 1fr; }
          .ec-details > summary { padding: 16px; }
          .ec-details-body { padding: 0 16px 18px; }
        }
      `}</style>

      <div className="ec-wrap">
        <div className="ec-head">
          <h1>{editId ? '✏️ Edit event' : '➕ Create event'}</h1>
          <p>{editId ? 'Update the details for this event.' : 'Add a new event to your calendar and website.'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Event details */}
          <section className="ec-card">
            <h2 className="ec-card-title">Event details</h2>
            <div className="ec-field">
              <label>Event title <span className="ec-req">*</span></label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Book Club Meeting" required disabled={isReadOnly} />
            </div>
            <div className="ec-field">
              <label>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is this event about?" disabled={isReadOnly} />
            </div>
            <div className="ec-row">
              <div className="ec-field">
                <label>Event type</label>
                <select value={form.event_type} onChange={e => set('event_type', e.target.value)} disabled={isReadOnly}>
                  <option value="one_time">One-time</option>
                  <option value="recurring">Recurring</option>
                </select>
              </div>
              {form.event_type === 'recurring' && (
                <div className="ec-field">
                  <label>Repeats</label>
                  <select value={form.recurrence_rule} onChange={e => set('recurrence_rule', e.target.value)} disabled={isReadOnly}>
                    <option value="">Select…</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Date and time */}
          <section className="ec-card">
            <h2 className="ec-card-title">Date and time</h2>
            <div className="ec-row">
              <div className="ec-field">
                <label>Start date <span className="ec-req">*</span></label>
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required disabled={isReadOnly} />
              </div>
              <div className="ec-field">
                <label>End date</label>
                <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
            <div className="ec-row">
              <div className="ec-field">
                <label>Start time</label>
                <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="ec-field">
                <label>End time</label>
                <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
          </section>

          {/* Location and capacity */}
          <section className="ec-card">
            <h2 className="ec-card-title">Location and capacity</h2>
            <div className="ec-field">
              <label>Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Library Hall" disabled={isReadOnly} />
            </div>
            <div className="ec-field">
              <label>Capacity <span className="ec-opt">(leave empty for unlimited)</span></label>
              <input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 30" min="1" disabled={isReadOnly} />
            </div>
            <label className="ec-check">
              <input type="checkbox" checked={form.waitlist_enabled} onChange={e => set('waitlist_enabled', e.target.checked)} disabled={isReadOnly} />
              <span>Enable waitlist when full</span>
            </label>
          </section>

          {/* Tickets */}
          <section className="ec-card">
            <h2 className="ec-card-title">Tickets</h2>
            <label className="ec-check">
              <input type="checkbox" checked={form.is_paid} onChange={e => set('is_paid', e.target.checked)} disabled={isReadOnly} />
              <span>This is a paid event</span>
            </label>
            {form.is_paid && (form.ticket_tiers || []).length === 0 && (
              <div className="ec-field" style={{ marginTop: 14 }}>
                <label>Ticket price (₹)</label>
                <input type="number" value={form.ticket_price} onChange={e => set('ticket_price', e.target.value)} placeholder="0" min="0" disabled={isReadOnly} />
              </div>
            )}

            {/* Named price options. With none, the single price above applies —
                which is how every existing event keeps working. */}
            {form.is_paid && tierColsReady && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #eef0f3' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Price options <span className="ec-opt">optional</span></h3>
                <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px' }}>
                  For events with more than one rate — “Adult ₹300”, “Parent + Child ₹500”.
                  Add these and people pick one when registering, instead of you writing it into the payment note.
                </p>

                {(form.ticket_tiers || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input type="text" value={t.label} disabled={isReadOnly}
                      onChange={e => setTier(i, 'label', e.target.value)}
                      placeholder="What it's called — e.g. Parent + Child"
                      style={{ flex: 1, minWidth: 0, padding: '9px 11px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af' }}>₹</span>
                      <input type="number" min="0" value={t.price} disabled={isReadOnly}
                        onChange={e => setTier(i, 'price', e.target.value)} placeholder="0"
                        style={{ width: 110, padding: '9px 11px 9px 22px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                    {!isReadOnly && (
                      <button type="button" onClick={() => removeTier(i)} title="Remove this option"
                        style={{ flexShrink: 0, width: 34, height: 34, border: '1px solid #e5e7eb', background: '#fff', color: '#b00', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>×</button>
                    )}
                  </div>
                ))}

                {!isReadOnly && (
                  <button type="button" onClick={addTier}
                    style={{ padding: '9px 16px', borderRadius: 8, border: '1px dashed #c7cbd1', background: '#fff', color: '#4a4fc4', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    + Add a price option
                  </button>
                )}

                {(form.ticket_tiers || []).length > 0 && (
                  <p style={{ fontSize: 12, color: '#999', margin: '10px 0 0' }}>
                    Someone picks one option and a quantity — a booking can’t mix two options.
                    Listings show the cheapest as a “from” price.
                  </p>
                )}
              </div>
            )}

            {/* How the registrant pays. Only meaningful for a paid event. */}
            {form.is_paid && !paymentColsReady && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                ⚠️ Payment options need one database update first — run{' '}
                <code style={{ fontFamily: 'monospace', fontSize: 12 }}>supabase/migrations/20260827_event_payments.sql</code>{' '}
                in the Supabase SQL editor. Everything else on this page saves normally.
              </div>
            )}

            {form.is_paid && paymentColsReady && (
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #eef0f3' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>How people pay</h3>
                <p style={{ fontSize: 12, color: '#999', margin: '0 0 14px' }}>
                  Shown in the register form on the website. Leave blank to just say
                  “we’ll share payment details after you register”.
                </p>

                {/* QR */}
                <div className="event-image-row">
                  <div className="event-image-thumb">
                    {form.payment_qr_url
                      ? <img src={form.payment_qr_url} alt="Payment QR preview" />
                      : <span className="event-image-empty">No QR</span>}
                  </div>
                  <div className="event-image-controls">
                    <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} disabled={isReadOnly || uploadingQr} />
                    <button type="button" className="event-image-upload" onClick={() => qrInputRef.current && qrInputRef.current.click()} disabled={isReadOnly || uploadingQr}>
                      {uploadingQr ? 'Uploading…' : (form.payment_qr_url ? '📷 Replace QR' : '📷 Upload QR code')}
                    </button>
                    {form.payment_qr_url && !uploadingQr && (
                      <button type="button" className="event-image-remove" onClick={() => set('payment_qr_url', '')} disabled={isReadOnly}>
                        Remove
                      </button>
                    )}
                    <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0' }}>
                      Your UPI QR. Uploaded as-is — QR codes aren’t compressed, so the code stays scannable.
                    </p>
                  </div>
                </div>

                <div className="ec-field" style={{ marginTop: 14 }}>
                  <label>Payment link <span className="ec-opt">optional</span></label>
                  <input type="url" value={form.payment_link} onChange={e => set('payment_link', e.target.value)}
                    placeholder="upi://pay?pa=… or https://…" disabled={isReadOnly} />
                  <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0' }}>
                    A UPI deep link or payment page. Shown as a “Pay now” button — handy on phones, where a QR can’t be scanned from the same screen.
                  </p>
                </div>

                <div className="ec-field" style={{ marginTop: 14 }}>
                  <label>Payment instruction <span className="ec-opt">optional</span></label>
                  <input type="text" value={form.payment_note} onChange={e => set('payment_note', e.target.value)}
                    placeholder="e.g. Add your name in the UPI note" disabled={isReadOnly} maxLength={160} />
                </div>

                <label className="ec-check" style={{ marginTop: 16 }}>
                  <input type="checkbox" checked={form.payment_proof_enabled}
                    onChange={e => set('payment_proof_enabled', e.target.checked)} disabled={isReadOnly} />
                  <span>Let people upload a screenshot of their payment</span>
                </label>
                <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0 26px' }}>
                  Adds an optional upload to the register form. Screenshots are private —
                  only signed-in staff can open them, from Event RSVPs.
                </p>
              </div>
            )}
          </section>

          {/* Cover image */}
          <section className="ec-card">
            <h2 className="ec-card-title">Cover image <span className="ec-opt">optional</span></h2>
            <div className="event-image-row">
              <div className="event-image-thumb">
                {form.image_url
                  ? <img src={form.image_url} alt="Event cover preview" />
                  : <span className="event-image-empty">No image</span>}
              </div>
              <div className="event-image-controls">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={isReadOnly || uploadingImage} />
                <button type="button" className="event-image-upload" onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={isReadOnly || uploadingImage}>
                  {uploadingImage ? 'Uploading…' : (form.image_url ? '📷 Replace image' : '📷 Upload image')}
                </button>
                {form.image_url && !uploadingImage && (
                  <button type="button" className="event-image-remove" onClick={() => set('image_url', '')} disabled={isReadOnly}>Remove</button>
                )}
                <p className="event-image-hint">Shown as the cover on the event page.</p>
              </div>
            </div>
            <div className="ec-field" style={{ marginTop: 14 }}>
              <input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="…or paste an image URL" disabled={isReadOnly} />
            </div>
          </section>

          {/* Website display */}
          <details className="ec-card ec-details">
            <summary>How this event looks on the website</summary>
            <div className="ec-details-body">
              <p className="ec-note">All optional — the defaults are fine for most events. These only change how the event looks on the customer website.</p>

              <div className="ec-field">
                <label>Category</label>
                {(customCat || !['book-club', 'poetry-supper', 'silent-reading', 'guest-night', 'members-only'].includes(form.category)) ? (
                  <>
                    <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Board games, Workshop, Live music" disabled={isReadOnly} />
                    <button type="button" className="ec-linkbtn" onClick={() => { setCustomCat(false); set('category', 'book-club'); }}>← Choose from the list instead</button>
                  </>
                ) : (
                  <select value={form.category} onChange={e => { if (e.target.value === '__new__') { setCustomCat(true); set('category', ''); } else set('category', e.target.value); }} disabled={isReadOnly}>
                    <option value="book-club">Book club</option>
                    <option value="poetry-supper">Poetry supper</option>
                    <option value="silent-reading">Silent reading</option>
                    <option value="guest-night">Guest night</option>
                    <option value="members-only">Members only</option>
                    <option value="__new__">➕ Add a new category…</option>
                  </select>
                )}
                <p className="ec-hint">Sets the event’s colour theme and the small tag shown on its page (e.g. “Guest Night”).</p>
              </div>

              <div className="ec-field">
                <label>Extra title word <span className="ec-opt">(optional)</span></label>
                <input value={form.italic_accent} onChange={e => set('italic_accent', e.target.value)} placeholder="e.g. Supper" disabled={isReadOnly} />
                <p className="ec-hint">A short word shown after the title in a fancy style — e.g. “Supper” makes the title read “Novella Supper”.</p>
              </div>

              <div className="ec-field">
                <label>Web link name <span className="ec-opt">(optional)</span></label>
                <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="board-games-9-aug" disabled={isReadOnly} />
                <p className="ec-hint">The event’s web address. Leave blank and we’ll build one from the title automatically.</p>
              </div>

              <div className="ec-field">
                <label>Hosts <span className="ec-opt">(optional)</span></label>
                {form.hosts.map((h, i) => (
                  <div className="ec-host-row" key={i}>
                    <input className="ec-host-name-input" value={h.name} onChange={e => setHost(i, 'name', e.target.value)} placeholder="Host name (e.g. Mallika)" disabled={isReadOnly} />
                    <input className="ec-host-url-input" value={h.url} onChange={e => setHost(i, 'url', e.target.value)} placeholder="https://… (optional link)" disabled={isReadOnly} />
                    <button type="button" className="ec-host-remove" onClick={() => removeHost(i)} disabled={isReadOnly} aria-label="Remove host" title="Remove host">×</button>
                  </div>
                ))}
                <button type="button" className="ec-host-add" onClick={addHost} disabled={isReadOnly}>+ Add host</button>
                <p className="ec-hint">Leave empty to show “Tapas Reading Cafe”. Add one or more to credit organisers — shown as “Name × Name” on the event page (add a link to make a name clickable).</p>
              </div>
            </div>
          </details>

          {/* Actions */}
          <div className="ec-actions">
            <button type="button" className="ec-btn ec-btn-secondary" onClick={() => navigate('/events')}>Cancel</button>
            <button type="submit" className="ec-btn ec-btn-primary" disabled={saving || isReadOnly || !canManageEvents}>
              {saving ? 'Saving…' : editId ? 'Update event' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
