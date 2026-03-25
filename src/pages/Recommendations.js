import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function Recommendations() {
  const [members, setMembers] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [allCirculation, setAllCirculation] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [personalRecs, setPersonalRecs] = useState([]);
  const [coReads, setCoReads] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedMember && allCirculation.length > 0) {
      computeRecommendations(selectedMember);
    } else {
      setPersonalRecs([]);
      setCoReads([]);
    }
  }, [selectedMember, allCirculation]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [{ data: membersData }, { data: booksData }, { data: circData }] = await Promise.all([
        supabase.from('members').select('id, name, phone').eq('status', 'active').order('name'),
        supabase.from('books').select('*').order('created_at', { ascending: false }),
        supabase.from('circulation').select('member_id, book_id, checkout_date, status').order('checkout_date', { ascending: false }),
      ]);
      setMembers(membersData || []);
      setAllBooks(booksData || []);
      setAllCirculation(circData || []);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const trendingBooks = computeTrending(circData || [], booksData || [], thirtyDaysAgo);
      setTrending(trendingBooks);
      setNewArrivals((booksData || []).slice(0, 12));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const computeTrending = (circData, booksData, since) => {
    const counts = {};
    circData.forEach(c => {
      if (new Date(c.checkout_date) >= since) {
        counts[c.book_id] = (counts[c.book_id] || 0) + 1;
      }
    });
    const bookMap = {};
    booksData.forEach(b => { bookMap[b.id] = b; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({ ...bookMap[id], checkoutCount: count }))
      .filter(Boolean);
  };

  const computeRecommendations = (memberId) => {
    setRecLoading(true);
    try {
      // Books this member has read
      const memberBookIds = new Set(
        allCirculation.filter(c => c.member_id === memberId).map(c => c.book_id)
      );

      // Genre preferences from what they've read
      const genreCounts = {};
      allBooks.forEach(b => {
        if (memberBookIds.has(b.id) && b.category) {
          genreCounts[b.category] = (genreCounts[b.category] || 0) + 1;
        }
      });
      const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);

      // Personal recs: books NOT read by member, matching top genres
      const recs = allBooks
        .filter(b => !memberBookIds.has(b.id) && b.category && topGenres.includes(b.category))
        .sort((a, b) => topGenres.indexOf(a.category) - topGenres.indexOf(b.category))
        .slice(0, 8);
      setPersonalRecs(recs);

      // "Members who read this also read..." (collaborative filtering)
      // Find members who read the same books
      const similarMemberIds = new Set();
      allCirculation.forEach(c => {
        if (memberBookIds.has(c.book_id) && c.member_id !== memberId) {
          similarMemberIds.add(c.member_id);
        }
      });

      // Books those similar members read that this member hasn't
      const coReadCounts = {};
      allCirculation.forEach(c => {
        if (similarMemberIds.has(c.member_id) && !memberBookIds.has(c.book_id)) {
          coReadCounts[c.book_id] = (coReadCounts[c.book_id] || 0) + 1;
        }
      });
      const bookMap = {};
      allBooks.forEach(b => { bookMap[b.id] = b; });
      const coReadBooks = Object.entries(coReadCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, count]) => ({ ...bookMap[id], sharedReaders: count }))
        .filter(b => b.id);
      setCoReads(coReadBooks);
    } catch (err) { console.error(err); }
    finally { setRecLoading(false); }
  };

  const tabStyle = (tab) => ({
    padding: '8px 18px', border: 'none', borderRadius: '20px', cursor: 'pointer',
    fontWeight: activeTab === tab ? '600' : '400',
    background: activeTab === tab ? '#667eea' : '#f0f0f0',
    color: activeTab === tab ? 'white' : '#666', fontSize: '13px',
  });

  const BookCard = ({ book, badge, badgeColor = '#667eea' }) => (
    <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #eee', position: 'relative', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      {book.book_image ? (
        <img src={book.book_image} alt={book.title}
          style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }} />
      ) : (
        <div style={{ width: '50px', height: '70px', background: '#f0f0f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📖</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '14px', lineHeight: '1.3', marginBottom: '3px' }}>{book.title}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>{book.author}</div>
        {book.category && (
          <span style={{ display: 'inline-block', marginTop: '5px', background: '#e8f4fd', color: '#2980b9', padding: '1px 8px', borderRadius: '10px', fontSize: '11px' }}>{book.category}</span>
        )}
        {badge && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: badgeColor, fontWeight: '600' }}>{badge}</div>
        )}
        <div style={{ marginTop: '6px' }}>
          <span style={{
            background: book.quantity_available > 0 ? '#d4edda' : '#f8d7da',
            color: book.quantity_available > 0 ? '#155724' : '#721c24',
            padding: '1px 8px', borderRadius: '8px', fontSize: '11px'
          }}>
            {book.quantity_available > 0 ? `✓ Available (${book.quantity_available})` : '○ Checked Out'}
          </span>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ icon, text }) => (
    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
      <div style={{ fontSize: '40px', marginBottom: '10px' }}>{icon}</div>
      <div>{text}</div>
    </div>
  );

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>💡 Book Recommendations</h1>
        <p style={{ color: '#999', fontSize: '14px' }}>Personalised suggestions, collaborative filtering, new arrivals & trending.</p>
      </div>

      {/* Member Selector */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>Recommend for:</span>
        <select
          value={selectedMember}
          onChange={e => setSelectedMember(e.target.value)}
          style={{ flex: 1, maxWidth: '320px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="">— Select a member for personal recommendations —</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {selectedMember && (
          <span style={{ fontSize: '13px', color: '#27ae60' }}>
            ✓ {personalRecs.length} personal recs • {coReads.length} collaborative
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('personal')} style={tabStyle('personal')}>🎯 Personal Picks ({personalRecs.length})</button>
        <button onClick={() => setActiveTab('collaborative')} style={tabStyle('collaborative')}>👥 Also Read ({coReads.length})</button>
        <button onClick={() => setActiveTab('trending')} style={tabStyle('trending')}>🔥 Trending ({trending.length})</button>
        <button onClick={() => setActiveTab('new')} style={tabStyle('new')}>✨ New Arrivals ({newArrivals.length})</button>
      </div>

      {/* Personal recommendations */}
      {activeTab === 'personal' && (
        <div>
          {!selectedMember ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎯</div>
              <div>Select a member above to see personalized book recommendations.</div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>Based on their reading history and favourite genres.</div>
            </div>
          ) : recLoading ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>Computing recommendations...</div>
          ) : personalRecs.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
              <EmptyState icon="🎯" text="Not enough reading history to generate personal recommendations. Try the Trending or New Arrivals tabs." />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '10px 14px' }}>
                💡 Books the member hasn't read yet, matched to their favourite genres.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {personalRecs.map(b => <BookCard key={b.id} book={b} badge={`📚 Genre: ${b.category}`} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collaborative filtering */}
      {activeTab === 'collaborative' && (
        <div>
          {!selectedMember ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
              <EmptyState icon="👥" text='Select a member to see "Members who read this also read..." recommendations.' />
            </div>
          ) : coReads.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
              <EmptyState icon="👥" text="Not enough overlap in reading history with other members. Try the Trending tab." />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '10px 14px' }}>
                👥 Books read by members with similar reading tastes who haven't read them yet.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {coReads.map(b => <BookCard key={b.id} book={b} badge={`👥 ${b.sharedReaders} reader${b.sharedReaders !== 1 ? 's' : ''} with similar taste`} badgeColor="#9b59b6" />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trending */}
      {activeTab === 'trending' && (
        <div>
          {trending.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
              <EmptyState icon="🔥" text="No borrows recorded in the last 30 days." />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666', background: '#fff5e6', border: '1px solid #ffd9a0', borderRadius: '6px', padding: '10px 14px' }}>
                🔥 Most borrowed books this month (last 30 days).
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {trending.map((b, idx) => (
                  <BookCard key={b.id} book={b}
                    badge={`🔥 #${idx + 1} — ${b.checkoutCount} borrow${b.checkoutCount !== 1 ? 's' : ''} this month`}
                    badgeColor="#e67e22" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Arrivals */}
      {activeTab === 'new' && (
        <div>
          {newArrivals.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
              <EmptyState icon="✨" text="No books in the catalog yet." />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '10px 14px' }}>
                ✨ Most recently added books to the library collection.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {newArrivals.map((b, idx) => (
                  <BookCard key={b.id} book={b}
                    badge={idx < 3 ? `✨ New arrival` : undefined}
                    badgeColor="#27ae60" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
