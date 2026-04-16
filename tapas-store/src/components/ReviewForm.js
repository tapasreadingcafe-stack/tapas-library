import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';

// =====================================================================
// ReviewForm — write-a-review widget mounted on BookDetail.
//
// Only visible to signed-in members who either:
//   (a) currently or previously borrowed the book (circulation row), OR
//   (b) purchased the book (customer_orders -> customer_order_items)
//
// Prevents duplicate reviews per member/book. Shows "Edit your review"
// instead when one exists.
// =====================================================================

export default function ReviewForm({ bookId, member, onReviewSaved }) {
  const [eligible, setEligible] = useState(null); // null = loading
  const [existingReview, setExistingReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!member || !bookId) {
      setEligible(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [borrowRes, orderItemsRes, existingRes] = await Promise.all([
          supabase.from('circulation')
            .select('id')
            .eq('member_id', member.id)
            .eq('book_id', bookId)
            .limit(1),
          supabase.from('customer_order_items')
            .select('id, order_id, customer_orders!inner(member_id, status)')
            .eq('book_id', bookId)
            .eq('customer_orders.member_id', member.id)
            .limit(1),
          supabase.from('reviews')
            .select('*')
            .eq('member_id', member.id)
            .eq('book_id', bookId)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const hasBorrow = (borrowRes.data || []).length > 0;
        const hasPurchase = (orderItemsRes.data || []).length > 0;
        setEligible(hasBorrow || hasPurchase);

        if (existingRes.data) {
          setExistingReview(existingRes.data);
          setRating(existingRes.data.rating || 5);
          setText(existingRes.data.review_text || '');
        }
      } catch (err) {
        console.error('[ReviewForm] eligibility check failed', err);
        if (!cancelled) setEligible(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookId, member]);

  if (!member) {
    return (
      <div style={{
        padding: '20px 24px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-muted)',
        fontSize: '14px',
        textAlign: 'center',
      }}>
        <Link to="/login" style={{ color: 'var(--secondary)', fontWeight: 700 }}>
          Sign in
        </Link>
        {' '}to write a review.
      </div>
    );
  }

  if (eligible === null) return null;

  if (!eligible) {
    return (
      <div style={{
        padding: '16px 20px',
        background: 'var(--bg-section)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-subtle)',
        fontSize: '13px',
        textAlign: 'center',
      }}>
        You can write a review after you've borrowed or purchased this book.
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) { setError('Pick a rating between 1 and 5 stars.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        member_id: member.id,
        book_id: bookId,
        rating,
        review_text: text.trim() || null,
      };
      let saved;
      if (existingReview) {
        const { data, error: upErr } = await supabase
          .from('reviews')
          .update(payload)
          .eq('id', existingReview.id)
          .select('*, members(name)')
          .single();
        if (upErr) throw upErr;
        saved = data;
      } else {
        const { data, error: insErr } = await supabase
          .from('reviews')
          .insert(payload)
          .select('*, members(name)')
          .single();
        if (insErr) throw insErr;
        saved = data;
      }
      setExistingReview(saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (onReviewSaved) onReviewSaved(saved);
    } catch (err) {
      setError(err.message || 'Could not save your review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      padding: '28px',
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-ambient)',
      marginBottom: '32px',
    }}>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '2px',
        color: 'var(--secondary)', marginBottom: '10px',
      }}>
        {existingReview ? 'Edit your review' : 'Write a review'}
      </div>
      <div style={{ marginBottom: '14px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            style={{
              fontSize: '30px', cursor: 'pointer', marginRight: '4px',
              color: i <= (hover || rating) ? 'var(--accent)' : 'var(--bg-inset)',
              transition: 'color 120ms',
            }}
          >★</span>
        ))}
        <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-subtle)' }}>
          {rating} / 5
        </span>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Share what you liked (or didn't)…"
        maxLength={1000}
        rows={4}
        className="tps-input"
        style={{
          width: '100%', fontFamily: 'var(--font-body)', fontSize: '14px',
          resize: 'vertical', borderRadius: 'var(--radius-md)',
        }}
      />
      {error && (
        <div style={{
          marginTop: '10px', fontSize: '13px',
          color: '#a63d3d', fontWeight: 600,
        }}>{error}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
        <button
          type="submit"
          disabled={saving}
          className="tps-btn tps-btn-teal"
          style={{ fontSize: '14px', padding: '10px 22px' }}
        >
          {saving ? 'Saving…' : existingReview ? 'Update review' : 'Post review'}
        </button>
        {saved && (
          <span style={{ fontSize: '13px', color: 'var(--secondary)', fontWeight: 700 }}>
            ✓ Saved
          </span>
        )}
      </div>
    </form>
  );
}
