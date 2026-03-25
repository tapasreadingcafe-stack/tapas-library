import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { calculateAge, formatDate } from '../utils/membershipUtils';

const CHILD_COLORS = ['#3498db', '#27ae60', '#9b59b6', '#f39c12', '#e91e63'];

function ChildAvatar({ child, color, size = 72 }) {
  const initials = (child.name || '?')[0].toUpperCase();
  if (child.avatar_url) {
    return (
      <img
        src={child.avatar_url}
        alt={child.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${color}`, flexShrink: 0 }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '800', fontSize: size * 0.42, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function ChildProfile() {
  const { memberId, childId } = useParams();
  const navigate = useNavigate();

  const [child, setChild] = useState(null);
  const [parent, setParent] = useState(null);
  const [borrows, setBorrows] = useState([]);
  const [hasChildIdCol, setHasChildIdCol] = useState(false);
  const [childIndex, setChildIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [childId, memberId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Probe for child_id column in circulation
      const { error: probeErr } = await supabase
        .from('circulation')
        .select('child_id')
        .limit(0);
      const hasCol = !probeErr;
      setHasChildIdCol(hasCol);

      const [
        { data: childData },
        { data: parentData },
        { data: siblings },
      ] = await Promise.all([
        supabase.from('family_members').select('*').eq('id', childId).single(),
        supabase.from('members').select('*').eq('id', memberId).single(),
        supabase.from('family_members').select('id').eq('parent_member_id', memberId).order('created_at'),
      ]);

      setChild(childData);
      setParent(parentData);

      if (siblings) {
        const idx = siblings.findIndex(s => s.id === childId);
        setChildIndex(idx >= 0 ? idx : 0);
      }

      if (hasCol && childData) {
        const { data: borrowData } = await supabase
          .from('circulation')
          .select('*, books(title, author, category, book_image)')
          .eq('child_id', childId)
          .order('checkout_date', { ascending: false });
        setBorrows(borrowData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📚</div>
        <div style={{ color: '#999', fontSize: '15px' }}>Loading profile...</div>
      </div>
    );
  }

  if (!child) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🤔</div>
        <div style={{ color: '#666' }}>Child profile not found.</div>
        <button onClick={() => navigate(`/member/${memberId}`)} style={{ marginTop: '14px', padding: '8px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          ← Back to Parent
        </button>
      </div>
    );
  }

  const age = child.date_of_birth ? calculateAge(child.date_of_birth) : child.age;
  const color = CHILD_COLORS[childIndex % CHILD_COLORS.length];
  const returned = borrows.filter(b => b.status === 'returned');
  const currentBorrows = borrows.filter(b => b.status === 'checked_out');
  const overdueCount = currentBorrows.filter(b => new Date(b.due_date) < new Date()).length;

  const genreMap = {};
  returned.forEach(b => {
    const cat = b.books?.category;
    if (cat) genreMap[cat] = (genreMap[cat] || 0) + 1;
  });
  const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div style={{ padding: '20px', background: '#f0f4ff', minHeight: '100vh' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(`/member/${memberId}`)}
        style={{
          padding: '8px 18px', background: color, color: 'white', border: 'none',
          borderRadius: '20px', cursor: 'pointer', marginBottom: '20px',
          fontWeight: '600', fontSize: '13px',
        }}
      >
        ← Back to {parent?.name || 'Parent'}'s Profile
      </button>

      {/* Hero card */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '28px',
        marginBottom: '18px', border: `3px solid ${color}`,
        display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap',
      }}>
        <ChildAvatar child={child} color={color} size={80} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#222', lineHeight: 1 }}>{child.name}</div>
          <div style={{ fontSize: '15px', color: '#666', marginTop: '6px' }}>
            {age ? `Age ${age}` : ''}{age && child.relationship ? ' · ' : ''}{child.relationship || ''}
            {child.date_of_birth && (
              <span style={{ marginLeft: '8px', color: '#aaa', fontSize: '13px' }}>
                ({new Date(child.date_of_birth).toLocaleDateString('en-IN')})
              </span>
            )}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ background: color, color: 'white', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
              👨‍👩‍👧 {parent?.name || 'Family'}'s account
            </span>
            {overdueCount > 0 && (
              <span style={{ background: '#f8d7da', color: '#721c24', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                ⚠️ {overdueCount} overdue
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/Borrow', { state: { parentId: memberId, childId: child.id, childName: child.name } })}
          style={{
            padding: '12px 24px', background: color, color: 'white', border: 'none',
            borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px',
            boxShadow: `0 4px 14px ${color}40`,
          }}
        >
          📚 Borrow a Book
        </button>
      </div>

      {/* child_id column setup notice */}
      {!hasChildIdCol && (
        <div style={{ background: '#fff9e6', border: '1px solid #ffc107', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px', fontSize: '13px' }}>
          <strong>⚠️ Setup Required</strong> — Run this SQL in Supabase to enable child borrowing:
          <pre style={{ background: '#f5f5f5', borderRadius: '6px', padding: '8px 12px', marginTop: '8px', fontSize: '12px', overflowX: 'auto' }}>
            ALTER TABLE circulation ADD COLUMN IF NOT EXISTS child_id UUID;
          </pre>
          <div style={{ color: '#856404', marginTop: '4px' }}>After running, refresh this page to see borrow history.</div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
        {[
          { label: 'Books Borrowed', value: borrows.length, icon: '📚', color },
          { label: 'Books Read', value: returned.length, icon: '✅', color: '#27ae60' },
          { label: 'Currently Out', value: currentBorrows.length, icon: '📖', color: '#f39c12' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white', borderRadius: '12px', padding: '18px', textAlign: 'center',
            border: `2px solid ${s.color}25`,
          }}>
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', fontWeight: '600', letterSpacing: '0.5px' }}>
              {s.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Favourite genres */}
      {topGenres.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700', color: '#333' }}>
            🌟 Favourite Genres
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {topGenres.map(([genre, count], idx) => (
              <span key={genre} style={{
                background: idx === 0 ? color : `${color}18`,
                color: idx === 0 ? 'white' : color,
                padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
              }}>
                {idx === 0 ? '⭐ ' : idx === 1 ? '🥈 ' : '📖 '}{genre}
                <span style={{ opacity: 0.75, fontSize: '11px', marginLeft: '4px' }}>({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Currently borrowed */}
      {hasChildIdCol && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700', color: '#333' }}>
            📖 Currently Borrowed ({currentBorrows.length})
          </h3>
          {currentBorrows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#bbb', fontSize: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              No books currently borrowed.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentBorrows.map(b => {
                const overdue = new Date(b.due_date) < new Date();
                return (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                    background: overdue ? '#fff5f5' : '#f8f9fa', borderRadius: '10px',
                    border: overdue ? '1px solid #f5c6cb' : '1px solid #f0f0f0',
                  }}>
                    {b.books?.book_image ? (
                      <img src={b.books.book_image} alt="" style={{ width: '38px', height: '54px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: '38px', height: '54px', background: `${color}20`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📖</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{b.books?.title}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{b.books?.author}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: overdue ? '#e74c3c' : '#999', fontWeight: overdue ? '700' : '400' }}>
                        {overdue ? '⚠️ Overdue' : 'Due'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{new Date(b.due_date).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reading history */}
      {hasChildIdCol && returned.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700', color: '#333' }}>
            📚 Reading History ({returned.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {returned.slice(0, 15).map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', background: '#fafafa' }}>
                <span style={{ fontSize: '14px', color: '#27ae60' }}>✅</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>{b.books?.title}</span>
                  {b.books?.author && <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '8px' }}>{b.books.author}</span>}
                </div>
                {b.books?.category && (
                  <span style={{ background: `${color}15`, color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>
                    {b.books.category}
                  </span>
                )}
                <span style={{ fontSize: '11px', color: '#ccc', whiteSpace: 'nowrap' }}>
                  {formatDate(b.return_date || b.due_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No history note when column missing */}
      {!hasChildIdCol && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#bbb' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
          <div style={{ fontSize: '14px' }}>Borrow history will appear here once child borrowing is set up.</div>
        </div>
      )}
    </div>
  );
}
