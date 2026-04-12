import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Marketing Dashboard — analytics overview for bookstore marketing
// =====================================================================

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function MarketingDashboard() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ members: 0, newThisMonth: 0, activePromos: 0, totalPoints: 0 });
  const [activityItems, setActivityItems] = useState([]);
  const [campaignClicks, setCampaignClicks] = useState([]);
  const [utmForm, setUtmForm] = useState({
    baseUrl: 'https://www.tapasreadingcafe.com',
    campaign: '',
    source: '',
    medium: '',
  });
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Stats queries
      const [membersRes, newMembersRes, promosRes, pointsRes] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('members').select('id', { count: 'exact', head: true }).gte('created_at', firstOfMonth),
        supabase.from('promo_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('loyalty_points').select('points'),
      ]);

      const totalPoints = (pointsRes.data || []).reduce((s, r) => s + (r.points || 0), 0);
      setStats({
        members: membersRes.count || 0,
        newThisMonth: newMembersRes.count || 0,
        activePromos: promosRes.count || 0,
        totalPoints,
      });

      // Activity feed — 5 recent from each table
      const [promoUsesRes, loyaltyRes, referralRes, reviewReqRes, feedbackRes] = await Promise.all([
        supabase.from('promo_code_uses').select('*, members(name), promo_codes(code, discount_value, discount_type)').order('used_at', { ascending: false }).limit(5),
        supabase.from('loyalty_points').select('*, members(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('referral_uses').select('*, members(name)').order('used_at', { ascending: false }).limit(5),
        supabase.from('review_requests').select('*, members(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('feedback_responses').select('*, members(name)').order('created_at', { ascending: false }).limit(5),
      ]);

      // Merge and sort activity
      const items = [];
      (promoUsesRes.data || []).forEach(r => items.push({
        type: 'promo', date: r.used_at,
        emoji: '\uD83C\uDFF7\uFE0F',
        desc: `${r.promo_codes?.code || 'Code'} used by ${r.members?.name || 'Member'} \u2014 saved ${r.promo_codes?.discount_type === 'percentage' ? r.promo_codes.discount_value + '%' : '\u20B9' + (r.discount_amount || r.promo_codes?.discount_value || 0)}`,
      }));
      (loyaltyRes.data || []).forEach(r => items.push({
        type: 'loyalty', date: r.created_at,
        emoji: '\u2B50',
        desc: `${r.members?.name || 'Member'} ${r.points >= 0 ? 'earned' : 'redeemed'} ${Math.abs(r.points)} points \u2014 ${r.reason || 'activity'}`,
      }));
      (referralRes.data || []).forEach(r => items.push({
        type: 'referral', date: r.used_at,
        emoji: '\uD83E\uDD1D',
        desc: `${r.members?.name || 'Member'} used a referral code`,
      }));
      (reviewReqRes.data || []).forEach(r => items.push({
        type: 'review', date: r.created_at,
        emoji: '\uD83D\uDCDD',
        desc: `Review request sent to ${r.members?.name || 'Member'} \u2014 ${r.status || 'pending'}`,
      }));
      (feedbackRes.data || []).forEach(r => items.push({
        type: 'feedback', date: r.created_at,
        emoji: '\uD83D\uDCAC',
        desc: `Feedback from ${r.members?.name || 'Member'} \u2014 ${r.rating ? r.rating + '/5' : 'submitted'}`,
      }));

      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      setActivityItems(items.slice(0, 20));

      // Campaign clicks
      const clicksRes = await supabase.from('campaign_clicks').select('*').order('clicked_at', { ascending: false });
      setCampaignClicks(clicksRes.data || []);
    } catch (err) {
      console.error('MarketingDashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Campaign stats
  const campaignStats = useMemo(() => {
    const map = {};
    campaignClicks.forEach(c => {
      const key = `${c.campaign || 'unknown'}|${c.source || ''}|${c.medium || ''}`;
      if (!map[key]) map[key] = { campaign: c.campaign || 'unknown', source: c.source || '\u2014', medium: c.medium || '\u2014', clicks: 0 };
      map[key].clicks++;
    });
    return Object.values(map).sort((a, b) => b.clicks - a.clicks);
  }, [campaignClicks]);

  const uniqueCampaigns = useMemo(() => new Set(campaignClicks.map(c => c.campaign)).size, [campaignClicks]);

  // UTM link generator
  const generatedUrl = useMemo(() => {
    if (!utmForm.campaign && !utmForm.source && !utmForm.medium) return '';
    const params = new URLSearchParams();
    if (utmForm.campaign) params.set('utm_campaign', utmForm.campaign);
    if (utmForm.source) params.set('utm_source', utmForm.source);
    if (utmForm.medium) params.set('utm_medium', utmForm.medium);
    const base = utmForm.baseUrl.trim() || 'https://www.tapasreadingcafe.com';
    return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
  }, [utmForm]);

  const copyUrl = () => {
    if (generatedUrl) {
      navigator.clipboard?.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={S.root}>
        <div style={S.empty}>Loading marketing dashboard\u2026</div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>{'\uD83D\uDCCA'} Marketing Dashboard</h1>
          <p style={S.subtitle}>Analytics overview across all marketing channels</p>
        </div>
        <button onClick={() => load()} style={S.refreshBtn}>{'\uD83D\uDD04'} Refresh</button>
      </header>

      {/* ── Top stats ─────────────────────────────────────────── */}
      <div style={S.statsRow}>
        <StatCard icon={'\uD83D\uDC65'} label="Total members" value={stats.members} />
        <StatCard icon={'\uD83C\uDD95'} label="New this month" value={stats.newThisMonth} />
        <StatCard icon={'\uD83C\uDFF7\uFE0F'} label="Active promos" value={stats.activePromos} />
        <StatCard icon={'\u2B50'} label="Loyalty points issued" value={stats.totalPoints.toLocaleString()} />
      </div>

      <div style={S.twoCol}>
        {/* ── Recent activity feed ───────────────────────────── */}
        <section style={S.section}>
          <h2 style={S.sectionTitle}>Recent activity</h2>
          {activityItems.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No recent marketing activity yet
            </div>
          ) : (
            <div style={S.timeline}>
              {activityItems.map((item, i) => (
                <div key={i} style={S.timelineItem}>
                  <span style={S.timelineEmoji}>{item.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.timelineDesc}>{item.desc}</div>
                    <div style={S.timelineTime}>{timeAgo(item.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Campaign attribution ────────────────────────────── */}
        <section style={S.section}>
          <h2 style={S.sectionTitle}>Campaign attribution</h2>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={S.miniStat}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{campaignClicks.length}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Total clicks</div>
            </div>
            <div style={S.miniStat}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{uniqueCampaigns}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Unique campaigns</div>
            </div>
          </div>

          {campaignStats.length > 0 && (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Campaign</th>
                    <th style={S.th}>Source</th>
                    <th style={S.th}>Medium</th>
                    <th style={S.th}>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignStats.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td style={S.td}><span style={S.pill}>{r.campaign}</span></td>
                      <td style={S.td}>{r.source}</td>
                      <td style={S.td}>{r.medium}</td>
                      <td style={S.td}><strong>{r.clicks}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* UTM link generator */}
          <div style={S.utmBox}>
            <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{'\uD83D\uDD17'} Generate UTM link</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <input
                value={utmForm.baseUrl}
                onChange={e => setUtmForm(f => ({ ...f, baseUrl: e.target.value }))}
                placeholder="Base URL"
                style={{ ...S.input, flex: '1 1 100%' }}
              />
              <input
                value={utmForm.campaign}
                onChange={e => setUtmForm(f => ({ ...f, campaign: e.target.value }))}
                placeholder="Campaign name"
                style={{ ...S.input, flex: '1 1 30%' }}
              />
              <input
                value={utmForm.source}
                onChange={e => setUtmForm(f => ({ ...f, source: e.target.value }))}
                placeholder="Source"
                style={{ ...S.input, flex: '1 1 30%' }}
              />
              <input
                value={utmForm.medium}
                onChange={e => setUtmForm(f => ({ ...f, medium: e.target.value }))}
                placeholder="Medium"
                style={{ ...S.input, flex: '1 1 30%' }}
              />
            </div>
            {generatedUrl && (
              <div style={S.utmResult}>
                <code style={S.utmCode}>{generatedUrl}</code>
                <button onClick={copyUrl} style={S.copyBtn}>
                  {copied ? '\u2705 Copied' : '\uD83D\uDCCB Copy'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Quick actions ────────────────────────────────────── */}
      <section style={{ marginTop: '28px' }}>
        <h2 style={S.sectionTitle}>Quick actions</h2>
        <div style={S.actionsRow}>
          <QuickAction emoji={'\uD83C\uDFF7\uFE0F'} label="Create promo code" href="/promo-codes" />
          <QuickAction emoji={'\u2B50'} label="Award points" href="/loyalty" />
          <QuickAction emoji={'\uD83D\uDCC5'} label="Schedule sale" href="/campaigns" />
          <QuickAction emoji={'\uD83D\uDCE8'} label="Send newsletter" href="/newsletter" />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function QuickAction({ emoji, label, href }) {
  return (
    <a href={href} style={S.actionCard}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{emoji}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{label}</div>
    </a>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const S = {
  root: { padding: '28px 32px 60px', maxWidth: '1100px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  title: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#64748b' },
  refreshBtn: { padding: '10px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#475569' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' },
  statCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', textAlign: 'center' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' },
  section: { background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '20px' },
  sectionTitle: { margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#0f172a' },
  timeline: { maxHeight: '420px', overflowY: 'auto' },
  timelineItem: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  timelineEmoji: { fontSize: '18px', flexShrink: 0, width: '28px', textAlign: 'center' },
  timelineDesc: { fontSize: '13px', color: '#0f172a', lineHeight: '1.4', wordBreak: 'break-word' },
  timelineTime: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
  miniStat: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 18px', flex: 1, textAlign: 'center' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '8px 12px', background: '#f8fafc', color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' },
  pill: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', fontFamily: 'ui-monospace, monospace', fontSize: '11px', fontWeight: 700, color: '#0f172a' },
  utmBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginTop: '4px' },
  input: { padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: 'white', boxSizing: 'border-box' },
  utmResult: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' },
  utmCode: { flex: 1, padding: '8px 12px', background: '#0f172a', color: '#D4A853', borderRadius: '8px', fontSize: '11px', fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all', lineHeight: '1.5' },
  copyBtn: { padding: '8px 16px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  actionsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' },
  actionCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', textDecoration: 'none', cursor: 'pointer', transition: 'border-color 150ms, background 150ms' },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' },
};
