import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvent } from '../cms/hooks';
import { supabase } from '../utils/supabase';

// Category → gradient, used as the cover when an event has no image of its own.
const CATEGORY_GRADIENT = {
  'book-club':      'linear-gradient(155deg, #8F4FD6 0%, #5a2b9a 100%)',
  'poetry-supper':  'linear-gradient(155deg, #FF934A 0%, #c65a1e 100%)',
  'silent-reading': 'linear-gradient(155deg, #C9F27F 0%, #6f8a3d 100%)',
  'guest-night':    'linear-gradient(155deg, #E0004F 0%, #8a002f 100%)',
  'members-only':   'linear-gradient(155deg, #5b4d3d 0%, #2c241b 100%)',
};

const CATEGORY_LABEL = {
  'book-club': 'Book Club',
  'poetry-supper': 'Poetry Supper',
  'silent-reading': 'Silent Reading',
  'guest-night': 'Guest Night',
  'members-only': 'Members Only',
};

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// The cafe's fixed venue details (single location).
const HOST_NAME = 'Tapas Reading Cafe';
const VENUE_NAME = 'Tapas Reading Cafe';
const VENUE_ADDRESS = '2nd Floor, 2628, 27th Main Rd, above Juice Junction, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India';
const MAP_LINK = 'https://maps.app.goo.gl/i24rAtukZxwuL1Uk9';
const MAP_EMBED = 'https://www.google.com/maps?q=Tapas%20Reading%20Cafe%2C%2027th%20Main%20Rd%2C%20HSR%20Layout%2C%20Bengaluru%2C%20Karnataka%20560102&output=embed';
const WHATSAPP_NUMBER = '917760393951';

function formatLongDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

// 24-hour HH:MM, dropping seconds (matches the reference layout).
function hhmm(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${h}:${(m || '00')}`;
}

const CSS = `
  .evd { background: #fff; min-height: 100vh; color: #1a1a1a; font-family: 'Poppins', system-ui, sans-serif; margin-top: -86px; padding-top: 86px; }
  .evd-inner { max-width: 1120px; margin: 0 auto; padding: 40px 48px 80px; }
  .evd-back { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #6e6e6e; text-decoration: none; margin-bottom: 26px; transition: color 150ms, gap 150ms; }
  .evd-back:hover { color: #E0004F; gap: 10px; }
  .evd-grid { display: grid; grid-template-columns: 360px 1fr; gap: 48px; align-items: start; }

  /* Left column */
  .evd-cover { width: 100%; aspect-ratio: 1 / 1; border-radius: 16px; background-size: cover; background-position: center; box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
  .evd-section-label { font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 26px 0 10px; padding-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.10); }
  .evd-host { display: flex; align-items: center; gap: 12px; }
  .evd-host-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #7aa8ff, #6a7bff); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; }
  .evd-host-names { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
  .evd-host-name { font-size: 15px; font-weight: 500; color: #1a1a1a; }
  .evd-host-sep { color: #b0b0b0; font-size: 14px; }
  .evd-host-link { text-decoration: none; transition: color 150ms; }
  .evd-host-link:hover { color: #E0004F; text-decoration: underline; }
  .evd-links { margin-top: 22px; display: flex; flex-direction: column; gap: 14px; }
  .evd-links a { font-size: 14px; color: #6e6e6e; text-decoration: none; transition: color 150ms; }
  .evd-links a:hover { color: #1a1a1a; }
  .evd-tags { margin-top: 24px; }
  .evd-tag { display: inline-flex; align-items: center; font-size: 13px; color: #4a4a4a; border: 1px solid rgba(0,0,0,0.14); border-radius: 999px; padding: 7px 15px; }

  /* Right column */
  .evd-title { margin: 0 0 24px; font-family: 'Poppins', system-ui, sans-serif; font-weight: 700; font-size: 46px; line-height: 1.08; letter-spacing: -0.01em; color: #1a1a1a; }
  .evd-facts { display: flex; flex-direction: column; gap: 18px; margin-bottom: 28px; }
  .evd-fact { display: flex; align-items: center; gap: 14px; }
  .evd-datebadge { width: 46px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(0,0,0,0.10); text-align: center; flex-shrink: 0; background: #fff; }
  .evd-datebadge .m { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #6e6e6e; background: rgba(0,0,0,0.04); padding: 3px 0; }
  .evd-datebadge .d { display: block; font-size: 20px; font-weight: 700; color: #1a1a1a; padding: 4px 0 6px; }
  .evd-fact-icon { width: 46px; height: 46px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.10); background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .evd-fact-icon svg { width: 20px; height: 20px; color: #6e6e6e; }
  .evd-fact-main { font-size: 16px; font-weight: 600; color: #1a1a1a; }
  .evd-fact-sub { font-size: 14px; color: #6e6e6e; margin-top: 2px; }
  .evd-fact-link { color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .evd-fact-link:hover { color: #E0004F; }
  .evd-fact-link svg { width: 13px; height: 13px; }

  .evd-reg { border: 1px solid rgba(0,0,0,0.10); border-radius: 14px; overflow: hidden; margin-bottom: 40px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06); }
  .evd-reg-head { background: #f4f5f4; padding: 14px 22px; font-size: 15px; font-weight: 600; color: #333; border-bottom: 1px solid rgba(0,0,0,0.08); }
  .evd-reg-body { padding: 22px; }
  .evd-reg-body p { margin: 0 0 18px; font-size: 15px; color: #4a4a4a; }
  .evd-reg-btn { display: block; width: 100%; text-align: center; background: #E0004F; color: #fff; border: 0; border-radius: 10px; padding: 15px; font-family: inherit; font-size: 16px; font-weight: 700; text-decoration: none; cursor: pointer; transition: transform 150ms, box-shadow 150ms, background 150ms; box-shadow: 0 4px 14px rgba(224,0,79,0.25); }
  .evd-reg-btn:hover { transform: translateY(-1px); background: #c70045; box-shadow: 0 8px 20px rgba(224,0,79,0.32); }

  .evd-block { margin-bottom: 36px; }
  .evd-block-label { font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,0,0,0.10); }
  .evd-about { font-size: 16px; line-height: 1.7; color: #4a4a4a; white-space: pre-line; }
  .evd-venue-name { font-size: 17px; font-weight: 600; color: #1a1a1a; margin: 0 0 6px; }
  .evd-venue-addr { font-size: 15px; line-height: 1.6; color: #6e6e6e; margin: 0 0 18px; }
  .evd-map { width: 100%; height: 280px; border: 0; border-radius: 14px; display: block; }
  .evd-muted { color: #6e6e6e; font-size: 15px; padding: 60px 0; }

  /* Registration popup */
  .evd-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 20px; }
  .evd-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 70px rgba(0,0,0,0.35); }
  .evd-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 24px 24px 0; }
  .evd-modal-title { margin: 0; font-family: 'Poppins', system-ui, sans-serif; font-weight: 700; font-size: 24px; color: #1a1a1a; }
  .evd-modal-sub { margin: 5px 0 0; font-size: 13px; color: #6e6e6e; }
  .evd-modal-close { background: none; border: 0; font-size: 20px; line-height: 1; color: #aaa; cursor: pointer; padding: 4px; }
  .evd-modal-close:hover { color: #1a1a1a; }
  .evd-form { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 15px; }
  .evd-field label { display: block; font-size: 13px; font-weight: 600; color: #444; margin-bottom: 6px; }
  .evd-field .req { color: #E0004F; }
  .evd-field .opt { color: #9a9a9a; font-weight: 400; }
  .evd-field input { width: 100%; padding: 12px 13px; border: 1px solid #dcdcdc; border-radius: 10px; font-size: 15px; font-family: inherit; box-sizing: border-box; transition: border-color 150ms; }
  .evd-field input:focus { outline: none; border-color: #E0004F; box-shadow: 0 0 0 3px rgba(224,0,79,0.10); }
  /* Payment block — a calm neutral card. The QR is the thing to look at, so
     nothing else competes with it for attention. */
  .evd-pay-box { border: 1px solid #e6e6e6; background: #fbfbfb; border-radius: 12px; padding: 18px; }
  .evd-pay-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #8a8a8a; }
  .evd-pay-box p { margin: 6px 0 0; font-size: 14px; color: #3d3d3d; line-height: 1.5; }
  /* The amount actually due — the one number people look for. */
  .evd-pay-total { display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
    margin-top: 12px; padding: 12px 14px; background: #fff; border: 1px solid #ececec; border-radius: 10px; }
  .evd-pay-total-label { font-size: 13px; color: #6a6a6a; }
  .evd-pay-total-amt { font-size: 26px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.01em; }
  .evd-pay-total-calc { font-size: 12px; color: #9a9a9a; margin-top: 2px; }
  .evd-tiers { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .evd-tier { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1px solid #dcdcdc;
    border-radius: 10px; cursor: pointer; background: #fff; transition: border-color 150ms, background 150ms; }
  .evd-tier.is-on { border-color: #E0004F; background: #fff7fa; }
  .evd-tier input { accent-color: #E0004F; width: 17px; height: 17px; flex-shrink: 0; }
  .evd-tier-name { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; color: #1a1a1a; }
  .evd-tier-price { font-size: 15px; font-weight: 700; color: #1a1a1a; flex-shrink: 0; }
  /* QR — big enough to scan from another phone held at arm's length. */
  .evd-qr { margin-top: 14px; text-align: center; }
  .evd-qr img { width: 100%; max-width: 300px; aspect-ratio: 1; object-fit: contain;
    background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 10px; }
  .evd-qr-cap { margin-top: 8px; font-size: 14px; font-weight: 600; color: #3d3d3d; }
  .evd-pay-link { display: block; margin-top: 12px; padding: 13px 16px; border-radius: 10px;
    background: #E0004F; color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; text-align: center; }
  .evd-pay-link:hover { background: #b8003f; }
  .evd-pay-note { margin-top: 10px; font-size: 13px; color: #6a6a6a; font-style: italic; text-align: center; }
  /* Upload — a proper drop-zone sized target, not a hairline file input. */
  .evd-proof { margin-top: 16px; padding-top: 16px; border-top: 1px solid #ececec; }
  .evd-proof-label { font-size: 14px; font-weight: 700; color: #1a1a1a; display: block; margin-bottom: 8px; }
  .evd-proof-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    width: 100%; min-height: 104px; padding: 18px; box-sizing: border-box; cursor: pointer;
    background: #fff; border: 2px dashed #d8d8d8; border-radius: 12px; transition: border-color 150ms, background 150ms; }
  .evd-proof-drop:hover { border-color: #E0004F; background: #fffafc; }
  .evd-proof-drop-icon { font-size: 26px; line-height: 1; }
  .evd-proof-drop-main { font-size: 15px; font-weight: 600; color: #3d3d3d; }
  .evd-proof-drop-sub { font-size: 12px; color: #9a9a9a; }
  .evd-proof-chosen { display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-top: 10px; padding: 10px 12px; background: #f2fbf6; border: 1px solid #cdebda; border-radius: 10px;
    font-size: 13px; color: #1a7f52; font-weight: 600; }
  .evd-proof-clear { background: none; border: 0; color: #6a6a6a; font-size: 13px; cursor: pointer; font-family: inherit; padding: 0 2px; }
  .evd-form-submit { background: #E0004F; color: #fff; border: 0; border-radius: 10px; padding: 14px; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer; margin-top: 4px; transition: background 150ms; }
  .evd-form-submit:hover { background: #c70045; }
  .evd-form-submit:disabled { background: #e79bb4; cursor: default; }
  .evd-form-error { margin: 0; font-size: 13px; color: #c70045; background: #fdeef2; border: 1px solid #f6c9d7; border-radius: 8px; padding: 10px 12px; }
  .evd-form-cancel { background: none; border: 0; color: #6e6e6e; font-size: 14px; font-family: inherit; cursor: pointer; padding: 6px; }
  .evd-form-cancel:hover { color: #1a1a1a; }
  .evd-success { padding: 34px 26px 28px; text-align: center; }
  .evd-success-check { font-size: 42px; }
  .evd-success h3 { margin: 12px 0 8px; font-family: 'Poppins', system-ui, sans-serif; font-size: 23px; color: #1a1a1a; }
  .evd-success p { margin: 0 0 20px; font-size: 14px; color: #6e6e6e; line-height: 1.55; }

  @media (max-width: 900px) {
    .evd-inner { padding: 28px 24px 64px; }
    .evd-grid { grid-template-columns: 1fr; gap: 32px; }
    .evd-cover { max-width: 420px; }
    .evd-title { font-size: 34px; }
  }
`;

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-6.4 7-11a7 7 0 10-14 0c0 4.6 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}
function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M14.5 6v12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2.4"/>
    </svg>
  );
}

export default function EventDetail() {
  const { slug } = useParams();
  const { data: event, loading } = useEvent(slug);

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', guests: 1 });
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // Which price option is selected, when the event offers several.
  const [tierIdx, setTierIdx] = useState(0);

  // Named price options, when the event has them. Falls back to the event's
  // single ticket_price so events without tiers behave exactly as before.
  const tiers = Array.isArray(event?.ticket_tiers) ? event.ticket_tiers.filter((t) => t && t.label) : [];
  const chosenTier = tiers.length ? (tiers[tierIdx] || tiers[0]) : null;
  const unitPrice = chosenTier ? Number(chosenTier.price) || 0 : Number(event?.ticket_price) || 0;
  // Optional proof-of-payment, only offered when staff enabled it on the event.
  const [proofFile, setProofFile] = useState(null);
  const [proofError, setProofError] = useState('');

  const closeForm = () => {
    setShowForm(false); setSubmitted(false); setSubmitError('');
    setProofFile(null); setProofError('');
  };

  const MAX_PROOF_BYTES = 5 * 1024 * 1024; // matches the bucket's own limit
  const pickProof = (e) => {
    const f = e.target.files?.[0] || null;
    setProofError('');
    if (f && f.size > MAX_PROOF_BYTES) {
      setProofError('That file is over 5 MB — please attach a smaller screenshot.');
      setProofFile(null);
      e.target.value = '';
      return;
    }
    setProofFile(f);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // Upload the payment screenshot first, if one was attached. The bucket
      // is private and insert-only for visitors, so what's stored is the path —
      // staff open it through a signed URL from the dashboard.
      let proofPath = null;
      if (proofFile && event.payment_proof_enabled) {
        const ext = (proofFile.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
        const rand = (window.crypto?.randomUUID?.() || String(Date.now()));
        const path = `events/${event.id}/${rand}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('payment-proofs')
          .upload(path, proofFile, { contentType: proofFile.type || 'image/jpeg', upsert: false });
        // A failed upload must not cost them the registration — record the
        // sign-up anyway and let staff chase the payment.
        if (upErr) console.error('Payment proof upload failed', upErr);
        else proofPath = path;
      }

      // Public sign-up → event_registrations (guest_* columns), the same
      // shape the storefront's event block uses. Lands in the staff dashboard.
      const row = {
        event_id: event.id,
        guest_name: form.name.trim(),
        guest_email: form.email.trim() || null,
        guest_phone: form.phone.trim(),
        ticket_count: Math.max(1, parseInt(form.guests, 10) || 1),
        status: 'confirmed',
        source_page: 'event_detail',
      };
      // Only sent when there's something to send, so registrations still work
      // before 20260827_event_payments.sql is applied.
      if (proofPath) row.payment_proof_url = proofPath;
      // Which option they picked, and what it cost then — stored rather than
      // looked up later, so editing a tier can't restate an old booking.
      if (chosenTier) {
        row.ticket_tier = chosenTier.label;
        row.ticket_unit_price = unitPrice;
      }

      const { error } = await supabase.from('event_registrations').insert([row]);
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      setSubmitError('Sorry, something went wrong — please try again, or message us on WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="evd">
        <style>{CSS}</style>
        <div className="evd-inner"><p className="evd-muted">Loading…</p></div>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="evd">
        <style>{CSS}</style>
        <div className="evd-inner">
          <p className="evd-muted">Sorry, we couldn’t find that event. It may have ended or been removed.</p>
          <Link to="/events" className="evd-back">← Back to events</Link>
        </div>
      </div>
    );
  }

  const cover = event.cover_url || event.image_url;
  const coverStyle = cover
    ? { backgroundImage: `url(${cover})` }
    : { background: CATEGORY_GRADIENT[event.category] || CATEGORY_GRADIENT['book-club'] };

  const [, mo, da] = (event.start_date || '').split('-');
  const dayNum = da ? String(Number(da)) : '';
  const monLabel = mo ? MON[Number(mo) - 1] : '';

  const longDate = formatLongDate(event.start_date);
  const start = hhmm(event.start_time);
  const end = hhmm(event.end_time);
  const timeStr = start ? (end ? `${start} - ${end}` : start) : '';
  const fullTitle = `${event.title}${event.italic_accent ? ' ' + event.italic_accent : ''}`;
  const tag = CATEGORY_LABEL[event.category] || event.category || 'Events';
  const isPaid = event.is_paid && event.ticket_price > 0;
  // Hosts: prefer the multi-host `hosts` array; fall back to the legacy single
  // host_name/host_url; finally the cafe. Always at least one entry.
  const rawHosts = Array.isArray(event.hosts) ? event.hosts.filter((h) => h && h.name) : [];
  const hostList = rawHosts.length
    ? rawHosts
    : (event.host_name ? [{ name: event.host_name, url: event.host_url }] : [{ name: HOST_NAME }]);

  const waText = encodeURIComponent(`Hi Tapas! I'd like to register for "${event.title}"${longDate ? ' on ' + longDate : ''}.`);
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;

  return (
    <div className="evd">
      <style>{CSS}</style>
      <div className="evd-inner">
        <Link to="/events" className="evd-back">← Back to events</Link>
        <div className="evd-grid">
          {/* Left column */}
          <aside>
            <div className="evd-cover" style={coverStyle} role="img" aria-label={fullTitle} />
            <div className="evd-section-label">Hosted By</div>
            <div className="evd-host">
              <span className="evd-host-avatar" aria-hidden="true">{hostList[0].name.slice(0, 1)}</span>
              <span className="evd-host-names">
                {hostList.map((h, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="evd-host-sep" aria-hidden="true">×</span>}
                    {h.url && h.url.trim() ? (
                      <a className="evd-host-name evd-host-link" href={h.url} target="_blank" rel="noopener noreferrer">{h.name}</a>
                    ) : (
                      <span className="evd-host-name">{h.name}</span>
                    )}
                  </React.Fragment>
                ))}
              </span>
            </div>
            <div className="evd-links">
              <a href={waHref} target="_blank" rel="noopener noreferrer">Contact the Host</a>
              <a href={MAP_LINK} target="_blank" rel="noopener noreferrer">Get Directions</a>
            </div>
            <div className="evd-tags">
              <span className="evd-tag"># {tag}</span>
            </div>
          </aside>

          {/* Right column */}
          <div>
            <h1 className="evd-title">{fullTitle}</h1>

            <div className="evd-facts">
              {event.start_date && (
                <div className="evd-fact">
                  <div className="evd-datebadge"><span className="m">{monLabel}</span><span className="d">{dayNum}</span></div>
                  <div>
                    <div className="evd-fact-main">{longDate}</div>
                    {timeStr && <div className="evd-fact-sub">{timeStr}</div>}
                  </div>
                </div>
              )}
              <div className="evd-fact">
                <div className="evd-fact-icon"><PinIcon /></div>
                <div>
                  <div className="evd-fact-main">
                    <a className="evd-fact-link" href={MAP_LINK} target="_blank" rel="noopener noreferrer">
                      {VENUE_NAME} <ArrowUpRight />
                    </a>
                  </div>
                  <div className="evd-fact-sub">Bengaluru, Karnataka</div>
                </div>
              </div>
              <div className="evd-fact">
                <div className="evd-fact-icon"><TicketIcon /></div>
                <div>
                  <div className="evd-fact-main">{isPaid ? `₹${event.ticket_price}` : 'Free'}</div>
                  <div className="evd-fact-sub">{isPaid ? 'per person' : 'Free entry'}</div>
                </div>
              </div>
            </div>

            <div className="evd-reg">
              <div className="evd-reg-head">Registration</div>
              <div className="evd-reg-body">
                <p>Welcome! To join the event, please register below.</p>
                <button type="button" className="evd-reg-btn" onClick={() => { setSubmitted(false); setShowForm(true); }}>Register</button>
              </div>
            </div>

            {event.description && (
              <div className="evd-block">
                <h2 className="evd-block-label">About Event</h2>
                <p className="evd-about">{event.description}</p>
              </div>
            )}

            <div className="evd-block">
              <h2 className="evd-block-label">Location</h2>
              <p className="evd-venue-name">{VENUE_NAME}</p>
              <p className="evd-venue-addr">{VENUE_ADDRESS}</p>
              <iframe className="evd-map" src={MAP_EMBED} title="Map to Tapas Reading Cafe" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="evd-modal-overlay" onClick={closeForm}>
          <div className="evd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {submitted ? (
              <div className="evd-success">
                <div className="evd-success-check">🎉</div>
                <h3>You’re registered!</h3>
                <p>
                  Thanks, {form.name.trim().split(' ')[0] || 'friend'}! We’ve noted your spot for
                  {' '}{event.title}.{' '}
                  {event.is_paid && event.ticket_price > 0
                    ? 'We’ll be in touch about payment.'
                    : 'See you there!'}
                </p>
                <button type="button" className="evd-form-submit" onClick={() => { closeForm(); setForm({ name: '', phone: '', email: '', guests: 1 }); }}>Done</button>
              </div>
            ) : (
              <>
                <div className="evd-modal-head">
                  <div>
                    <h3 className="evd-modal-title">Register</h3>
                    <p className="evd-modal-sub">{event.title}{longDate ? ' · ' + longDate : ''}</p>
                  </div>
                  <button type="button" className="evd-modal-close" onClick={closeForm} aria-label="Close">✕</button>
                </div>
                <form className="evd-form" onSubmit={handleSubmit}>
                  <div className="evd-field">
                    <label htmlFor="reg-name">Name <span className="req">*</span></label>
                    <input id="reg-name" type="text" required value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Your full name" />
                  </div>
                  <div className="evd-field">
                    <label htmlFor="reg-phone">Phone number <span className="req">*</span></label>
                    <input id="reg-phone" type="tel" required value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="e.g. 98765 43210" />
                  </div>
                  <div className="evd-field">
                    <label htmlFor="reg-email">Email <span className="opt">(optional)</span></label>
                    <input id="reg-email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="you@example.com" />
                  </div>
                  {tiers.length > 0 && (
                    <div className="evd-field">
                      <label>Choose your ticket</label>
                      <div className="evd-tiers">
                        {tiers.map((t, i) => (
                          <label key={i} className={`evd-tier${i === tierIdx ? ' is-on' : ''}`}>
                            <input type="radio" name="evd-tier" checked={i === tierIdx} onChange={() => setTierIdx(i)} />
                            <span className="evd-tier-name">{t.label}</span>
                            <span className="evd-tier-price">₹{(Number(t.price) || 0).toLocaleString('en-IN')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="evd-field">
                    <label htmlFor="reg-guests">{tiers.length ? 'How many?' : 'Number of people attending'}</label>
                    <input id="reg-guests" type="number" min="1" value={form.guests} onChange={(e) => setField('guests', e.target.value)} placeholder="1" />
                  </div>
                  {event.is_paid && unitPrice > 0 && (() => {
                    const people = Math.max(1, parseInt(form.guests, 10) || 1);
                    const total = unitPrice * people;
                    return (
                    <div className="evd-pay-box">
                      <span className="evd-pay-label">Payment</span>

                      {/* The amount due, worked out for the number of people
                          chosen above — that arithmetic shouldn't be homework. */}
                      <div className="evd-pay-total">
                        <div>
                          <div className="evd-pay-total-label">Amount to pay</div>
                          <div className="evd-pay-total-calc">
                            ₹{unitPrice.toLocaleString('en-IN')} × {people}{chosenTier ? ` · ${chosenTier.label}` : ` ${people === 1 ? 'person' : 'people'}`}
                          </div>
                        </div>
                        <div className="evd-pay-total-amt">₹{total.toLocaleString('en-IN')}</div>
                      </div>

                      {!event.payment_qr_url && !event.payment_link && (
                        <p>We’ll share payment details after you register.</p>
                      )}

                      {event.payment_qr_url && (
                        <div className="evd-qr">
                          <img src={event.payment_qr_url} alt="Scan this QR code to pay" />
                          <div className="evd-qr-cap">Scan to pay ₹{total.toLocaleString('en-IN')}</div>
                        </div>
                      )}

                      {event.payment_link && (
                        <a className="evd-pay-link" href={event.payment_link} target="_blank" rel="noopener noreferrer">
                          Pay ₹{total.toLocaleString('en-IN')} now
                        </a>
                      )}

                      {event.payment_note && <p className="evd-pay-note">{event.payment_note}</p>}

                      {event.payment_proof_enabled && (
                        <div className="evd-proof">
                          <span className="evd-proof-label">Payment screenshot</span>
                          <input id="reg-proof" type="file" accept="image/*,application/pdf"
                            onChange={pickProof} style={{ display: 'none' }} />
                          <label htmlFor="reg-proof" className="evd-proof-drop">
                            <span className="evd-proof-drop-icon">📷</span>
                            <span className="evd-proof-drop-main">
                              {proofFile ? 'Choose a different file' : 'Tap to upload your payment screenshot'}
                            </span>
                            <span className="evd-proof-drop-sub">PNG, JPG or PDF · up to 5 MB</span>
                          </label>
                          {proofFile && (
                            <div className="evd-proof-chosen">
                              <span>✓ {proofFile.name}</span>
                              <button type="button" className="evd-proof-clear"
                                onClick={() => { setProofFile(null); setProofError(''); const el = document.getElementById('reg-proof'); if (el) el.value = ''; }}>
                                Remove
                              </button>
                            </div>
                          )}
                          {proofError && <p className="evd-form-error" style={{ marginTop: 8 }}>{proofError}</p>}
                        </div>
                      )}
                    </div>
                    );
                  })()}
                  {submitError && <p className="evd-form-error">{submitError}</p>}
                  <button type="submit" className="evd-form-submit" disabled={submitting}>{submitting ? 'Registering…' : 'Register'}</button>
                  <button type="button" className="evd-form-cancel" onClick={closeForm} disabled={submitting}>Cancel</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
