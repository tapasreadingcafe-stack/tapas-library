import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { cacheGet, cacheSet } from '../utils/cache';

// =====================================================================
// /commerce-insights — unified commerce dashboard (Phase 9).
//
// Tabs:
//   - Sales      : orders + revenue (daily/weekly/monthly)
//   - Members    : cohorts, LTV, outstanding loyalty points
//   - Inventory  : slow movers, low-stock books, fine-aging
//   - Content    : blog post views, abandoned carts
//
// Data comes from the existing tables + Phase 9 additions:
//   customer_orders, customer_order_items, members, books,
//   circulation, loyalty_points, cart_snapshots, content_views.
//
// All numbers are cached in-memory for 5 minutes via src/utils/cache.
// =====================================================================

const TABS = [
  { key: 'sales',     label: 'Sales',     icon: '💹' },
  { key: 'members',   label: 'Members',   icon: '👥' },
  { key: 'inventory', label: 'Inventory', icon: '📦' },
  { key: 'content',   label: 'Content',   icon: '📝' },
];

const RANGES = [
  { key: '7',  label: 'Last 7 days',  days: 7  },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
];

function dateISO(d) { return d.toISOString().slice(0, 10); }

function Sparkline({ values, height = 32, stroke = '#667eea' }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);
  const w = 140;
  const step = w / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');
  return (
    <svg width={w} height={height} style={{ display: 'block' }}>
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={height - (v / max) * height} r="1.6" fill={stroke} />
      ))}
    </svg>
  );
}

function StatCard({ label, value, sub, spark, tint = '#667eea' }) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px', padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column', gap: '6px',
      minWidth: '180px', flex: '1',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: '#2c3e50', fontFamily: '"Playfair Display", serif' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: '#8B6914' }}>{sub}</div>}
      {spark && <Sparkline values={spark} stroke={tint} />}
    </div>
  );
}

function SectionHeader({ title, hint }) {
  return (
    <div style={{ marginTop: '32px', marginBottom: '14px' }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#2c3e50' }}>{title}</h2>
      {hint && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8B6914' }}>{hint}</p>}
    </div>
  );
}

export default function CommerceInsights() {
  const [tab, setTab] = useState('sales');
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [rangeDays]);

  const cacheKey = useMemo(() => `insights_${rangeDays}`, [rangeDays]);

  const fetchAll = async () => {
    const cached = cacheGet(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
      const startIso = dateISO(start);

      const [ordersRes, itemsRes, membersRes, loyaltyRes, snapshotsRes, circOverdueRes, booksRes, contentViewsRes] = await Promise.all([
        supabase.from('customer_orders')
          .select('id, status, subtotal, discount, total, fulfillment_type, member_id, created_at')
          .gte('created_at', start.toISOString())
          .order('created_at', { ascending: true }),
        supabase.from('customer_order_items')
          .select('id, order_id, item_name, book_id, quantity, total_price, customer_orders!inner(created_at, status)')
          .gte('customer_orders.created_at', start.toISOString())
          .in('customer_orders.status', ['paid','ready_for_pickup','fulfilled']),
        supabase.from('members')
          .select('id, created_at, plan, customer_type')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase.from('loyalty_balances').select('balance, lifetime_earned'),
        supabase.from('cart_snapshots')
          .select('id, member_id, items_json, total, created_at, completed_order_id, members(name, email)')
          .is('completed_order_id', null)
          .gte('created_at', start.toISOString())
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('circulation')
          .select('id, due_date, status')
          .eq('status', 'checked_out'),
        supabase.from('books')
          .select('id, title, quantity_available, store_visible, is_borrowable')
          .eq('store_visible', true)
          .limit(2000),
        supabase.from('content_views')
          .select('content_kind, content_ref, created_at')
          .gte('created_at', start.toISOString())
          .limit(2000),
      ]);

      const orders = ordersRes.data || [];
      const paidOrders = orders.filter(o => ['paid','ready_for_pickup','fulfilled'].includes(o.status));

      // Daily revenue
      const dayBuckets = {};
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        dayBuckets[dateISO(d)] = 0;
      }
      for (const o of paidOrders) {
        const k = dateISO(new Date(o.created_at));
        if (k in dayBuckets) dayBuckets[k] += Number(o.total || 0);
      }
      const revenueByDay = Object.entries(dayBuckets).map(([d, v]) => ({ date: d, value: v }));
      const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const totalOrders = paidOrders.length;
      const aov = totalOrders ? totalRevenue / totalOrders : 0;
      const pickupCount = paidOrders.filter(o => o.fulfillment_type === 'pickup').length;
      const deliveryCount = paidOrders.filter(o => o.fulfillment_type === 'delivery').length;

      // Top items
      const itemTotals = {};
      for (const it of (itemsRes.data || [])) {
        itemTotals[it.item_name] = (itemTotals[it.item_name] || 0) + it.quantity;
      }
      const topItems = Object.entries(itemTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, qty]) => ({ name, qty }));

      // Members
      const members = membersRes.data || [];
      const newMembersInRange = members.filter(m => new Date(m.created_at) >= start);
      const loyalty = loyaltyRes.data || [];
      const totalPointsOutstanding = loyalty.reduce((s, r) => s + (r.balance || 0), 0);
      const totalPointsLifetime = loyalty.reduce((s, r) => s + (r.lifetime_earned || 0), 0);
      // Repeat customers
      const orderCountsByMember = {};
      for (const o of paidOrders) {
        orderCountsByMember[o.member_id] = (orderCountsByMember[o.member_id] || 0) + 1;
      }
      const uniqueBuyers = Object.keys(orderCountsByMember).length;
      const repeatBuyers = Object.values(orderCountsByMember).filter(c => c > 1).length;
      const repeatRate = uniqueBuyers ? (repeatBuyers / uniqueBuyers) : 0;
      const ltv = uniqueBuyers ? totalRevenue / uniqueBuyers : 0;

      // Plan breakdown
      const planCounts = {};
      for (const m of members) planCounts[m.plan || 'no_plan'] = (planCounts[m.plan || 'no_plan'] || 0) + 1;

      // Inventory
      const books = booksRes.data || [];
      const booksSoldBookIds = new Set((itemsRes.data || []).filter(it => it.book_id).map(it => it.book_id));
      const slowMovers = books.filter(b => !booksSoldBookIds.has(b.id)).slice(0, 20);
      const lowStock = books.filter(b => (b.quantity_available ?? 0) <= 1).slice(0, 20);

      // Fine aging buckets
      const today = new Date();
      const buckets = { '1-7 days': 0, '8-14 days': 0, '15-30 days': 0, '30+ days': 0 };
      for (const c of (circOverdueRes.data || [])) {
        if (!c.due_date) continue;
        const d = Math.floor((today - new Date(c.due_date)) / 86400000);
        if (d <= 0) continue;
        if (d <= 7) buckets['1-7 days']++;
        else if (d <= 14) buckets['8-14 days']++;
        else if (d <= 30) buckets['15-30 days']++;
        else buckets['30+ days']++;
      }

      // Content
      const contentViews = contentViewsRes.data || [];
      const blogViewCounts = {};
      for (const v of contentViews.filter(v => v.content_kind === 'blog')) {
        blogViewCounts[v.content_ref] = (blogViewCounts[v.content_ref] || 0) + 1;
      }
      const topBlogPosts = Object.entries(blogViewCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([slug, count]) => ({ slug, count }));

      const next = {
        totalRevenue, totalOrders, aov,
        pickupCount, deliveryCount,
        revenueByDay,
        topItems,
        members: members.length,
        newMembersInRange: newMembersInRange.length,
        totalPointsOutstanding, totalPointsLifetime,
        uniqueBuyers, repeatBuyers, repeatRate, ltv,
        planCounts,
        slowMovers, lowStock,
        fineAging: buckets,
        topBlogPosts,
        cartSnapshots: snapshotsRes.data || [],
      };

      cacheSet(cacheKey, next);
      setData(next);
    } catch (err) {
      console.error('[CommerceInsights] fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const resendRecovery = async (snapshotId, memberId) => {
    try {
      const { data: snap } = await supabase.from('cart_snapshots').select('items_json, total, members(name, email)').eq('id', snapshotId).single();
      if (!snap) return;
      await supabase.functions.invoke('send-notification-email', {
        body: {
          to: snap.members?.email,
          subject: 'We saved your cart at Tapas Reading Cafe',
          body: `Hi ${snap.members?.name?.split(' ')[0] || 'there'},\n\nYour cart with ₹${Number(snap.total).toFixed(0)} worth of books is still waiting. Come back and complete your order.\n\n— Tapas Reading Cafe`,
        },
      });
      await supabase.from('cart_snapshots').update({ notified_at: new Date().toISOString() }).eq('id', snapshotId);
      alert('Recovery email sent.');
    } catch (err) {
      alert('Could not send email: ' + err.message);
    }
  };

  const revenueSpark = (data.revenueByDay || []).map(r => r.value);

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#2c3e50' }}>
          📊 Commerce Insights
        </h1>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRangeDays(r.days)} style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 600,
              border: 'none', borderRadius: '16px', cursor: 'pointer',
              background: rangeDays === r.days ? '#667eea' : 'white',
              color: rangeDays === r.days ? 'white' : '#2c3e50',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 16px', fontSize: '13px', fontWeight: 600,
            border: 'none', borderRadius: '10px', cursor: 'pointer',
            background: tab === t.key ? '#2c3e50' : 'white',
            color: tab === t.key ? 'white' : '#2c3e50',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#8B6914' }}>Crunching numbers…</div>
      ) : (
        <>
          {tab === 'sales' && (
            <>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <StatCard label="Revenue" value={`₹${(data.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} sub={`${rangeDays} days`} spark={revenueSpark} />
                <StatCard label="Orders" value={data.totalOrders || 0} sub={`AOV ₹${(data.aov || 0).toFixed(0)}`} />
                <StatCard label="Pickup / Delivery" value={`${data.pickupCount || 0} / ${data.deliveryCount || 0}`} sub="Split by fulfillment" tint="#48BB78" />
                <StatCard label="Unique buyers" value={data.uniqueBuyers || 0} sub={`${data.repeatBuyers || 0} repeat`} tint="#D4A853" />
              </div>

              <SectionHeader title="Top items" hint="Ordered by paid-order quantity" />
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {(data.topItems || []).length === 0 ? (
                  <div style={{ padding: '20px', color: '#8B6914' }}>No sales in this range yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#8B6914' }}>Item</th>
                        <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: '#8B6914' }}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.topItems || []).map(it => (
                        <tr key={it.name} style={{ borderBottom: '1px solid #f7f7f7' }}>
                          <td style={{ padding: '8px', fontSize: '13px', color: '#2c3e50' }}>{it.name}</td>
                          <td style={{ padding: '8px', fontSize: '13px', color: '#2c3e50', textAlign: 'right', fontWeight: 700 }}>{it.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <SectionHeader title="Cart abandonment" hint="Checkouts opened without a completed order" />
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {(data.cartSnapshots || []).length === 0 ? (
                  <div style={{ padding: '16px', color: '#8B6914', fontSize: '13px' }}>
                    No abandoned carts — nice.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#8B6914' }}>Member</th>
                        <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: '#8B6914' }}>Cart total</th>
                        <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: '#8B6914' }}>When</th>
                        <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: '#8B6914' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.cartSnapshots || []).slice(0, 20).map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f7f7f7' }}>
                          <td style={{ padding: '8px', fontSize: '13px', color: '#2c3e50' }}>
                            {s.members?.name || '(guest)'} <span style={{ color: '#8B6914', fontSize: '11px' }}>{s.members?.email}</span>
                          </td>
                          <td style={{ padding: '8px', fontSize: '13px', color: '#2c3e50', textAlign: 'right', fontWeight: 700 }}>
                            ₹{Number(s.total).toFixed(0)}
                          </td>
                          <td style={{ padding: '8px', fontSize: '12px', color: '#8B6914', textAlign: 'right' }}>
                            {new Date(s.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <button
                              onClick={() => resendRecovery(s.id, s.member_id)}
                              style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700, border: 'none', borderRadius: '4px', background: '#667eea', color: 'white', cursor: 'pointer' }}
                            >
                              Email
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {tab === 'members' && (
            <>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <StatCard label="Total members" value={data.members || 0} sub={`${data.newMembersInRange || 0} new in range`} />
                <StatCard label="Repeat rate" value={`${Math.round((data.repeatRate || 0) * 100)}%`} sub={`${data.repeatBuyers || 0} of ${data.uniqueBuyers || 0} buyers`} tint="#48BB78" />
                <StatCard label="LTV (range)" value={`₹${(data.ltv || 0).toFixed(0)}`} sub="Revenue / unique buyer" />
                <StatCard label="Points outstanding" value={data.totalPointsOutstanding || 0} sub={`${data.totalPointsLifetime || 0} lifetime`} tint="#D4A853" />
              </div>

              <SectionHeader title="Plan breakdown" />
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {Object.entries(data.planCounts || {}).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
                  <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid #f3f3f3' }}>
                    <span style={{ fontSize: '13px', color: '#2c3e50', textTransform: 'capitalize' }}>{plan.replace('_', ' ')}</span>
                    <span style={{ fontSize: '13px', color: '#2c3e50', fontWeight: 700 }}>{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'inventory' && (
            <>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <StatCard label="Slow movers" value={(data.slowMovers || []).length} sub="No sales in range" tint="#FC8181" />
                <StatCard label="Low stock" value={(data.lowStock || []).length} sub="≤ 1 copy available" tint="#F6AD55" />
              </div>

              <SectionHeader title="Fine aging" hint="Overdue books grouped by how long they've been overdue" />
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {Object.entries(data.fineAging || {}).map(([range, count]) => (
                  <div key={range} style={{
                    background: 'white', borderRadius: '10px', padding: '14px 20px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    minWidth: '140px',
                  }}>
                    <div style={{ fontSize: '11px', color: '#8B6914', fontWeight: 700, textTransform: 'uppercase' }}>{range}</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: count > 0 ? '#FC8181' : '#2c3e50' }}>{count}</div>
                  </div>
                ))}
              </div>

              <SectionHeader title="Books not sold in range" />
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {(data.slowMovers || []).slice(0, 12).map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid #f3f3f3', fontSize: '13px' }}>
                    <span style={{ color: '#2c3e50' }}>{b.title}</span>
                    <span style={{ color: '#8B6914' }}>{b.quantity_available} in stock</span>
                  </div>
                ))}
                {(data.slowMovers || []).length === 0 && <div style={{ padding: '14px', color: '#8B6914', fontSize: '13px' }}>Every visible book has sold recently. Nice.</div>}
              </div>
            </>
          )}

          {tab === 'content' && (
            <>
              <SectionHeader title="Top blog posts" hint="By view count in range" />
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {(data.topBlogPosts || []).length === 0 ? (
                  <div style={{ padding: '16px', color: '#8B6914', fontSize: '13px' }}>
                    No blog views logged yet. Mount the content_views tracker on BlogPost to start collecting.
                  </div>
                ) : (data.topBlogPosts || []).map(p => (
                  <div key={p.slug} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid #f3f3f3', fontSize: '13px' }}>
                    <Link to={`/store/content`} style={{ color: '#667eea', textDecoration: 'none' }}>{p.slug}</Link>
                    <span style={{ color: '#2c3e50', fontWeight: 700 }}>{p.count} views</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
