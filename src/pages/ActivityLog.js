import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { exportToCSV } from '../utils/exportCSV';

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);`;

const ACTION_ICONS = {
  member_added: '👤', member_updated: '✏️', member_deleted: '🗑️',
  book_added: '📚', book_updated: '📝', book_issued: '📤', book_returned: '📥', book_renewed: '🔄',
  fine_paid: '💰', fine_waived: '🎫',
  cafe_order_placed: '☕', event_created: '🎉', event_registration: '🎟️',
  pos_sale: '🛒', settings_updated: '⚙️',
};

const ACTION_COLORS = {
  member_added: '#1dd1a1', member_updated: '#667eea', member_deleted: '#e74c3c',
  book_added: '#1dd1a1', book_updated: '#667eea', book_issued: '#3498db', book_returned: '#27ae60', book_renewed: '#f39c12',
  fine_paid: '#27ae60', fine_waived: '#9b59b6',
  cafe_order_placed: '#e67e22', event_created: '#667eea', event_registration: '#1dd1a1',
  pos_sale: '#667eea', settings_updated: '#95a5a6',
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('activity_log').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchLogs();
    };
    check();
  }, []);

  useEffect(() => { if (tableReady) fetchLogs(); }, [dateFilter, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from('activity_log').select('*').order('created_at', { ascending: false });
    if (dateFilter) {
      query = query.gte('created_at', dateFilter + 'T00:00:00').lte('created_at', dateFilter + 'T23:59:59');
    }
    if (actionFilter !== 'all') query = query.eq('action', actionFilter);
    const { data } = await query.limit(200);
    setLogs(data || []);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.description?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q);
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  const handleExport = () => {
    if (filtered.length === 0) return alert('No logs to export');
    exportToCSV(filtered.map(l => ({
      Time: new Date(l.created_at).toLocaleString('en-IN'),
      Action: l.action,
      Description: l.description,
      Details: JSON.stringify(l.metadata || {}),
    })), 'activity_log');
  };

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>📋 Activity Log</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <h3>Setup Required</h3>
          <p style={{ fontSize: '14px', marginBottom: '8px' }}>Run this SQL in Supabase SQL Editor:</p>
          <pre style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{SETUP_SQL}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check Again</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        .log-timeline { display: flex; flex-direction: column; gap: 0; }
        .log-item { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; background: white; transition: background 0.15s; }
        .log-item:hover { background: #fafbff; }
        .log-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .log-content { flex: 1; min-width: 0; }
        .log-desc { font-size: 14px; color: #333; font-weight: 500; }
        .log-meta { display: flex; gap: 12px; font-size: 12px; color: #999; margin-top: 2px; flex-wrap: wrap; }
        .log-action-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
        @media (max-width: 768px) {
          .log-filters { flex-direction: column !important; }
          .log-filters input, .log-filters select { width: 100% !important; }
          .log-item { padding: 10px 12px; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>📋 Activity Log</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExport} style={{ padding: '8px 16px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            📥 Export
          </button>
          <button onClick={fetchLogs} style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ background: 'white', padding: '10px 18px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#667eea' }}>{logs.length}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>ACTIVITIES</div>
        </div>
        <div style={{ background: 'white', padding: '10px 18px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1dd1a1' }}>{uniqueActions.length}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>ACTION TYPES</div>
        </div>
      </div>

      {/* Filters */}
      <div className="log-filters" style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }}>
          <option value="all">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
      </div>

      {/* Timeline */}
      {loading ? <p style={{ color: '#999' }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999', background: 'white', borderRadius: '8px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <p>No activity logged yet for this date</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>Activities will appear here as you use the system</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <div className="log-timeline">
            {filtered.map(log => (
              <div key={log.id} className="log-item">
                <div className="log-dot" style={{ background: (ACTION_COLORS[log.action] || '#999') + '20' }}>
                  {ACTION_ICONS[log.action] || '📌'}
                </div>
                <div className="log-content">
                  <div className="log-desc">{log.description}</div>
                  <div className="log-meta">
                    <span>{new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="log-action-badge" style={{ background: (ACTION_COLORS[log.action] || '#999') + '20', color: ACTION_COLORS[log.action] || '#999' }}>
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                    {log.metadata?.member_name && <span>👤 {log.metadata.member_name}</span>}
                    {log.metadata?.book_title && <span>📖 {log.metadata.book_title}</span>}
                    {log.metadata?.amount && <span>₹{log.metadata.amount}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
