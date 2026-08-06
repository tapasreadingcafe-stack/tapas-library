import React, { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

export default function EventCreate() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isReadOnly, canManageEvents } = usePermission();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'one_time', recurrence_rule: '',
    start_date: '', end_date: '', start_time: '', end_time: '',
    location: 'Tapas Reading Cafe', is_paid: false, ticket_price: 0,
    capacity: '', waitlist_enabled: false, image_url: '', status: 'upcoming',
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

  // Upload a picked file to imgbb and store the returned hosted URL in
  // image_url. We deliberately do NOT fall back to a base64 data URL: a
  // giant data URL in the events row bloats the table (it has bitten the
  // books table before), so on failure we just surface the error.
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('image', compressed, 'event.jpg');
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.REACT_APP_IMGBB_API_KEY}`, {
        method: 'POST', body: fd, signal: controller.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error?.message || 'Upload failed');
      set('image_url', data.data.display_url);
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
            {form.is_paid && (
              <div className="ec-field" style={{ marginTop: 14 }}>
                <label>Ticket price (₹)</label>
                <input type="number" value={form.ticket_price} onChange={e => set('ticket_price', e.target.value)} placeholder="0" min="0" disabled={isReadOnly} />
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
                <select value={form.category} onChange={e => set('category', e.target.value)} disabled={isReadOnly}>
                  <option value="book-club">Book club</option>
                  <option value="poetry-supper">Poetry supper</option>
                  <option value="silent-reading">Silent reading</option>
                  <option value="guest-night">Guest night</option>
                  <option value="members-only">Members only</option>
                </select>
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
