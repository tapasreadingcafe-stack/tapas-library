import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// Marketing Hub — 4 automated marketing tools in one page
//   Tab 1: Wishlist restock alerts
//   Tab 2: Birthday offers
//   Tab 3: Review collection
//   Tab 4: Abandoned cart recovery
// =====================================================================

const TABS = [
  { key: 'wishlist',  label: 'Restock alerts',    icon: '❤️' },
  { key: 'birthday',  label: 'Birthday offers',   icon: '🎂' },
  { key: 'reviews',   label: 'Review requests',   icon: '⭐' },
  { key: 'cart',       label: 'Abandoned carts',   icon: '🛒' },
];

export default function MarketingHub() {
  const [tab, setTab] = useState('wishlist');

  return (
    <div style={S.root}>
      <header style={S.header}>
        <h1 style={S.title}>📣 Marketing Hub</h1>
        <p style={S.subtitle}>Automated tools to grow engagement and recover revenue</p>
      </header>

      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            ...S.tab,
            color: tab === t.key ? '#0f172a' : '#64748b',
            borderBottom: tab === t.key ? '2px solid #D4A853' : '2px solid transparent',
            fontWeight: tab === t.key ? 700 : 500,
            background: tab === t.key ? '#fef3c7' : 'transparent',
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === 'wishlist' && <WishlistAlerts />}
      {tab === 'birthday' && <BirthdayOffers />}
      {tab === 'reviews' && <ReviewRequests />}
      {tab === 'cart' && <AbandonedCarts />}
    </div>
  );
}

// =====================================================================
// TAB 1: Wishlist restock alerts
// =====================================================================
function WishlistAlerts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Find books that are wishlisted AND out of stock
      const { data: wishlistBooks } = await supabase
        .from('wishlists')
        .select('id, notify_restock, notified_at, member_id, book_id, members(name, email), books(title, quantity_available)')
        .eq('notify_restock', true)
        .order('created_at', { ascending: false })
        .limit(100);
      setData(wishlistBooks || []);
      setLoading(false);
    })();
  }, []);

  const outOfStock = data.filter(w => w.books?.quantity_available === 0);
  const readyToNotify = data.filter(w => w.books?.quantity_available > 0 && !w.notified_at);

  const markNotified = async (ids) => {
    await supabase.from('wishlists').update({ notified_at: new Date().toISOString() }).in('id', ids);
    setData(prev => prev.map(w => ids.includes(w.id) ? { ...w, notified_at: new Date().toISOString() } : w));
  };

  return (
    <div style={S.section}>
      <div style={S.statsRow}>
        <MiniStat icon="❤️" label="Total wishlisted" value={data.length} />
        <MiniStat icon="🔴" label="Waiting (out of stock)" value={outOfStock.length} />
        <MiniStat icon="✅" label="Ready to notify (back in stock)" value={readyToNotify.length} color="#166534" />
      </div>

      {readyToNotify.length > 0 && (
        <div style={S.actionCard}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              {readyToNotify.length} member{readyToNotify.length === 1 ? '' : 's'} can be notified
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              These wishlisted books are back in stock. Mark as notified after sending emails.
            </div>
          </div>
          <button onClick={() => markNotified(readyToNotify.map(w => w.id))} style={S.actionBtn}>
            ✓ Mark all notified
          </button>
        </div>
      )}

      {loading ? <div style={S.empty}>Loading…</div> : (
        <Table
          headers={['Member', 'Book', 'Stock', 'Notified']}
          rows={data.map(w => [
            w.members?.name || w.members?.email || '—',
            w.books?.title || '—',
            w.books?.quantity_available > 0
              ? <span style={{ color: '#166534', fontWeight: 600 }}>✓ In stock ({w.books.quantity_available})</span>
              : <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ Out of stock</span>,
            w.notified_at
              ? <span style={{ color: '#166534' }}>✓ {new Date(w.notified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              : <span style={{ color: '#94a3b8' }}>—</span>,
          ])}
        />
      )}
    </div>
  );
}

// =====================================================================
// TAB 2: Birthday offers
// =====================================================================
function BirthdayOffers() {
  const [members, setMembers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const [membersRes, offersRes] = await Promise.all([
        supabase.from('members').select('id, name, email, date_of_birth').not('date_of_birth', 'is', null).order('date_of_birth'),
        supabase.from('birthday_offers').select('*, promo_codes(code, discount_value, discount_type)').eq('year', today.getFullYear()),
      ]);
      setMembers(membersRes.data || []);
      setOffers(offersRes.data || []);
      setLoading(false);
    })();
  }, []);

  const today = new Date();
  const thisMonth = members.filter(m => {
    if (!m.date_of_birth) return false;
    const dob = new Date(m.date_of_birth);
    return dob.getMonth() === today.getMonth();
  });

  const upcoming = members.filter(m => {
    if (!m.date_of_birth) return false;
    const dob = new Date(m.date_of_birth);
    const nextMonth = (today.getMonth() + 1) % 12;
    return dob.getMonth() === nextMonth;
  });

  const hasBirthdayOffer = (memberId) => offers.some(o => o.member_id === memberId);

  const createBirthdayCode = async (member) => {
    try {
      const code = `BDAY${member.name?.replace(/\s/g, '').slice(0, 4).toUpperCase() || 'GIFT'}${today.getFullYear()}`;
      const { data: promo, error: promoErr } = await supabase.from('promo_codes').insert({
        code,
        description: `Birthday offer for ${member.name}`,
        discount_type: 'percentage',
        discount_value: 15,
        max_uses: 1,
        per_member: 1,
        expires_at: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString(), // end of month
      }).select().single();
      if (promoErr) throw promoErr;

      await supabase.from('birthday_offers').insert({
        member_id: member.id,
        year: today.getFullYear(),
        promo_id: promo.id,
      });

      setOffers(prev => [...prev, { member_id: member.id, year: today.getFullYear(), promo_id: promo.id, promo_codes: promo }]);
    } catch (err) {
      alert('Failed: ' + (err.message || err));
    }
  };

  return (
    <div style={S.section}>
      <div style={S.statsRow}>
        <MiniStat icon="🎂" label="Members with DOB" value={members.length} />
        <MiniStat icon="🎈" label="Birthdays this month" value={thisMonth.length} color="#D4A853" />
        <MiniStat icon="📅" label="Birthdays next month" value={upcoming.length} />
        <MiniStat icon="🎁" label="Offers sent this year" value={offers.length} />
      </div>

      <h3 style={S.sectionTitle}>🎈 This month's birthdays</h3>
      {loading ? <div style={S.empty}>Loading…</div> : thisMonth.length === 0 ? (
        <div style={S.empty}>No birthdays this month.</div>
      ) : (
        <Table
          headers={['Member', 'Date of birth', 'Offer']}
          rows={thisMonth.map(m => {
            const sent = hasBirthdayOffer(m.id);
            const offer = offers.find(o => o.member_id === m.id);
            return [
              m.name || m.email,
              new Date(m.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              sent
                ? <span style={{ color: '#166534', fontWeight: 600 }}>✓ Code: {offer?.promo_codes?.code}</span>
                : <button onClick={() => createBirthdayCode(m)} style={S.smallBtn}>🎁 Create 15% off code</button>,
            ];
          })}
        />
      )}

      <h3 style={{ ...S.sectionTitle, marginTop: '32px' }}>📅 Next month's birthdays</h3>
      {upcoming.length === 0 ? (
        <div style={S.empty}>None upcoming.</div>
      ) : (
        <Table
          headers={['Member', 'Date of birth']}
          rows={upcoming.map(m => [
            m.name || m.email,
            new Date(m.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          ])}
        />
      )}
    </div>
  );
}

// =====================================================================
// TAB 3: Review requests
// =====================================================================
function ReviewRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('review_requests')
      .select('*, members(name, email), books(title)')
      .order('created_at', { ascending: false })
      .limit(100);
    setRequests(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateRequests = async () => {
    // Find recent orders that don't have review requests yet
    const { data: orders } = await supabase
      .from('customer_order_items')
      .select('order_id, item_name, book_id, customer_orders(member_id, status)')
      .not('book_id', 'is', null)
      .limit(50);

    if (!orders || orders.length === 0) {
      alert('No recent orders found to generate review requests.');
      return;
    }

    const toInsert = [];
    for (const item of orders) {
      if (!item.book_id || !item.customer_orders?.member_id) continue;
      if (item.customer_orders.status === 'cancelled') continue;
      // Deduplicate
      const exists = requests.some(r => r.member_id === item.customer_orders.member_id && r.book_id === item.book_id);
      if (exists) continue;
      toInsert.push({
        member_id: item.customer_orders.member_id,
        book_id: item.book_id,
        order_id: item.order_id,
        status: 'pending',
      });
    }

    if (toInsert.length === 0) {
      alert('All recent orders already have review requests.');
      return;
    }

    const { error } = await supabase.from('review_requests').upsert(toInsert, { onConflict: 'member_id,book_id,order_id', ignoreDuplicates: true });
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    alert(`Created ${toInsert.length} review request(s).`);
    load();
  };

  const markSent = async (id) => {
    await supabase.from('review_requests').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'sent', sent_at: new Date().toISOString() } : r));
  };

  const pending = requests.filter(r => r.status === 'pending');
  const sent = requests.filter(r => r.status === 'sent');
  const completed = requests.filter(r => r.status === 'completed');

  return (
    <div style={S.section}>
      <div style={S.statsRow}>
        <MiniStat icon="📋" label="Total requests" value={requests.length} />
        <MiniStat icon="⏳" label="Pending" value={pending.length} color="#D4A853" />
        <MiniStat icon="📧" label="Sent" value={sent.length} />
        <MiniStat icon="⭐" label="Completed" value={completed.length} color="#166534" />
      </div>

      <div style={S.actionCard}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            Generate review requests from recent orders
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Scans completed orders and creates a review request for each book purchased.
          </div>
        </div>
        <button onClick={generateRequests} style={S.actionBtn}>⭐ Generate</button>
      </div>

      {loading ? <div style={S.empty}>Loading…</div> : requests.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
          No review requests yet. Click "Generate" above to create them from recent orders.
        </div>
      ) : (
        <Table
          headers={['Member', 'Book', 'Status', 'Action']}
          rows={requests.slice(0, 30).map(r => [
            r.members?.name || r.members?.email || '—',
            r.books?.title || '—',
            <StatusPill status={r.status} />,
            r.status === 'pending'
              ? <button onClick={() => markSent(r.id)} style={S.smallBtn}>📧 Mark sent</button>
              : <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>,
          ])}
        />
      )}
    </div>
  );
}

// =====================================================================
// TAB 4: Abandoned cart recovery
// =====================================================================
function AbandonedCarts() {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('cart_tracking')
        .select('*, members(name, email)')
        .eq('converted', false)
        .order('last_updated', { ascending: false })
        .limit(50);
      setCarts(data || []);
      setLoading(false);
    })();
  }, []);

  const stale = carts.filter(c => {
    const age = Date.now() - new Date(c.last_updated).getTime();
    return age > 24 * 60 * 60 * 1000 && !c.reminder_sent;
  });

  const markReminded = async (id) => {
    await supabase.from('cart_tracking').update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() }).eq('id', id);
    setCarts(prev => prev.map(c => c.id === id ? { ...c, reminder_sent: true } : c));
  };

  return (
    <div style={S.section}>
      <div style={S.statsRow}>
        <MiniStat icon="🛒" label="Active carts" value={carts.length} />
        <MiniStat icon="⏰" label="Stale (24h+)" value={stale.length} color="#dc2626" />
        <MiniStat icon="📧" label="Reminders sent" value={carts.filter(c => c.reminder_sent).length} />
      </div>

      <div style={{ ...S.infoCard, marginBottom: '20px' }}>
        <span style={{ fontSize: '16px' }}>💡</span>
        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.55 }}>
          <strong>How it works:</strong> When a logged-in customer adds books to their cart, the store syncs the cart to the server.
          Carts older than 24 hours without checkout appear here. You can mark them as "reminder sent" after emailing the customer.
          <br /><br />
          <strong>Coming next:</strong> Automatic email reminders via Resend with the book cover and a direct checkout link.
        </div>
      </div>

      {loading ? <div style={S.empty}>Loading…</div> : carts.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
          No tracked carts yet. Cart tracking starts when logged-in customers use the store.
        </div>
      ) : (
        <Table
          headers={['Member', 'Items', 'Subtotal', 'Last active', 'Status', 'Action']}
          rows={carts.map(c => [
            c.members?.name || c.members?.email || '—',
            c.item_count,
            `₹${Number(c.subtotal).toFixed(0)}`,
            timeAgo(c.last_updated),
            c.converted
              ? <span style={{ color: '#166534', fontWeight: 600 }}>✓ Converted</span>
              : c.reminder_sent
                ? <span style={{ color: '#D4A853', fontWeight: 600 }}>📧 Reminded</span>
                : <span style={{ color: '#dc2626', fontWeight: 600 }}>⏰ Stale</span>,
            !c.converted && !c.reminder_sent
              ? <button onClick={() => markReminded(c.id)} style={S.smallBtn}>📧 Mark reminded</button>
              : <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>,
          ])}
        />
      )}
    </div>
  );
}

// ── Shared subcomponents ─────────────────────────────────────────────

function MiniStat({ icon, label, value, color }) {
  return (
    <div style={S.miniStat}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: '22px', fontWeight: 800, color: color || '#0f172a' }}>{value}</span>
      <span style={{ fontSize: '11px', color: '#64748b' }}>{label}</span>
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j} style={S.td}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    pending:   { bg: '#fef3c7', color: '#92400e' },
    sent:      { bg: '#dbeafe', color: '#1e40af' },
    completed: { bg: '#dcfce7', color: '#166534' },
    skipped:   { bg: '#f1f5f9', color: '#475569' },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function timeAgo(date) {
  const ms = Date.now() - new Date(date).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Styles ───────────────────────────────────────────────────────────

const S = {
  root: { padding: '28px 32px 60px', maxWidth: '1100px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { marginBottom: '24px' },
  title: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#64748b' },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', marginBottom: '-1px', borderRadius: '8px 8px 0 0', display: 'flex', gap: '6px', alignItems: 'center' },
  section: { minHeight: '400px' },
  sectionTitle: { fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' },
  miniStat: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' },
  actionCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  actionBtn: { padding: '8px 18px', background: '#D4A853', color: '#1a0f08', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  infoCard: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px' },
  smallBtn: { padding: '5px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#0f172a', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  empty: { padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a' },
};
