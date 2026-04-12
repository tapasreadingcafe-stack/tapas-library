import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';

// =====================================================================
// BlogPost — single post view. Reads from blog_posts by slug.
// Content comes from the dashboard Blog/Journal editor.
// Modern Heritage editorial layout.
// =====================================================================

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Try slug first, then ID fallback
      let { data } = await supabase
        .from('blog_posts')
        .select('*, staff(name)')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (!data) {
        const res = await supabase
          .from('blog_posts')
          .select('*, staff(name)')
          .eq('id', slug)
          .eq('status', 'published')
          .maybeSingle();
        data = res.data;
      }

      setPost(data);

      // Fetch related posts (latest 3 excluding this one)
      if (data) {
        const { data: others } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, cover_image, published_at')
          .eq('status', 'published')
          .neq('id', data.id)
          .order('published_at', { ascending: false })
          .limit(3);
        setRelated(others || []);
      }

      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '80px 24px', fontFamily: 'var(--font-body)' }}>
        <div className="tps-skeleton" style={{ height: '40px', width: '70%', marginBottom: '16px', borderRadius: '6px' }} />
        <div className="tps-skeleton" style={{ height: '16px', width: '40%', marginBottom: '40px', borderRadius: '4px' }} />
        <div className="tps-skeleton" style={{ height: '300px', borderRadius: 'var(--radius-xl)' }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 24px', fontFamily: 'var(--font-body)' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.4 }}>📄</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
          Post not found
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          This post may have been removed or isn't published yet.
        </p>
        <Link to="/blog" className="tps-btn tps-btn-teal">Back to Journal</Link>
      </div>
    );
  }

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const author = post.staff?.name || 'Tapas Team';

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--bg)' }}>
      <article style={{ maxWidth: '780px', margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Back link */}
        <Link to="/blog" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'var(--secondary)', fontSize: '13px', fontWeight: 700,
          fontFamily: 'var(--font-display)', textDecoration: 'none',
          marginBottom: '40px',
        }}>
          ← The Journal
        </Link>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {post.tags.map(tag => (
              <span key={tag} className="tps-chip tps-chip-teal">{tag}</span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          marginBottom: '18px',
        }}>
          {post.title}
        </h1>

        {/* Meta */}
        <div style={{
          display: 'flex', gap: '16px', alignItems: 'center',
          color: 'var(--text-subtle)', fontSize: '14px',
          marginBottom: '40px', flexWrap: 'wrap',
        }}>
          <span>By <strong style={{ color: 'var(--text-muted)' }}>{author}</strong></span>
          <span>·</span>
          <span>{date}</span>
          {post.body && (
            <>
              <span>·</span>
              <span>{Math.ceil(post.body.split(/\s+/).length / 200)} min read</span>
            </>
          )}
        </div>

        {/* Cover image */}
        {post.cover_image && (
          <div style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            marginBottom: '48px',
            boxShadow: 'var(--shadow-float)',
          }}>
            <img src={post.cover_image} alt={post.title} style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        {/* Body — rendered as pre-wrapped text with heritage typography */}
        <div style={{
          fontSize: '17px',
          lineHeight: 1.85,
          color: 'var(--text-muted)',
          whiteSpace: 'pre-line',
          fontFamily: 'var(--font-body)',
        }}>
          {post.body ? post.body.split('\n\n').map((paragraph, i) => {
            // Simple markdown-ish rendering
            if (paragraph.startsWith('# ')) {
              return <h2 key={i} style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--text)', margin: '48px 0 16px', lineHeight: 1.2 }}>{paragraph.slice(2)}</h2>;
            }
            if (paragraph.startsWith('## ')) {
              return <h3 key={i} style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: 'var(--text)', margin: '40px 0 14px', lineHeight: 1.25 }}>{paragraph.slice(3)}</h3>;
            }
            if (paragraph.startsWith('> ')) {
              return (
                <blockquote key={i} style={{
                  margin: '32px 0',
                  padding: '20px 28px',
                  background: 'var(--bg-card)',
                  borderLeft: '4px solid var(--secondary)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: '19px',
                  lineHeight: 1.65,
                  color: 'var(--text)',
                }}>
                  {paragraph.slice(2)}
                </blockquote>
              );
            }
            return <p key={i} style={{ margin: '0 0 24px' }}>{paragraph}</p>;
          }) : (
            <p style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>No content yet.</p>
          )}
        </div>

        {/* Excerpt as pull quote if no body but has excerpt */}
        {!post.body && post.excerpt && (
          <blockquote style={{
            padding: '28px 32px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontStyle: 'italic',
            lineHeight: 1.65,
            color: 'var(--text)',
            boxShadow: 'var(--shadow-ambient)',
          }}>
            {post.excerpt}
          </blockquote>
        )}
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section style={{
          background: 'var(--bg-section)',
          padding: '80px 24px',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px', fontWeight: 700,
              color: 'var(--text)', marginBottom: '32px',
            }}>
              More from the Journal
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {related.map(r => (
                <Link key={r.id} to={`/blog/${r.slug || r.id}`} className="tps-card tps-card-interactive" style={{
                  textDecoration: 'none', color: 'inherit',
                  padding: '24px', borderRadius: 'var(--radius-xl)',
                }}>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px', fontWeight: 600, color: 'var(--text)',
                    marginBottom: '8px', lineHeight: 1.3,
                  }}>
                    {r.title}
                  </h3>
                  {r.excerpt && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.excerpt}
                    </p>
                  )}
                  <div style={{ marginTop: '12px', color: 'var(--secondary)', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                    Read more →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
