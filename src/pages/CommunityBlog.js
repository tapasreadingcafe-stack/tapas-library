import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#D4A853';
const BG = '#f8fafc';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const SETUP_SQL_COMMUNITY = `CREATE TABLE community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  likes INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE community_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;

const SETUP_SQL_BLOG = `CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  body TEXT DEFAULT '',
  excerpt TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  cover_image_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`;

const s = {
  page: { fontFamily: FONT, color: TEXT, minHeight: '100vh', background: BG, padding: '24px' },
  h1: { fontSize: '24px', fontWeight: 700, margin: 0 },
  tabs: { display: 'flex', gap: '0', borderBottom: `2px solid ${BORDER}`, marginBottom: '20px' },
  tab: (active) => ({
    padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
    borderBottom: active ? `3px solid ${ACCENT}` : '3px solid transparent',
    color: active ? ACCENT : '#64748b', background: 'none', border: 'none', transition: 'all .15s',
  }),
  card: { background: '#fff', borderRadius: '10px', border: `1px solid ${BORDER}`, padding: '16px', marginBottom: '16px' },
  stat: { textAlign: 'center', flex: 1 },
  statNum: { fontSize: '28px', fontWeight: 700, color: ACCENT },
  statLabel: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  btn: (variant) => ({
    padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
    background: variant === 'accent' ? ACCENT : variant === 'danger' ? '#ef4444' : '#fff',
    color: variant === 'accent' || variant === 'danger' ? '#fff' : TEXT,
    border: variant === 'outline' ? `1px solid ${BORDER}` : 'none',
  }),
  input: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${BORDER}`, fontSize: '14px', fontFamily: FONT, color: TEXT, boxSizing: 'border-box' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto' },
  toggle: (on) => ({
    width: '36px', height: '20px', borderRadius: '10px', background: on ? ACCENT : '#cbd5e1',
    position: 'relative', cursor: 'pointer', border: 'none', transition: 'background .2s',
  }),
  toggleDot: (on) => ({
    width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
    position: 'absolute', top: '2px', left: on ? '18px' : '2px', transition: 'left .2s',
  }),
  badge: (color) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
    background: color === 'green' ? '#dcfce7' : color === 'yellow' ? '#fef9c3' : '#f1f5f9',
    color: color === 'green' ? '#166534' : color === 'yellow' ? '#854d0e' : '#475569',
  }),
};

function Toggle({ value, onChange }) {
  return (
    <button style={s.toggle(value)} onClick={() => onChange(!value)}>
      <div style={s.toggleDot(value)} />
    </button>
  );
}

function slugify(t) {
  return t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function CommunityBlog() {
  const { staff } = useAuth();
  const [tab, setTab] = useState('community');
  // Community state
  const [cTableExists, setCTableExists] = useState(null);
  const [posts, setPosts] = useState([]);
  const [books, setBooks] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [expandedPost, setExpandedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cForm, setCForm] = useState({ content: '', book_id: '' });
  const [cLoading, setCLoading] = useState(true);
  // Blog state
  const [bTableExists, setBTableExists] = useState(null);
  const [blogPosts, setBlogPosts] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [bForm, setBForm] = useState({ title: '', slug: '', body: '', excerpt: '', tags: '', status: 'draft', cover_image_url: '' });
  const [bLoading, setBLoading] = useState(true);
  const [bSaving, setBSaving] = useState(false);

  // ---- Community ----
  const probeComm = useCallback(async () => {
    const { error } = await supabase.from('community_posts').select('id').limit(0);
    const ok = !error;
    setCTableExists(ok);
    if (ok) fetchComm();
    else setCLoading(false);
  }, []);

  const fetchComm = useCallback(async () => {
    setCLoading(true);
    try {
      const [{ data: p }, { data: b }, { data: cc }] = await Promise.all([
        supabase.from('community_posts').select('*, members(name)').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('books').select('id, title').order('title'),
        supabase.from('community_comments').select('post_id'),
      ]);
      setPosts(p || []);
      setBooks(b || []);
      const counts = {};
      (cc || []).forEach(c => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
      setCommentCounts(counts);
    } catch (e) { console.error(e); }
    finally { setCLoading(false); }
  }, []);

  const toggleField = async (id, field, val) => {
    await supabase.from('community_posts').update({ [field]: val }).eq('id', id);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const deletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    await supabase.from('community_posts').delete().eq('id', id);
    setPosts(prev => prev.filter(p => p.id !== id));
    if (expandedPost === id) setExpandedPost(null);
  };

  const createPost = async () => {
    if (!cForm.content.trim()) return alert('Content is required');
    const payload = { content: cForm.content.trim(), approved: true, member_id: null };
    if (cForm.book_id) payload.book_id = cForm.book_id;
    const { error } = await supabase.from('community_posts').insert(payload);
    if (error) return alert(error.message);
    setShowCreateModal(false);
    setCForm({ content: '', book_id: '' });
    fetchComm();
  };

  const loadComments = async (postId) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    setExpandedPost(postId);
    const { data } = await supabase.from('community_comments').select('*, members(name)').eq('post_id', postId).order('created_at');
    setPostComments(data || []);
  };

  const cStats = useMemo(() => ({
    total: posts.length,
    approved: posts.filter(p => p.approved).length,
    pinned: posts.filter(p => p.pinned).length,
  }), [posts]);

  // ---- Blog ----
  const probeBlog = useCallback(async () => {
    const { error } = await supabase.from('blog_posts').select('id').limit(0);
    const ok = !error;
    setBTableExists(ok);
    if (ok) fetchBlog();
    else setBLoading(false);
  }, []);

  const fetchBlog = useCallback(async () => {
    setBLoading(true);
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    setBlogPosts(data || []);
    setBLoading(false);
  }, []);

  const selectBlog = (post) => {
    setSelectedBlog(post.id);
    setBForm({ title: post.title, slug: post.slug, body: post.body || '', excerpt: post.excerpt || '', tags: post.tags || '', status: post.status, cover_image_url: post.cover_image_url || '' });
  };

  const newBlog = () => {
    setSelectedBlog('new');
    setBForm({ title: '', slug: '', body: '', excerpt: '', tags: '', status: 'draft', cover_image_url: '' });
  };

  const saveBlog = async (publish) => {
    if (!bForm.title.trim()) return alert('Title is required');
    const slug = bForm.slug || slugify(bForm.title);
    const payload = { ...bForm, slug, updated_at: new Date().toISOString() };
    if (publish) { payload.status = 'published'; payload.published_at = new Date().toISOString(); }
    setBSaving(true);
    try {
      if (selectedBlog === 'new') {
        const { error } = await supabase.from('blog_posts').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', selectedBlog);
        if (error) throw error;
      }
      fetchBlog();
      if (selectedBlog === 'new') setSelectedBlog(null);
    } catch (e) { alert(e.message); }
    finally { setBSaving(false); }
  };

  const deleteBlog = async () => {
    if (!window.confirm('Delete this blog post?')) return;
    await supabase.from('blog_posts').delete().eq('id', selectedBlog);
    setSelectedBlog(null);
    fetchBlog();
  };

  const bStats = useMemo(() => ({
    total: blogPosts.length,
    published: blogPosts.filter(p => p.status === 'published').length,
    drafts: blogPosts.filter(p => p.status === 'draft').length,
  }), [blogPosts]);

  useEffect(() => { probeComm(); probeBlog(); }, [probeComm, probeBlog]);

  // When blog form title changes, auto-generate slug
  const setBlogField = (field, value) => {
    setBForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'title') next.slug = slugify(value);
      return next;
    });
  };

  const setupTable = async (sql, probe) => {
    const { error } = await supabase.rpc('exec_sql', { query: sql }).maybeSingle();
    if (error) alert(error.message);
    else probe();
  };

  // ---- Render helpers ----
  const renderStats = (items) => (
    <div style={{ ...s.card, display: 'flex', gap: '16px' }}>
      {items.map(([label, num]) => (
        <div key={label} style={s.stat}>
          <div style={s.statNum}>{num}</div>
          <div style={s.statLabel}>{label}</div>
        </div>
      ))}
    </div>
  );

  const renderSetup = (sql, probe, label) => (
    <div style={{ ...s.card, textAlign: 'center', padding: '48px' }}>
      <p style={{ color: '#64748b', marginBottom: '16px' }}>The <b>{label}</b> tables need to be created first.</p>
      <pre style={{ background: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '12px', textAlign: 'left', overflow: 'auto', maxHeight: '200px', marginBottom: '16px' }}>{sql}</pre>
      <button style={s.btn('accent')} onClick={() => setupTable(sql, probe)}>Create Tables</button>
    </div>
  );

  // ---- Community Tab ----
  const renderCommunity = () => {
    if (cTableExists === null || cLoading) return <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>Loading...</div>;
    if (cTableExists === false) return renderSetup(SETUP_SQL_COMMUNITY, probeComm, 'community');

    return (
      <div>
        {renderStats([['Total Posts', cStats.total], ['Approved', cStats.approved], ['Pinned', cStats.pinned]])}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button style={s.btn('accent')} onClick={() => setShowCreateModal(true)}>+ Staff Post</button>
        </div>
        <div style={s.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                {['Member', 'Content', 'Likes', 'Comments', 'Approved', 'Pinned', 'Date', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <React.Fragment key={p.id}>
                  <tr style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onClick={() => loadComments(p.id)}>
                    <td style={{ padding: '10px' }}>{p.members?.name || 'Staff'}</td>
                    <td style={{ padding: '10px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.content?.substring(0, 80)}{p.content?.length > 80 ? '...' : ''}
                    </td>
                    <td style={{ padding: '10px' }}>{p.likes || 0}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={s.badge('yellow')}>{commentCounts[p.id] || 0}</span>
                    </td>
                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                      <Toggle value={p.approved} onChange={(v) => toggleField(p.id, 'approved', v)} />
                    </td>
                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                      <Toggle value={p.pinned} onChange={(v) => toggleField(p.id, 'pinned', v)} />
                    </td>
                    <td style={{ padding: '10px', color: '#64748b', fontSize: '12px' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '10px' }} onClick={e => e.stopPropagation()}>
                      <button style={{ ...s.btn('danger'), padding: '4px 10px', fontSize: '12px' }} onClick={() => deletePost(p.id)}>Delete</button>
                    </td>
                  </tr>
                  {expandedPost === p.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: '0 10px 10px 30px', background: '#f8fafc' }}>
                        {postComments.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '13px', padding: '8px 0' }}>No comments yet.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 0' }}>
                            {postComments.map(c => (
                              <div key={c.id} style={{ fontSize: '13px', padding: '6px 10px', background: '#fff', borderRadius: '6px', border: `1px solid ${BORDER}` }}>
                                <strong>{c.members?.name || 'Anonymous'}</strong>
                                <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '11px' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                                <div style={{ marginTop: '2px' }}>{c.content}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {posts.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No community posts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {showCreateModal && (
          <div style={s.overlay} onClick={() => setShowCreateModal(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Create Staff Post</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Content *</label>
                <textarea style={{ ...s.input, minHeight: '100px', resize: 'vertical' }} value={cForm.content} onChange={e => setCForm({ ...cForm, content: e.target.value })} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Related Book (optional)</label>
                <select style={s.input} value={cForm.book_id} onChange={e => setCForm({ ...cForm, book_id: e.target.value })}>
                  <option value="">-- None --</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button style={s.btn('outline')} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button style={s.btn('accent')} onClick={createPost}>Post</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---- Blog Tab ----
  const renderBlog = () => {
    if (bTableExists === null || bLoading) return <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>Loading...</div>;
    if (bTableExists === false) return renderSetup(SETUP_SQL_BLOG, probeBlog, 'blog');

    const statusColor = (st) => st === 'published' ? 'green' : st === 'draft' ? 'yellow' : undefined;

    return (
      <div>
        {renderStats([['Total Posts', bStats.total], ['Published', bStats.published], ['Drafts', bStats.drafts]])}
        <div style={{ display: 'flex', gap: '16px', minHeight: '500px' }}>
          {/* Sidebar */}
          <div style={{ width: '260px', flexShrink: 0 }}>
            <button style={{ ...s.btn('accent'), width: '100%', marginBottom: '12px' }} onClick={newBlog}>+ New Post</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {blogPosts.map(bp => (
                <div key={bp.id} onClick={() => selectBlog(bp)} style={{
                  padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: selectedBlog === bp.id ? '#fff' : 'transparent',
                  border: selectedBlog === bp.id ? `1px solid ${ACCENT}` : `1px solid transparent`,
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bp.title || 'Untitled'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={s.badge(statusColor(bp.status))}>{bp.status}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{bp.created_at ? new Date(bp.created_at).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))}
              {blogPosts.length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>No blog posts yet.</p>}
            </div>
          </div>

          {/* Editor */}
          <div style={{ flex: 1 }}>
            {selectedBlog ? (
              <div style={s.card}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Title *</label>
                    <input style={s.input} value={bForm.title} onChange={e => setBlogField('title', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Slug</label>
                    <input style={s.input} value={bForm.slug} onChange={e => setBForm({ ...bForm, slug: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Body</label>
                  <textarea style={{ ...s.input, minHeight: '300px', fontFamily: 'monospace', resize: 'vertical' }} value={bForm.body} onChange={e => setBForm({ ...bForm, body: e.target.value })} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Excerpt</label>
                  <input style={s.input} value={bForm.excerpt} onChange={e => setBForm({ ...bForm, excerpt: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Tags (comma-separated)</label>
                    <input style={s.input} value={bForm.tags} onChange={e => setBForm({ ...bForm, tags: e.target.value })} placeholder="fiction, new-arrivals" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Status</label>
                    <select style={s.input} value={bForm.status} onChange={e => setBForm({ ...bForm, status: e.target.value })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Cover Image URL</label>
                  <input style={s.input} value={bForm.cover_image_url} onChange={e => setBForm({ ...bForm, cover_image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  <div>
                    {selectedBlog !== 'new' && (
                      <button style={s.btn('danger')} onClick={deleteBlog}>Delete</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btn('outline')} onClick={() => saveBlog(false)} disabled={bSaving}>{bSaving ? 'Saving...' : 'Save'}</button>
                    <button style={s.btn('accent')} onClick={() => saveBlog(true)} disabled={bSaving}>Publish</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#94a3b8' }}>
                Select a post or create a new one
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={s.page}>
      <h1 style={{ ...s.h1, marginBottom: '20px' }}>Community & Blog</h1>
      <div style={s.tabs}>
        <button style={s.tab(tab === 'community')} onClick={() => setTab('community')}>Community Wall</button>
        <button style={s.tab(tab === 'blog')} onClick={() => setTab('blog')}>Blog / Journal</button>
      </div>
      {tab === 'community' ? renderCommunity() : renderBlog()}
    </div>
  );
}
