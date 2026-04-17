import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useSiteContent } from '../context/SiteContent';
import PageRenderer from '../blocks/PageRenderer';
import { findPageByPath, NotFound } from '../utils/findPage';

// =====================================================================
// Blog listing — reads from public.blog_posts (managed in dashboard
// under Community & Blog → Blog/Journal tab). Only shows published
// posts. Modern Heritage design.
// =====================================================================

export default function Blog() {
  const content = useSiteContent();
  const matchKey = findPageByPath(content?.pages, '/blog');
  if (matchKey) {
    const blocks = content.pages[matchKey].blocks;
    if (Array.isArray(blocks) && blocks.length > 0) {
      return <PageRenderer pageKey={matchKey} />;
    }
    if (matchKey === 'blog') return <LegacyBlog />;
    return null;
  }
  return <NotFound path="/blog" />;
}

function LegacyBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image, tags, published_at, author_id, staff(name)')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      setPosts(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--bg)', minHeight: '80vh' }}>
      {/* Hero header */}
      <header style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
        color: '#fbfbe2',
        padding: '80px 24px 72px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '11px', fontWeight: 800, letterSpacing: '3px',
          textTransform: 'uppercase', color: 'var(--accent)',
          marginBottom: '16px', fontFamily: 'var(--font-body)',
        }}>
          The Journal
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 700, lineHeight: 1.08,
          letterSpacing: '-0.02em', margin: '0 0 16px',
        }}>
          Stories, reviews, and <br />
          <em style={{ color: 'var(--accent)' }}>reading notes.</em>
        </h1>
        <p style={{
          color: 'rgba(251,251,226,0.75)', fontSize: '17px',
          maxWidth: '520px', margin: '0 auto', lineHeight: 1.7,
        }}>
          Dispatches from the Tapas Reading Cafe team — book reviews, event recaps, author interviews, and the occasional recipe.
        </p>
      </header>

      {/* Posts grid */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 24px 96px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '28px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                <div className="tps-skeleton" style={{ height: '200px' }} />
                <div style={{ padding: '28px' }}>
                  <div className="tps-skeleton" style={{ height: '20px', width: '80%', marginBottom: '12px' }} />
                  <div className="tps-skeleton" style={{ height: '14px', width: '100%', marginBottom: '8px' }} />
                  <div className="tps-skeleton" style={{ height: '14px', width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>✍️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
              No posts yet
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '420px', margin: '0 auto 28px', lineHeight: 1.7 }}>
              Our first blog post is on the way. In the meantime, explore the shelves.
            </p>
            <Link to="/books" className="tps-btn tps-btn-teal">Browse Books</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '28px' }}>
            {posts.map(post => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlogCard({ post }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const author = post.staff?.name || 'Tapas Team';

  return (
    <Link
      to={`/blog/${post.slug || post.id}`}
      className="tps-card tps-card-interactive"
      style={{
        textDecoration: 'none', color: 'inherit',
        display: 'flex', flexDirection: 'column',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}
    >
      {/* Cover image or placeholder */}
      {post.cover_image ? (
        <div style={{ height: '200px', overflow: 'hidden' }}>
          <img src={post.cover_image} alt={post.title} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 400ms var(--ease)',
          }} />
        </div>
      ) : (
        <div style={{
          height: '160px',
          background: 'linear-gradient(145deg, var(--surface-container), var(--surface-container-high))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '48px', opacity: 0.4,
        }}>
          ✍️
        </div>
      )}

      <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tps-chip tps-chip-teal" style={{ fontSize: '10px', padding: '3px 10px' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px', fontWeight: 700, lineHeight: 1.25,
          color: 'var(--text)', marginBottom: '10px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {post.title}
        </h2>

        {post.excerpt && (
          <p style={{
            color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.65,
            flex: 1, marginBottom: '16px',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {post.excerpt}
          </p>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: '14px',
          fontSize: '12px', color: 'var(--text-subtle)',
        }}>
          <span>By <strong style={{ color: 'var(--text-muted)' }}>{author}</strong></span>
          <span>{date}</span>
        </div>
      </div>
    </Link>
  );
}
