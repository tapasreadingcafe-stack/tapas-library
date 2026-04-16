import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';

// =====================================================================
// /search?q=…  —  Unified storefront search across books, blog posts,
// and events. Results are grouped by type and ranked by simple relevance
// (title match > body/description match). Hits the three tables in
// parallel; each query uses Supabase's .or(ilike) so it can rely on
// GIN/btree indexes without needing full text search plumbing.
// =====================================================================

function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Highlight({ text, q }) {
  if (!q || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(245, 158, 11, 0.3)', padding: '0 2px', borderRadius: '2px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function snippet(s, q, chars = 160) {
  if (!s) return '';
  if (!q) return s.slice(0, chars);
  const lower = s.toLowerCase();
  const i = lower.indexOf(q.toLowerCase());
  if (i < 0) return s.slice(0, chars);
  const start = Math.max(0, i - 40);
  const end = Math.min(s.length, i + q.length + chars);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < s.length ? '…' : '';
  return prefix + s.slice(start, end) + suffix;
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') || '';
  const [input, setInput] = useState(initial);
  const q = useDebounced(input.trim(), 250);
  const [books, setBooks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep the URL ?q= in sync so staff can share a search link
  useEffect(() => {
    if ((params.get('q') || '') !== q) {
      const next = new URLSearchParams(params);
      if (q) next.set('q', q); else next.delete('q');
      setParams(next, { replace: true });
    }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!q || q.length < 2) {
        setBooks([]); setPosts([]); setEvents([]);
        return;
      }
      setLoading(true); setError('');
      const like = `%${q.replace(/[%_]/g, '\\$&')}%`;
      try {
        const [b, p, e] = await Promise.allSettled([
          supabase.from('books')
            .select('id, title, author, category, book_image, sales_price, mrp, discount_percent, is_staff_pick')
            .eq('store_visible', true)
            .or(`title.ilike.${like},author.ilike.${like},category.ilike.${like}`)
            .limit(20),
          supabase.from('blog_posts')
            .select('id, title, slug, body, cover_image, published_at')
            .eq('status', 'published')
            .or(`title.ilike.${like},body.ilike.${like}`)
            .limit(10),
          supabase.from('events')
            .select('id, title, description, image_url, status')
            .or(`title.ilike.${like},description.ilike.${like}`)
            .in('status', ['upcoming', 'published'])
            .limit(10),
        ]);
        if (cancelled) return;
        setBooks(b.status === 'fulfilled' ? (b.value.data || []) : []);
        setPosts(p.status === 'fulfilled' ? (p.value.data || []) : []);
        setEvents(e.status === 'fulfilled' ? (e.value.data || []) : []);
        const firstErr = [b, p, e].find(x => x.status === 'fulfilled' && x.value.error);
        if (firstErr) setError(firstErr.value.error.message);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [q]);

  const totalHits = books.length + posts.length + events.length;
  const tooShort = q && q.length < 2;

  const rankedBooks = useMemo(() => {
    const lower = q.toLowerCase();
    return books.slice().sort((a, b) => {
      const ah = (a.title || '').toLowerCase().startsWith(lower) ? 0 : 1;
      const bh = (b.title || '').toLowerCase().startsWith(lower) ? 0 : 1;
      return ah - bh;
    });
  }, [books, q]);

  return (
    <div style={{
      maxWidth: '960px', margin: '0 auto',
      padding: '48px 24px 80px',
      color: 'var(--tapas-body-color, #5c3a1e)',
    }}>
      <h1 style={{
        fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
        fontSize: '36px', fontWeight: 500, margin: '0 0 24px',
        color: 'var(--tapas-primary, #26170c)',
      }}>Search</h1>

      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', opacity: 0.5 }}>🔍</span>
        <input
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search books, articles, events…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '16px 20px 16px 54px',
            fontSize: '17px', borderRadius: '999px',
            border: '1px solid rgba(38,23,12,0.2)',
            background: '#fff', color: 'var(--tapas-primary, #26170c)',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {tooShort && (
        <div style={{ fontSize: '14px', color: 'var(--tapas-body-color, #5c3a1e)', opacity: 0.7, padding: '20px 0' }}>
          Keep typing — we start searching at 2 characters.
        </div>
      )}

      {!q && (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          fontSize: '15px', color: 'var(--tapas-body-color, #5c3a1e)', opacity: 0.7, lineHeight: 1.6,
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
          Search your Tapas library.<br />
          Try "fiction", an author name, or an event theme.
        </div>
      )}

      {q && !loading && !tooShort && totalHits === 0 && (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          fontSize: '15px', color: 'var(--tapas-body-color, #5c3a1e)', opacity: 0.7,
        }}>
          No matches for <b>"{q}"</b>.
        </div>
      )}

      {loading && (
        <div style={{ fontSize: '13px', opacity: 0.6, padding: '8px 0' }}>Searching…</div>
      )}

      {/* Books */}
      {rankedBooks.length > 0 && (
        <section style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--tapas-accent, #006a6a)', marginBottom: '14px' }}>
            📚 Books · {rankedBooks.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
            {rankedBooks.map(b => (
              <Link key={b.id} to={`/books/${b.id}`} style={{
                display: 'block', textDecoration: 'none',
                background: '#fff', border: '1px solid rgba(38,23,12,0.08)',
                borderRadius: '10px', overflow: 'hidden',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                {b.book_image ? (
                  <img src={b.book_image} alt={b.title || ''} loading="lazy"
                    style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block', background: '#f3f4f6' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '2/3', background: 'linear-gradient(135deg,#ded6b9,#c7baa1)' }} />
                )}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tapas-primary, #26170c)', lineHeight: 1.3, marginBottom: '2px' }}>
                    <Highlight text={b.title || ''} q={q} />
                  </div>
                  {b.author && (
                    <div style={{ fontSize: '11px', color: 'var(--tapas-body-color, #5c3a1e)', opacity: 0.7 }}>
                      <Highlight text={b.author} q={q} />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Blog posts */}
      {posts.length > 0 && (
        <section style={{ marginTop: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--tapas-accent, #006a6a)', marginBottom: '14px' }}>
            ✍ Journal · {posts.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {posts.map(p => (
              <Link key={p.id} to={`/blog/${p.slug || p.id}`} style={{
                display: 'block', textDecoration: 'none',
                padding: '14px 18px',
                background: '#fff', border: '1px solid rgba(38,23,12,0.08)',
                borderRadius: '10px',
              }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--tapas-primary, #26170c)', marginBottom: '4px' }}>
                  <Highlight text={p.title || ''} q={q} />
                </div>
                <div style={{ fontSize: '13px', color: 'var(--tapas-body-color, #5c3a1e)', lineHeight: 1.55 }}>
                  <Highlight text={snippet(p.body || '', q, 180)} q={q} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section style={{ marginTop: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--tapas-accent, #006a6a)', marginBottom: '14px' }}>
            🎟 Events · {events.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map(e => (
              <Link key={e.id} to="/events" style={{
                display: 'block', textDecoration: 'none',
                padding: '14px 18px',
                background: '#fff', border: '1px solid rgba(38,23,12,0.08)',
                borderRadius: '10px',
              }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--tapas-primary, #26170c)', marginBottom: '4px' }}>
                  <Highlight text={e.title || ''} q={q} />
                </div>
                {e.description && (
                  <div style={{ fontSize: '13px', color: 'var(--tapas-body-color, #5c3a1e)', lineHeight: 1.55 }}>
                    <Highlight text={snippet(e.description, q, 180)} q={q} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
