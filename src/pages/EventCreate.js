import React, { useState } from 'react';
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
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'one_time', recurrence_rule: '',
    start_date: '', end_date: '', start_time: '', end_time: '',
    location: 'Tapas Reading Cafe', is_paid: false, ticket_price: 0,
    capacity: '', waitlist_enabled: false, image_url: '', status: 'upcoming',
    // CMS display fields — drive how the event appears on the customer site.
    slug: '', italic_accent: '',
    category: 'book-club', badge: '', cta_type: 'rsvp', chip_color: 'lavender',
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
        });
        setLoaded(true);
      });
    }
  }, [editId]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const slugify = (s) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

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
      const payload = {
        ...form,
        slug: finalSlug,
        // Empty string from the optional badge select means "no badge".
        badge: form.badge || null,
        italic_accent: form.italic_accent || null,
        ticket_price: parseFloat(form.ticket_price) || 0,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        updated_at: new Date().toISOString(),
      };
      if (editId) {
        await supabase.from('events').update(payload).eq('id', editId);
      } else {
        await supabase.from('events').insert([payload]);
      }
      navigate('/events');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
    setSaving(false);
  };

  if (!loaded) return <p style={{ padding: '20px', color: '#999' }}>Loading...</p>;

  return (
    <div className="event-create-page">
      {isReadOnly && <ViewOnlyBanner />}
      <style>{`
        .event-create-page { padding: 20px; max-width: 700px; }
        .event-create-page h1 { font-size: 28px; margin-bottom: 20px; }
        .event-form { background: white; border-radius: 10px; padding: 24px; }
        .event-form-group { margin-bottom: 16px; }
        .event-form-group label { display: block; font-size: 13px; color: #555; font-weight: 600; margin-bottom: 4px; }
        .event-form-group input, .event-form-group select, .event-form-group textarea {
          width: 100%; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; font-family: inherit; }
        .event-form-group textarea { resize: vertical; min-height: 80px; }
        .event-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .event-form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .event-form-check { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .event-form-check label { margin: 0; font-size: 14px; color: #555; cursor: pointer; }
        .event-form-actions { display: flex; gap: 10px; margin-top: 20px; }
        .event-form-actions button { padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; border: none; }
        @media (max-width: 768px) {
          .event-create-page { padding: 12px; }
          .event-create-page h1 { font-size: 22px; }
          .event-form { padding: 16px; }
          .event-form-row, .event-form-row-3 { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .event-create-page { padding: 8px; }
          .event-form { padding: 12px; }
        }
      `}</style>

      <h1>{editId ? '✏️ Edit Event' : '➕ Create Event'}</h1>

      <form className="event-form" onSubmit={handleSubmit}>
        <div className="event-form-group">
          <label>Event Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Book Club Meeting" required disabled={isReadOnly} />
        </div>

        <div className="event-form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is this event about?" disabled={isReadOnly} />
        </div>

        <div className="event-form-row">
          <div className="event-form-group">
            <label>Event Type</label>
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)} disabled={isReadOnly}>
              <option value="one_time">One-time</option>
              <option value="recurring">Recurring</option>
            </select>
          </div>
          {form.event_type === 'recurring' && (
            <div className="event-form-group">
              <label>Recurrence</label>
              <select value={form.recurrence_rule} onChange={e => set('recurrence_rule', e.target.value)} disabled={isReadOnly}>
                <option value="">Select...</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

        <div className="event-form-row">
          <div className="event-form-group">
            <label>Start Date *</label>
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required disabled={isReadOnly} />
          </div>
          <div className="event-form-group">
            <label>End Date</label>
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} disabled={isReadOnly} />
          </div>
        </div>

        <div className="event-form-row-3">
          <div className="event-form-group">
            <label>Start Time</label>
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} disabled={isReadOnly} />
          </div>
          <div className="event-form-group">
            <label>End Time</label>
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} disabled={isReadOnly} />
          </div>
          <div className="event-form-group">
            <label>Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Library Hall" disabled={isReadOnly} />
          </div>
        </div>

        <div className="event-form-group">
          <label>Capacity (leave empty for unlimited)</label>
          <input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 30" min="1" disabled={isReadOnly} />
        </div>

        <div className="event-form-check">
          <input type="checkbox" id="waitlist" checked={form.waitlist_enabled} onChange={e => set('waitlist_enabled', e.target.checked)} disabled={isReadOnly} />
          <label htmlFor="waitlist">Enable waitlist when full</label>
        </div>

        <div className="event-form-check">
          <input type="checkbox" id="paid" checked={form.is_paid} onChange={e => set('is_paid', e.target.checked)} disabled={isReadOnly} />
          <label htmlFor="paid">This is a paid event</label>
        </div>

        {form.is_paid && (
          <div className="event-form-group">
            <label>Ticket Price (₹)</label>
            <input type="number" value={form.ticket_price} onChange={e => set('ticket_price', e.target.value)} placeholder="0" min="0" disabled={isReadOnly} />
          </div>
        )}

        <div className="event-form-group">
          <label>Image URL (optional)</label>
          <input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." disabled={isReadOnly} />
        </div>

        <details style={{ marginTop: 24, marginBottom: 8, border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#555', fontSize: 14 }}>
            Customer site display options
          </summary>
          <div style={{ marginTop: 16 }}>
            <div className="event-form-row">
              <div className="event-form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} disabled={isReadOnly}>
                  <option value="book-club">Book club</option>
                  <option value="poetry-supper">Poetry supper</option>
                  <option value="silent-reading">Silent reading</option>
                  <option value="guest-night">Guest night</option>
                  <option value="members-only">Members only</option>
                </select>
              </div>
              <div className="event-form-group">
                <label>Chip color</label>
                <select value={form.chip_color} onChange={e => set('chip_color', e.target.value)} disabled={isReadOnly}>
                  <option value="lavender">Lavender</option>
                  <option value="sage">Sage</option>
                  <option value="pink">Pink</option>
                  <option value="peach">Peach</option>
                  <option value="soft-pink">Soft pink</option>
                </select>
              </div>
            </div>
            <div className="event-form-row">
              <div className="event-form-group">
                <label>Badge (optional)</label>
                <select value={form.badge} onChange={e => set('badge', e.target.value)} disabled={isReadOnly}>
                  <option value="">— none —</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="prix-fixe">Prix fixe</option>
                  <option value="drop-in">Drop in</option>
                  <option value="guest-night">Guest night</option>
                </select>
              </div>
              <div className="event-form-group">
                <label>CTA</label>
                <select value={form.cta_type} onChange={e => set('cta_type', e.target.value)} disabled={isReadOnly}>
                  <option value="rsvp">RSVP</option>
                  <option value="reserve">Reserve</option>
                  <option value="dropin">Drop in</option>
                </select>
              </div>
            </div>
            <div className="event-form-group">
              <label>Italic accent (optional — short word like "Club" or "Supper")</label>
              <input value={form.italic_accent} onChange={e => set('italic_accent', e.target.value)} placeholder="Supper" disabled={isReadOnly} />
            </div>
            <div className="event-form-group">
              <label>Slug (optional — auto-generated from title if blank)</label>
              <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="poetry-night-may-12" disabled={isReadOnly} />
            </div>
          </div>
        </details>

        <div className="event-form-actions">
          <button type="submit" disabled={saving || isReadOnly || !canManageEvents} style={{ background: (isReadOnly || !canManageEvents) ? '#ccc' : '#667eea', color: 'white', cursor: (isReadOnly || !canManageEvents) ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : editId ? 'Update Event' : 'Create Event'}
          </button>
          <button type="button" onClick={() => navigate('/events')} style={{ background: '#e0e0e0', color: '#333' }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
