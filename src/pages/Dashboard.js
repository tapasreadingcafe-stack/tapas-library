import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { cacheGet, cacheSet } from '../utils/cache';
import { useDevMode } from '../components/DevMode';
import { getFineSettings, calculateFine } from '../utils/fineUtils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { devMode } = useDevMode();
  const [metrics, setMetrics] = useState({
    totalMembers: 0, totalBooks: 0, checkedOutToday: 0,
    revenueMonth: 0, overdueBooks: 0, outstandingFines: 0, activeCheckouts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [topMembers, setTopMembers] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [dueTodayBooks, setDueTodayBooks] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [cardOrder, setCardOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dashboard_card_order')) || null; } catch { return null; }
  });
  const [shiftNotes, setShiftNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  useEffect(() => { fetchDashboardData(); fetchShiftNotes(); }, []);

  const fetchShiftNotes = async () => {
    const { data } = await supabase.from('shift_notes').select('*, staff(name)').order('created_at', { ascending: false }).limit(5);
    if (data) setShiftNotes(data);
  };

  const addShiftNote = async () => {
    if (!newNote.trim()) return;
    const { data: staff } = await supabase.from('staff').select('id').eq('email', (await supabase.auth.getUser()).data.user?.email).single();
    await supabase.from('shift_notes').insert({ staff_id: staff?.id, note: newNote.trim() });
    setNewNote('');
    setShowNoteInput(false);
    fetchShiftNotes();
  };

  const fetchDashboardData = async (force = false) => {
    if (!force) {
      const cached = cacheGet('dashboard');
      if (cached) {
        setMetrics(cached.metrics); setRecentActivity(cached.recentActivity);
        setWeeklyData(cached.weeklyData); setDueTodayBooks(cached.dueTodayBooks);
        setCategoryData(cached.categoryData); setTopMembers(cached.topMembers);
        setLoading(false); return;
      }
    }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const week7ago = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]; })();

      const [
        { count: membersCount }, { count: booksCount }, { count: checkedOutCount },
        { count: overdueCount }, { count: activeCheckouts }, { data: salesData },
        { data: recentSales }, { data: circData }, { data: dueTodayData },
        { data: overdueForFines }, { data: booksForCats }, { data: activeMembers },
      ] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('circulation').select('id', { count: 'exact', head: true }).eq('status', 'checked_out').eq('checkout_date', today),
        supabase.from('circulation').select('id', { count: 'exact', head: true }).eq('status', 'checked_out').lt('due_date', today),
        supabase.from('circulation').select('id', { count: 'exact', head: true }).eq('status', 'checked_out'),
        supabase.from('sales').select('total_amount').gte('sale_date', firstDay).eq('status', 'completed'),
        supabase.from('sales').select('id, total_amount, sale_date, members(name)').order('sale_date', { ascending: false }).limit(5),
        supabase.from('circulation').select('checkout_date').gte('checkout_date', week7ago).order('checkout_date').limit(500),
        supabase.from('circulation').select('id, due_date, members(name), books(title)').eq('status', 'checked_out').eq('due_date', today).limit(50),
        supabase.from('circulation').select('due_date, fine_paid').eq('status', 'checked_out').lt('due_date', today).eq('fine_paid', false).limit(500),
        supabase.from('books').select('category, quantity_total').limit(500),
        supabase.from('circulation').select('member_id, members(name)').eq('status', 'checked_out').limit(200),
      ]);

      let totalRevenue = salesData?.reduce((s, sale) => s + (sale.total_amount || 0), 0) || 0;
      try { const { data: posData } = await supabase.from('pos_transactions').select('total_amount').gte('created_at', firstDay + 'T00:00:00'); totalRevenue += (posData || []).reduce((s, t) => s + (t.total_amount || 0), 0); } catch {}
      try { const { data: cafeData } = await supabase.from('cafe_orders').select('total_amount').gte('created_at', firstDay + 'T00:00:00').eq('status', 'completed'); totalRevenue += (cafeData || []).reduce((s, t) => s + (t.total_amount || 0), 0); } catch {}

      const fineSettings = await getFineSettings();
      const outstandingFines = (overdueForFines || []).reduce((s, item) => {
        return s + calculateFine(item.due_date, fineSettings).fineAmount;
      }, 0);

      const metricsData = {
        totalMembers: membersCount || 0, totalBooks: booksCount || 0,
        checkedOutToday: checkedOutCount || 0, revenueMonth: totalRevenue,
        overdueBooks: overdueCount || 0, outstandingFines, activeCheckouts: activeCheckouts || 0,
      };

      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const count = (circData || []).filter(c => c.checkout_date === dateStr).length;
        last7.push({ date: dateStr, day: dayName, count, isToday: dateStr === today });
      }

      const catMap = {};
      (booksForCats || []).forEach(b => { catMap[b.category || 'Uncategorized'] = (catMap[b.category || 'Uncategorized'] || 0) + (b.quantity_total || 1); });
      const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

      const memberCounts = {};
      (activeMembers || []).forEach(c => { if (!memberCounts[c.member_id]) memberCounts[c.member_id] = { name: c.members?.name, count: 0 }; memberCounts[c.member_id].count++; });
      const topMem = Object.values(memberCounts).sort((a, b) => b.count - a.count).slice(0, 5);

      cacheSet('dashboard', { metrics: metricsData, recentActivity: recentSales || [], weeklyData: last7, dueTodayBooks: dueTodayData || [], categoryData: catData, topMembers: topMem });
      setMetrics(metricsData); setRecentActivity(recentSales || []); setWeeklyData(last7);
      setDueTodayBooks(dueTodayData || []); setCategoryData(catData); setTopMembers(topMem);
    } catch (error) { console.error('Error fetching dashboard:', error); }
    finally { setLoading(false); }
  };

  const maxWeekly = Math.max(...weeklyData.map(d => d.count), 1);
  const catTotal = categoryData.reduce((s, [, v]) => s + v, 0);
  const catColors = ['#667eea', '#1dd1a1', '#f39c12', '#e74c3c', '#9b59b6', '#3498db'];

  const defaultCards = [
    { id: 0, label: 'Members', value: metrics.totalMembers, color: '#667eea', icon: '👥', link: '/members' },
    { id: 1, label: 'Books', value: metrics.totalBooks, color: '#1dd1a1', icon: '📚', link: '/books' },
    { id: 2, label: 'Today', value: metrics.checkedOutToday, color: '#3498db', icon: '📤', link: '/Borrow' },
    { id: 3, label: 'Active', value: metrics.activeCheckouts, color: '#9b59b6', icon: '📖', link: '/Borrow' },
    { id: 4, label: 'Overdue', value: metrics.overdueBooks, sub: metrics.outstandingFines > 0 ? `₹${metrics.outstandingFines.toLocaleString('en-IN')} fines` : '', color: '#ff9f43', icon: '⚠️', link: '/overdue' },
    { id: 5, label: 'Fines', value: `₹${metrics.outstandingFines.toLocaleString('en-IN')}`, color: '#e74c3c', icon: '💰', link: '/fines' },
    { id: 6, label: 'Revenue', value: `₹${metrics.revenueMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#1dd1a1', icon: '💵', link: '/accounts/overview' },
  ];
  const ordered = cardOrder ? cardOrder.map(id => defaultCards.find(c => c.id === id)).filter(Boolean) : defaultCards;
  defaultCards.forEach(c => { if (!ordered.find(o => o.id === c.id)) ordered.push(c); });

  // Quick action buttons for mobile
  const quickActions = [
    { icon: '📤', label: 'Borrow', path: '/Borrow', color: '#667eea' },
    { icon: '🛒', label: 'POS', path: '/pos', color: '#059669' },
    { icon: '👥', label: 'Members', path: '/members', color: '#8b5cf6' },
    { icon: '📚', label: 'Books', path: '/books', color: '#f59e0b' },
    { icon: '☕', label: 'Cafe', path: '/cafe/menu', color: '#06b6d4' },
    { icon: '📊', label: 'Reports', path: '/reports', color: '#ef4444' },
  ];

  return (
    <div className="db">
      <style>{`
        .db { padding: 20px; max-width: 1100px; margin: 0 auto; }
        .db-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
        .db-head h1 { font-size: 28px; margin: 0 0 2px; }
        .db-head p { color: #999; font-size: 13px; margin: 0; }
        .db-refresh { padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; white-space: nowrap; }

        /* Quick actions - hidden on desktop, shown on mobile */
        .db-quick-actions { display: none; }

        .db-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .db-card { padding: 14px; background: white; border-radius: 12px; text-align: center; transition: transform 0.15s, box-shadow 0.15s; }
        .db-card:active { transform: scale(0.97); }
        .db-card-icon { font-size: 22px; margin-bottom: 4px; }
        .db-card-val { font-size: 24px; font-weight: 800; }
        .db-card-val-sm { font-size: 15px; font-weight: 800; }
        .db-card-label { font-size: 10px; color: #999; margin-top: 3px; letter-spacing: 0.5px; }

        .db-alert { background: #fff3cd; border: 1px solid #ffc107; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; cursor: pointer; }
        .db-alert-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .db-alert-tag { background: white; border: 1px solid #ffc107; padding: 3px 10px; border-radius: 12px; font-size: 12px; white-space: nowrap; }

        .db-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        .db-panel { background: white; border-radius: 12px; padding: 18px; }
        .db-panel h3 { margin: 0 0 14px; font-size: 14px; font-weight: 700; }

        .db-bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 100px; }
        .db-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }

        .db-member-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #f8f9fa; border-radius: 8px; }
        .db-member-rank { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th { text-align: left; padding: 8px; font-weight: 600; font-size: 12px; color: #999; border-bottom: 1px solid #f0f0f0; }
        .db-table td { padding: 8px; font-size: 13px; border-bottom: 1px solid #f8f8f8; }

        /* Skeleton */
        @keyframes shimmer { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        .db-skeleton { padding: 14px; background: white; border-radius: 12px; text-align: center; border-top: 3px solid #e0e0e0; }

        /* ═══ TABLET ═══ */
        @media (max-width: 768px) {
          .db { padding: 12px; }
          .db-head { flex-direction: column; align-items: stretch; }
          .db-head h1 { font-size: 22px; }
          .db-refresh { align-self: flex-end; }
          .db-quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
          .db-metrics { grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px; }
          .db-card { padding: 12px 8px; }
          .db-card-val { font-size: 20px; }
          .db-card-val-sm { font-size: 14px; }
          .db-grid2 { grid-template-columns: 1fr; gap: 12px; }
          .db-panel { padding: 14px; }
          .db-alert-tags { max-height: 60px; overflow-y: auto; }
        }

        /* ═══ MOBILE ═══ */
        @media (max-width: 480px) {
          .db { padding: 8px; }
          .db-head h1 { font-size: 20px; }
          .db-head p { font-size: 11px; }
          .db-quick-actions { grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
          .db-qa-btn { padding: 10px 4px !important; font-size: 10px !important; }
          .db-qa-btn span:first-child { font-size: 20px !important; }
          .db-metrics { grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px; }
          .db-card { padding: 10px 6px; border-radius: 10px; }
          .db-card-icon { font-size: 18px; }
          .db-card-val { font-size: 18px; }
          .db-card-val-sm { font-size: 12px; }
          .db-card-label { font-size: 9px; }
          .db-panel { padding: 12px; border-radius: 10px; }
          .db-panel h3 { font-size: 13px; margin-bottom: 10px; }
          .db-bar-chart { height: 80px; gap: 3px; }
          .db-member-row { padding: 6px 8px; gap: 8px; }
          .db-member-rank { width: 22px; height: 22px; font-size: 10px; }
          .db-table th, .db-table td { padding: 6px 4px; font-size: 11px; }
          .db-alert { padding: 10px 12px; border-radius: 8px; }
          .db-alert-tag { font-size: 10px; padding: 2px 8px; }
        }

        /* ═══ SMALL MOBILE ═══ */
        @media (max-width: 360px) {
          .db-card-val { font-size: 16px; }
          .db-card-val-sm { font-size: 11px; }
          .db-card-label { font-size: 8px; }
          .db-card-icon { font-size: 16px; margin-bottom: 2px; }
        }

        /* Dark theme */
        [data-theme="dark"] .db { color: #d0d8e8; }
        [data-theme="dark"] .db-card, [data-theme="dark"] .db-skeleton { background: #16213e; }
        [data-theme="dark"] .db-panel { background: #16213e; color: #d0d8e8; }
        [data-theme="dark"] .db-panel h3 { color: #e0e8f4; }
        [data-theme="dark"] .db-member-row { background: #1a2744; color: #c8d0e0; }
        [data-theme="dark"] .db-table th { color: #8899cc; }
        [data-theme="dark"] .db-table td { color: #c8d0e0; border-color: #2a3a5a; }
        [data-theme="dark"] .db-alert { background: #3d3520; border-color: #665a2e; color: #ffc107; }
        [data-theme="dark"] .db-alert-tag { background: #2a2a1a; color: #ffc107; border-color: #665a2e; }
        [data-theme="dark"] .db-head p { color: #8899bb; }
        [data-theme="dark"] .db-qa-btn { background: #16213e !important; border-color: #2a3a5a !important; color: #d0d8e8 !important; }
      `}</style>

      {/* Header */}
      <div className="db-head">
        <div>
          <h1>📊 Dashboard</h1>
          <p>Welcome back! Here's your library overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={async () => {
            try {
              const { data, error } = await supabase.functions.invoke('daily-report');
              if (error) throw error;
              if (data?.success) { const toast = document.createElement('div'); toast.textContent = '📊 Report sent!'; toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#38a169;color:white;padding:12px 20px;border-radius:8px;z-index:9999;font-weight:600;'; document.body.appendChild(toast); setTimeout(() => toast.remove(), 3000); }
              else if (data?.skipped) { alert('Daily report is disabled. Enable it in Settings.'); }
              else { alert(data?.error || 'Failed to send report'); }
            } catch (err) { alert('Failed: ' + err.message); }
          }} className="db-refresh" style={{ background: '#667eea', color: 'white' }}>
            📊 Send Report
          </button>
          <button onClick={() => fetchDashboardData(true)} disabled={loading} className="db-refresh">
            {loading ? '⏳' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Quick Actions — mobile only */}
      <div className="db-quick-actions">
        {quickActions.map(a => (
          <button key={a.path} className="db-qa-btn" onClick={() => navigate(a.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '12px 6px', background: 'white', border: `1.5px solid ${a.color}22`,
              borderRadius: '10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600',
              color: a.color,
            }}>
            <span style={{ fontSize: '22px' }}>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Metric Cards */}
      <div className="db-metrics">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="db-skeleton">
              <div style={{ width: 28, height: 28, background: '#f0f0f0', borderRadius: '50%', margin: '0 auto 8px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
              <div style={{ width: '50%', height: 20, background: '#f0f0f0', borderRadius: 4, margin: '0 auto 6px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
              <div style={{ width: '70%', height: 8, background: '#f0f0f0', borderRadius: 4, margin: '0 auto', animation: 'shimmer 1.4s ease-in-out infinite' }} />
            </div>
          ))
        ) : (
          ordered.map((s, idx) => (
            <div key={s.id} className="db-card"
              onClick={() => { if (!devMode) navigate(s.link); }}
              draggable={devMode}
              onDragStart={() => devMode && setDragIdx(idx)}
              onDragOver={e => devMode && e.preventDefault()}
              onDrop={() => {
                if (!devMode || dragIdx === null) return;
                const newOrder = [...ordered]; const [moved] = newOrder.splice(dragIdx, 1);
                newOrder.splice(idx, 0, moved); const ids = newOrder.map(c => c.id);
                setCardOrder(ids); localStorage.setItem('dashboard_card_order', JSON.stringify(ids)); setDragIdx(null);
              }}
              style={{ borderTop: `3px solid ${s.color}`, cursor: devMode ? 'grab' : 'pointer', opacity: dragIdx === idx ? 0.5 : 1 }}
              onMouseEnter={e => { if (!devMode) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="db-card-icon">{s.icon}</div>
              <div className={typeof s.value === 'string' ? 'db-card-val-sm' : 'db-card-val'} style={{ color: s.color }}>{s.value}</div>
              <div className="db-card-label">{s.label.toUpperCase()}</div>
              {s.sub && <div style={{ fontSize: '10px', color: '#e74c3c', fontWeight: 600, marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))
        )}
      </div>

      {/* Due Today Alert */}
      {dueTodayBooks.length > 0 && (
        <div className="db-alert" onClick={() => navigate('/Borrow')}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            📅 {dueTodayBooks.length} Book{dueTodayBooks.length !== 1 ? 's' : ''} Due Today
          </div>
          <div className="db-alert-tags">
            {dueTodayBooks.slice(0, 8).map(item => (
              <span key={item.id} className="db-alert-tag">{item.books?.title?.substring(0, 20)} ({item.members?.name})</span>
            ))}
            {dueTodayBooks.length > 8 && <span className="db-alert-tag">+{dueTodayBooks.length - 8} more</span>}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="db-grid2">
        <div className="db-panel" onClick={() => navigate('/statistics')} style={{ cursor: 'pointer' }}>
          <h3>📅 This Week's Borrows</h3>
          <div className="db-bar-chart">
            {weeklyData.map(d => (
              <div key={d.date} className="db-bar-col">
                <div style={{ fontSize: 10, color: '#667eea', fontWeight: 600, height: 14 }}>{d.count > 0 ? d.count : ''}</div>
                <div style={{ width: '100%', height: `${Math.max(4, (d.count / maxWeekly) * 70)}px`, background: d.isToday ? '#667eea' : '#c7d2fe', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                <div style={{ fontSize: 10, color: d.isToday ? '#667eea' : '#999', fontWeight: d.isToday ? 700 : 400 }}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Shift Handoff Notes */}
        <div className="db-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>📝 Shift Notes</h3>
            <button onClick={() => setShowNoteInput(!showNoteInput)} style={{ padding: '4px 10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
              + Add Note
            </button>
          </div>
          {showNoteInput && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Leave a note for next shift..." onKeyDown={e => e.key === 'Enter' && addShiftNote()}
                style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} autoFocus />
              <button onClick={addShiftNote} style={{ padding: '8px 14px', background: '#38a169', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>Save</button>
            </div>
          )}
          {shiftNotes.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>No notes yet. Leave one for the next shift!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {shiftNotes.map(n => (
                <div key={n.id} style={{ background: '#f8f9fa', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}>
                  <div style={{ color: '#333' }}>{n.note}</div>
                  <div style={{ color: '#999', fontSize: '11px', marginTop: '3px' }}>
                    {n.staff?.name || 'Staff'} · {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="db-panel" onClick={() => navigate('/books')} style={{ cursor: 'pointer' }}>
          <h3>🗂️ Popular Categories</h3>
          {categoryData.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>No category data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {categoryData.map(([cat, count], idx) => {
                const pct = Math.round((count / catTotal) * 100);
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColors[idx], flexShrink: 0 }} />
                    <div style={{ fontSize: 11, color: '#555', width: 75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</div>
                    <div style={{ flex: 1, height: 7, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: catColors[idx], width: `${pct}%`, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#999', width: 28, textAlign: 'right' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="db-grid2">
        <div className="db-panel" onClick={() => navigate('/members')} style={{ cursor: 'pointer' }}>
          <h3>🏆 Most Active Members</h3>
          {topMembers.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>No active borrows.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topMembers.map((m, idx) => (
                <div key={idx} className="db-member-row">
                  <span className="db-member-rank" style={{
                    background: idx === 0 ? '#f39c12' : idx === 1 ? '#95a5a6' : idx === 2 ? '#e67e22' : '#f0f0f0',
                    color: idx < 3 ? 'white' : '#555',
                  }}>{idx + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.name}</span>
                  <span style={{ background: '#667eea', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{m.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="db-panel" onClick={() => navigate('/accounts/overview')} style={{ cursor: 'pointer' }}>
          <h3>📝 Recent Sales</h3>
          {recentActivity.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>No recent sales</p>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="db-table">
                <thead><tr><th>Member</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {recentActivity.map(sale => (
                    <tr key={sale.id}>
                      <td>{sale.members?.name || 'Walk-in'}</td>
                      <td style={{ fontWeight: 600, color: '#27ae60' }}>₹{sale.total_amount?.toLocaleString('en-IN')}</td>
                      <td style={{ fontSize: 11, color: '#999' }}>{new Date(sale.sale_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
