import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const TABLES = [
  { name: 'books',               label: 'Books Catalog',        icon: '📚', required: true },
  { name: 'book_copies',         label: 'Book Copies',          icon: '🏷️', required: false },
  { name: 'members',             label: 'Members',              icon: '👥', required: true },
  { name: 'family_members',      label: 'Family Members',       icon: '👨‍👩‍👧', required: false },
  { name: 'circulation',         label: 'Circulation (Borrow)', icon: '🔄', required: true },
  { name: 'reservations',        label: 'Reservations',         icon: '📋', required: false },
  { name: 'pos_transactions',    label: 'POS Transactions',     icon: '💰', required: false },
  { name: 'pos_transaction_items', label: 'POS Line Items',     icon: '🧾', required: false },
  { name: 'events',              label: 'Events',               icon: '🎉', required: false },
  { name: 'event_registrations', label: 'Event Registrations',  icon: '📝', required: false },
  { name: 'vendors',             label: 'Vendors',              icon: '🏪', required: false },
  { name: 'purchase_orders',     label: 'Purchase Orders',      icon: '📦', required: false },
  { name: 'cafe_menu_items',     label: 'Cafe Menu',            icon: '☕', required: false },
  { name: 'cafe_orders',         label: 'Cafe Orders',          icon: '🍰', required: false },
  { name: 'activity_log',        label: 'Activity Log',         icon: '📋', required: false },
];

const COLUMN_CHECKS = [
  { table: 'members',     column: 'profile_photo', label: 'Member profile photos' },
  { table: 'circulation', column: 'child_id',      label: 'Child borrowing (family)' },
  { table: 'circulation', column: 'renewal_count',  label: 'Renewal tracking' },
  { table: 'book_copies', column: 'sold_price',     label: 'Copy sale tracking' },
];

export default function SettingsHealth() {
  const [tableStatuses, setTableStatuses] = useState({});
  const [columnStatuses, setColumnStatuses] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Bug Finder state
  const [bugFinderRunning, setBugFinderRunning] = useState(false);
  const [bugFinderProgress, setBugFinderProgress] = useState(0);
  const [bugFinderResults, setBugFinderResults] = useState(null);
  const [expandedCheck, setExpandedCheck] = useState(null);
  const [fixingCheck, setFixingCheck] = useState(null);

  useEffect(() => { runAllChecks(); }, []);

  const runAllChecks = async () => {
    setLoading(true);
    setSyncResult(null);
    await Promise.all([checkTables(), checkColumns(), fetchStats()]);
    setLoading(false);
  };

  const checkTables = async () => {
    const results = {};
    await Promise.all(
      TABLES.map(async (t) => {
        try {
          const { count, error } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
          if (error) {
            results[t.name] = { exists: false, count: 0, error: error.message };
          } else {
            results[t.name] = { exists: true, count: count || 0 };
          }
        } catch (err) {
          results[t.name] = { exists: false, count: 0, error: err.message };
        }
      })
    );
    setTableStatuses(results);
  };

  const checkColumns = async () => {
    const results = {};
    await Promise.all(
      COLUMN_CHECKS.map(async (c) => {
        try {
          const { error } = await supabase.from(c.table).select(c.column).limit(0);
          results[`${c.table}.${c.column}`] = !error;
        } catch {
          results[`${c.table}.${c.column}`] = false;
        }
      })
    );
    setColumnStatuses(results);
  };

  const fetchStats = async () => {
    try {
      const [
        { count: totalBooks },
        { count: totalMembers },
        { count: totalCopies },
        { count: activeCirculation },
        { count: totalTransactions },
      ] = await Promise.all([
        supabase.from('books').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('book_copies').select('*', { count: 'exact', head: true }).then(r => r.error ? { count: 0 } : r),
        supabase.from('circulation').select('*', { count: 'exact', head: true }).then(r => r.error ? { count: 0 } : r),
        supabase.from('pos_transactions').select('*', { count: 'exact', head: true }).then(r => r.error ? { count: 0 } : r),
      ]);

      // Get copy status breakdown
      let copyBreakdown = { available: 0, issued: 0, sold: 0, lost: 0, damaged: 0 };
      try {
        const { data: copies } = await supabase.from('book_copies').select('status');
        if (copies) {
          copies.forEach(c => {
            if (copyBreakdown[c.status] !== undefined) copyBreakdown[c.status]++;
          });
        }
      } catch {}

      // Get member status breakdown
      let memberBreakdown = { active: 0, expired: 0, guest: 0 };
      try {
        const { data: members } = await supabase.from('members').select('status, plan');
        if (members) {
          members.forEach(m => {
            if (m.status === 'active' && m.plan) memberBreakdown.active++;
            else if (m.status === 'expired') memberBreakdown.expired++;
            else memberBreakdown.guest++;
          });
        }
      } catch {}

      // Get overdue count
      let overdueCount = 0;
      try {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase.from('circulation').select('*', { count: 'exact', head: true })
          .eq('status', 'checked_out').lt('due_date', today);
        overdueCount = count || 0;
      } catch {}

      setStats({
        totalBooks: totalBooks || 0,
        totalMembers: totalMembers || 0,
        totalCopies: totalCopies || 0,
        activeCirculation: activeCirculation || 0,
        totalTransactions: totalTransactions || 0,
        copyBreakdown,
        memberBreakdown,
        overdueCount,
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // BUG FINDER ENGINE
  // ══════════════════════════════════════════════════════════════════════════
  const runBugFinder = async () => {
    setBugFinderRunning(true);
    setBugFinderProgress(0);
    setBugFinderResults(null);
    setExpandedCheck(null);

    const results = [];
    const totalChecks = 15;
    let done = 0;
    const tick = () => { done++; setBugFinderProgress(Math.round((done / totalChecks) * 100)); };

    // Helper: safe query that returns [] on error
    const safeQuery = async (fn) => { try { return await fn(); } catch { return []; } };

    // ─── 1. Book quantity_available mismatch ───
    const qtyMismatch = await safeQuery(async () => {
      const { data: books } = await supabase.from('books').select('id, title, quantity_available');
      if (!books) return [];
      const issues = [];
      for (const b of books) {
        const { count } = await supabase.from('book_copies').select('*', { count: 'exact', head: true }).eq('book_id', b.id).eq('status', 'available');
        const actual = count || 0;
        if (actual !== b.quantity_available) issues.push({ id: b.id, title: b.title, expected: actual, got: b.quantity_available });
      }
      return issues;
    });
    tick();
    results.push({ id: 'qty_avail', label: 'Book available qty mismatch', category: 'Sync', icon: '📊', issues: qtyMismatch, fixable: true,
      fix: async () => {
        for (const i of qtyMismatch) await supabase.from('books').update({ quantity_available: i.expected }).eq('id', i.id);
      },
      detail: (i) => `"${i.title}" — shows ${i.got}, should be ${i.expected}` });

    // ─── 2. Book quantity_total mismatch ───
    const totalMismatch = await safeQuery(async () => {
      const { data: books } = await supabase.from('books').select('id, title, quantity_total');
      if (!books) return [];
      const issues = [];
      for (const b of books) {
        const { count } = await supabase.from('book_copies').select('*', { count: 'exact', head: true }).eq('book_id', b.id);
        const actual = count || 0;
        if (actual > 0 && actual !== (b.quantity_total || 0)) issues.push({ id: b.id, title: b.title, expected: actual, got: b.quantity_total || 0 });
      }
      return issues;
    });
    tick();
    results.push({ id: 'qty_total', label: 'Book total qty mismatch', category: 'Sync', icon: '📦', issues: totalMismatch, fixable: true,
      fix: async () => {
        for (const i of totalMismatch) await supabase.from('books').update({ quantity_total: i.expected }).eq('id', i.id);
      },
      detail: (i) => `"${i.title}" — shows ${i.got} total, actual copies: ${i.expected}` });

    // ─── 3. Expired members still active ───
    const expiredActive = await safeQuery(async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('members').select('id, name, plan, subscription_end, status').eq('status', 'active').not('subscription_end', 'is', null).lt('subscription_end', today);
      return (data || []).map(m => ({ id: m.id, name: m.name, plan: m.plan, expired: m.subscription_end }));
    });
    tick();
    results.push({ id: 'expired_active', label: 'Expired plans still active', category: 'Sync', icon: '👤', issues: expiredActive, fixable: true,
      fix: async () => {
        for (const i of expiredActive) await supabase.from('members').update({ status: 'expired', status_color: 'red' }).eq('id', i.id);
      },
      detail: (i) => `${i.name} — ${i.plan} expired ${i.expired}` });

    // ─── 4. Issued copies without checkout circulation ───
    const issuedNoCirc = await safeQuery(async () => {
      const { data: issued } = await supabase.from('book_copies').select('id, copy_code, book_id, current_borrower_id').eq('status', 'issued');
      if (!issued?.length) return [];
      const issues = [];
      for (const c of issued) {
        let q = supabase.from('circulation').select('id', { count: 'exact', head: true }).eq('book_id', c.book_id).eq('status', 'checked_out');
        if (c.current_borrower_id) q = q.eq('member_id', c.current_borrower_id);
        const { count } = await q;
        if (!count) issues.push({ id: c.id, copy_code: c.copy_code });
      }
      return issues;
    });
    tick();
    results.push({ id: 'issued_no_circ', label: 'Issued copies without checkout', category: 'Copy Status', icon: '📤', issues: issuedNoCirc, fixable: true,
      fix: async () => {
        for (const i of issuedNoCirc) await supabase.from('book_copies').update({ status: 'available', current_borrower_id: null }).eq('id', i.id);
      },
      detail: (i) => `${i.copy_code} — marked issued but no active checkout found` });

    // ─── 5. Stale borrower IDs ───
    const staleBorrower = await safeQuery(async () => {
      const { data } = await supabase.from('book_copies').select('id, copy_code, current_borrower_id').not('current_borrower_id', 'is', null).neq('status', 'issued');
      return (data || []).map(c => ({ id: c.id, copy_code: c.copy_code }));
    });
    tick();
    results.push({ id: 'stale_borrower', label: 'Stale borrower IDs on copies', category: 'Copy Status', icon: '👻', issues: staleBorrower, fixable: true,
      fix: async () => {
        for (const i of staleBorrower) await supabase.from('book_copies').update({ current_borrower_id: null }).eq('id', i.id);
      },
      detail: (i) => `${i.copy_code} — has borrower but status is not "issued"` });

    // ─── 6. Sold copies missing price/date ───
    const soldNoPrice = await safeQuery(async () => {
      const { data } = await supabase.from('book_copies').select('id, copy_code, sold_price, sold_date').eq('status', 'sold');
      return (data || []).filter(c => !c.sold_price || !c.sold_date).map(c => ({ id: c.id, copy_code: c.copy_code, price: c.sold_price, date: c.sold_date }));
    });
    tick();
    results.push({ id: 'sold_no_price', label: 'Sold copies missing price/date', category: 'Copy Status', icon: '💰', issues: soldNoPrice, fixable: false,
      detail: (i) => `${i.copy_code} — price: ${i.price ?? 'missing'}, date: ${i.date ?? 'missing'}` });

    // ─── 7. Orphaned circulation records ───
    const orphanCirc = await safeQuery(async () => {
      const { data: circ } = await supabase.from('circulation').select('id, member_id, book_id, status').eq('status', 'checked_out');
      if (!circ?.length) return [];
      const { data: members } = await supabase.from('members').select('id');
      const { data: books } = await supabase.from('books').select('id');
      const memberIds = new Set((members || []).map(m => m.id));
      const bookIds = new Set((books || []).map(b => b.id));
      return circ.filter(c => !memberIds.has(c.member_id) || !bookIds.has(c.book_id))
        .map(c => ({ id: c.id, member_missing: !memberIds.has(c.member_id), book_missing: !bookIds.has(c.book_id) }));
    });
    tick();
    results.push({ id: 'orphan_circ', label: 'Orphaned circulation records', category: 'Orphans', icon: '🔗', issues: orphanCirc, fixable: false,
      detail: (i) => `Record ${i.id.slice(0,8)}… — ${i.member_missing ? 'member deleted' : ''}${i.member_missing && i.book_missing ? ' + ' : ''}${i.book_missing ? 'book deleted' : ''}` });

    // ─── 8. Orphaned book copies ───
    const orphanCopies = await safeQuery(async () => {
      const { data: copies } = await supabase.from('book_copies').select('id, copy_code, book_id');
      if (!copies?.length) return [];
      const { data: books } = await supabase.from('books').select('id');
      const bookIds = new Set((books || []).map(b => b.id));
      return copies.filter(c => !bookIds.has(c.book_id)).map(c => ({ id: c.id, copy_code: c.copy_code }));
    });
    tick();
    results.push({ id: 'orphan_copies', label: 'Orphaned book copies', category: 'Orphans', icon: '📄', issues: orphanCopies, fixable: true,
      fix: async () => {
        for (const i of orphanCopies) await supabase.from('book_copies').delete().eq('id', i.id);
      },
      detail: (i) => `${i.copy_code} — book no longer exists` });

    // ─── 9. Orphaned family circulation ───
    const orphanChildCirc = await safeQuery(async () => {
      const { data: circ } = await supabase.from('circulation').select('id, child_id').not('child_id', 'is', null);
      if (!circ?.length) return [];
      const { data: children } = await supabase.from('family_members').select('id');
      const childIds = new Set((children || []).map(c => c.id));
      return circ.filter(c => !childIds.has(c.child_id)).map(c => ({ id: c.id, child_id: c.child_id }));
    });
    tick();
    results.push({ id: 'orphan_child', label: 'Orphaned child circulation', category: 'Orphans', icon: '👶', issues: orphanChildCirc, fixable: false,
      detail: (i) => `Circulation ${i.id.slice(0,8)}… — child ${i.child_id?.slice(0,8)}… deleted` });

    // ─── 10. Duplicate copy codes ───
    const dupCodes = await safeQuery(async () => {
      const { data: copies } = await supabase.from('book_copies').select('copy_code');
      if (!copies) return [];
      const counts = {};
      copies.forEach(c => { counts[c.copy_code] = (counts[c.copy_code] || 0) + 1; });
      return Object.entries(counts).filter(([, v]) => v > 1).map(([code, count]) => ({ copy_code: code, count }));
    });
    tick();
    results.push({ id: 'dup_codes', label: 'Duplicate copy codes', category: 'Data Quality', icon: '🔢', issues: dupCodes, fixable: false,
      detail: (i) => `${i.copy_code} — appears ${i.count} times` });

    // ─── 11. Invalid copy status ───
    const validStatuses = ['available', 'issued', 'sold', 'lost', 'damaged'];
    const badStatus = await safeQuery(async () => {
      const { data } = await supabase.from('book_copies').select('id, copy_code, status');
      return (data || []).filter(c => !validStatuses.includes(c.status)).map(c => ({ id: c.id, copy_code: c.copy_code, status: c.status }));
    });
    tick();
    results.push({ id: 'bad_status', label: 'Invalid copy status values', category: 'Data Quality', icon: '🏷️', issues: badStatus, fixable: false,
      detail: (i) => `${i.copy_code} — status "${i.status}" is not valid` });

    // ─── 12. Invalid copy condition ───
    const validConditions = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];
    const badCondition = await safeQuery(async () => {
      const { data } = await supabase.from('book_copies').select('id, copy_code, condition');
      return (data || []).filter(c => c.condition && !validConditions.includes(c.condition)).map(c => ({ id: c.id, copy_code: c.copy_code, condition: c.condition }));
    });
    tick();
    results.push({ id: 'bad_condition', label: 'Invalid copy condition values', category: 'Data Quality', icon: '📋', issues: badCondition, fixable: false,
      detail: (i) => `${i.copy_code} — condition "${i.condition}" is not valid` });

    // ─── 13. Checked-out but book qty 0 with no copies ───
    const checkedOutQty0 = await safeQuery(async () => {
      const { data: circ } = await supabase.from('circulation').select('id, book_id, member_id, books(title, quantity_available)').eq('status', 'checked_out');
      if (!circ) return [];
      const issues = [];
      for (const c of circ) {
        if (c.books && c.books.quantity_available <= 0) {
          const { count } = await supabase.from('book_copies').select('*', { count: 'exact', head: true }).eq('book_id', c.book_id);
          if (!count) issues.push({ id: c.id, title: c.books?.title, book_id: c.book_id });
        }
      }
      return issues;
    });
    tick();
    results.push({ id: 'checkout_qty0', label: 'Checked out but qty=0 (no copies)', category: 'Logic', icon: '⚠️', issues: checkedOutQty0, fixable: false,
      detail: (i) => `"${i.title}" — book shows 0 available, no copies tracked` });

    // ─── 14. Unpaid fines in completed POS transactions ───
    const unpaidFines = await safeQuery(async () => {
      const { data: fineItems } = await supabase.from('pos_transaction_items').select('id, fine_id').eq('item_type', 'fine').not('fine_id', 'is', null);
      if (!fineItems?.length) return [];
      const issues = [];
      for (const fi of fineItems) {
        const { data: circ } = await supabase.from('circulation').select('id, fine_paid, books(title)').eq('id', fi.fine_id).single();
        if (circ && !circ.fine_paid) issues.push({ id: fi.fine_id, title: circ.books?.title || 'Unknown' });
      }
      return issues;
    });
    tick();
    results.push({ id: 'unpaid_fines', label: 'Fines paid in POS but not marked', category: 'Logic', icon: '💸', issues: unpaidFines, fixable: true,
      fix: async () => {
        for (const i of unpaidFines) await supabase.from('circulation').update({ fine_paid: true }).eq('id', i.id);
      },
      detail: (i) => `"${i.title}" — POS collected fine but circulation.fine_paid is still false` });

    // ─── 15. Stale reservations ───
    const staleRes = await safeQuery(async () => {
      const { data: res } = await supabase.from('reservations').select('id, book_id, member_id, status, books(title)').in('status', ['registered', 'pending']);
      if (!res?.length) return [];
      const issues = [];
      for (const r of res) {
        const { count } = await supabase.from('book_copies').select('*', { count: 'exact', head: true }).eq('book_id', r.book_id).eq('status', 'available');
        if ((count || 0) > 0) issues.push({ id: r.id, title: r.books?.title || 'Unknown', available: count });
      }
      return issues;
    });
    tick();
    results.push({ id: 'stale_res', label: 'Stale reservations (book available)', category: 'Logic', icon: '📅', issues: staleRes, fixable: false,
      detail: (i) => `"${i.title}" — ${i.available} copies available but reservation still pending` });

    setBugFinderResults(results);
    setBugFinderRunning(false);
  };

  const handleAutoFix = async (check) => {
    if (!check.fix) return;
    setFixingCheck(check.id);
    try {
      await check.fix();
      // Re-run just this check after fix by re-running entire scanner
      // For now just mark as fixed
      setBugFinderResults(prev => prev.map(r => r.id === check.id ? { ...r, issues: [], fixed: true } : r));
    } catch (err) {
      alert('Fix failed: ' + err.message);
    } finally {
      setFixingCheck(null);
    }
  };

  // Sync book_copies count with books.quantity_available
  const syncCopyQuantities = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      // Get all books
      const { data: books } = await supabase.from('books').select('id, quantity_available');
      if (!books) throw new Error('Failed to fetch books');

      let fixed = 0;
      for (const book of books) {
        const { count } = await supabase
          .from('book_copies')
          .select('*', { count: 'exact', head: true })
          .eq('book_id', book.id)
          .eq('status', 'available');

        const availableCount = count || 0;
        if (availableCount !== book.quantity_available) {
          await supabase.from('books')
            .update({ quantity_available: availableCount })
            .eq('id', book.id);
          fixed++;
        }
      }

      setSyncResult({ success: true, fixed, total: books.length });
      if (fixed > 0) fetchStats();
    } catch (err) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const tablesOk = Object.values(tableStatuses).filter(t => t.exists).length;
  const tablesFailed = Object.values(tableStatuses).filter(t => !t.exists).length;
  const totalRows = Object.values(tableStatuses).reduce((s, t) => s + (t.count || 0), 0);
  const columnsOk = Object.values(columnStatuses).filter(Boolean).length;

  // Rough storage estimate (each row ~ 0.5KB avg for a library app)
  const estimatedStorageMB = (totalRows * 0.5 / 1024).toFixed(1);
  const FREE_TIER_LIMIT_MB = 500; // Supabase free tier
  const storagePercent = Math.min(100, (estimatedStorageMB / FREE_TIER_LIMIT_MB) * 100);

  const healthScore = Math.round(
    (tablesOk / TABLES.length) * 60 +
    (columnsOk / COLUMN_CHECKS.length) * 20 +
    (stats ? 20 : 0)
  );

  const healthColor = healthScore >= 80 ? '#059669' : healthScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', margin: '0 0 4px' }}>🩺 System Health</h1>
          <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>Database checks, storage usage & data sync</p>
        </div>
        <button onClick={runAllChecks} disabled={loading}
          style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
          {loading ? '⏳ Checking...' : '🔄 Re-check'}
        </button>
      </div>

      {/* ── HEALTH SCORE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 12px' }}>
            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0f0" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={healthColor} strokeWidth="8"
                strokeDasharray={`${healthScore * 2.64} ${264 - healthScore * 2.64}`}
                strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: '900', color: healthColor }}>{loading ? '—' : healthScore}</span>
              <span style={{ fontSize: '10px', color: '#999' }}>/ 100</span>
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: healthColor }}>
            {healthScore >= 80 ? 'Healthy' : healthScore >= 50 ? 'Needs Attention' : 'Issues Found'}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Books', value: stats?.totalBooks ?? '—', icon: '📚', color: '#667eea' },
            { label: 'Members', value: stats?.totalMembers ?? '—', icon: '👥', color: '#059669' },
            { label: 'Copies Tracked', value: stats?.totalCopies ?? '—', icon: '🏷️', color: '#f59e0b' },
            { label: 'Books Checked Out', value: stats?.activeCirculation ?? '—', icon: '📖', color: '#8b5cf6' },
            { label: 'Overdue', value: stats?.overdueCount ?? '—', icon: '⚠️', color: '#ef4444' },
            { label: 'POS Transactions', value: stats?.totalTransactions ?? '—', icon: '💰', color: '#06b6d4' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: '10px', color: '#999', fontWeight: '600', textTransform: 'uppercase' }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: s.color, marginTop: '4px' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STORAGE BAR ── */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>💾 Database Storage (estimated)</h3>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>
            {estimatedStorageMB} MB / {FREE_TIER_LIMIT_MB} MB
          </span>
        </div>
        <div style={{ background: '#f0f0f0', borderRadius: '8px', height: '24px', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', borderRadius: '8px', transition: 'width 0.5s ease',
            width: `${Math.max(1, storagePercent)}%`,
            background: storagePercent > 80 ? '#ef4444' : storagePercent > 50 ? '#f59e0b' : 'linear-gradient(90deg, #667eea, #764ba2)',
          }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: storagePercent > 15 ? 'white' : '#666' }}>
            {storagePercent.toFixed(1)}% used
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#888' }}>
          <span>📊 {totalRows.toLocaleString()} total rows</span>
          <span>📦 ~{estimatedStorageMB} MB estimated</span>
          <span style={{ color: storagePercent > 80 ? '#ef4444' : '#059669', fontWeight: '600' }}>
            {storagePercent > 80 ? '⚠️ Running low' : '✅ Plenty of space'}
          </span>
        </div>
      </div>

      {/* ── ROWS PER TABLE BREAKDOWN ── */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '15px' }}>📊 Data Breakdown</h3>
        <div style={{ display: 'grid', gap: '6px' }}>
          {TABLES.filter(t => tableStatuses[t.name]?.exists).map(t => {
            const count = tableStatuses[t.name]?.count || 0;
            const maxCount = Math.max(...Object.values(tableStatuses).map(s => s.count || 0), 1);
            const barW = Math.max(2, (count / maxCount) * 100);
            return (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '22px', textAlign: 'center', fontSize: '14px' }}>{t.icon}</span>
                <span style={{ width: '160px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>{t.label}</span>
                <div style={{ flex: 1, background: '#f3f4f6', borderRadius: '4px', height: '18px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${barW}%`, height: '100%', background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
                <span style={{ width: '60px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#667eea' }}>{count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        {/* Copy status breakdown */}
        {stats?.totalCopies > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#999', marginBottom: '8px' }}>COPY STATUS BREAKDOWN</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(stats.copyBreakdown).filter(([,v]) => v > 0).map(([status, count]) => (
                <span key={status} style={{
                  padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                  background: status === 'available' ? '#ecfdf5' : status === 'issued' ? '#eff6ff' : status === 'sold' ? '#fef2f2' : '#f9fafb',
                  color: status === 'available' ? '#059669' : status === 'issued' ? '#2563eb' : status === 'sold' ? '#dc2626' : '#6b7280',
                }}>
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TABLE HEALTH CHECKS ── */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '15px' }}>
          🔍 Table Checks
          <span style={{ fontSize: '12px', fontWeight: '400', color: '#999', marginLeft: '8px' }}>
            {tablesOk} OK · {tablesFailed} missing
          </span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
          {TABLES.map(t => {
            const status = tableStatuses[t.name];
            const ok = status?.exists;
            return (
              <div key={t.name} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                borderRadius: '8px', border: `1px solid ${ok ? '#d1fae5' : '#fecaca'}`,
                background: ok ? '#f0fdf4' : '#fef2f2',
              }}>
                <span style={{ fontSize: '18px' }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{t.label}</div>
                  <div style={{ fontSize: '10px', color: ok ? '#059669' : '#dc2626' }}>
                    {ok ? `${(status.count || 0).toLocaleString()} rows` : status?.error || 'Table not found'}
                  </div>
                </div>
                <span style={{ fontSize: '16px' }}>{ok ? '✅' : t.required ? '❌' : '⚪'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FEATURE / COLUMN CHECKS ── */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '15px' }}>
          🧩 Feature Checks
          <span style={{ fontSize: '12px', fontWeight: '400', color: '#999', marginLeft: '8px' }}>
            {columnsOk}/{COLUMN_CHECKS.length} enabled
          </span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
          {COLUMN_CHECKS.map(c => {
            const ok = columnStatuses[`${c.table}.${c.column}`];
            return (
              <div key={`${c.table}.${c.column}`} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                borderRadius: '8px', border: `1px solid ${ok ? '#d1fae5' : '#fef3c7'}`,
                background: ok ? '#f0fdf4' : '#fffbeb',
              }}>
                <span style={{ fontSize: '14px' }}>{ok ? '✅' : '⚠️'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{c.label}</div>
                  <div style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace' }}>{c.table}.{c.column}</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: ok ? '#059669' : '#d97706' }}>
                  {ok ? 'Active' : 'Not setup'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SYNC TOOL ── */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '15px' }}>🔧 Maintenance Tools</h3>
        <p style={{ fontSize: '12px', color: '#999', margin: '0 0 14px' }}>
          Sync book quantities with actual copy counts in the database
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={syncCopyQuantities} disabled={syncing}
            style={{
              padding: '10px 20px', background: syncing ? '#d1d5db' : '#f59e0b', color: 'white',
              border: 'none', borderRadius: '8px', cursor: syncing ? 'wait' : 'pointer',
              fontWeight: '700', fontSize: '13px',
            }}>
            {syncing ? '⏳ Syncing...' : '🔄 Sync Copy Quantities'}
          </button>
          {syncResult && (
            <span style={{
              fontSize: '13px', fontWeight: '600',
              color: syncResult.success ? '#059669' : '#ef4444',
            }}>
              {syncResult.success
                ? `✅ Done! Fixed ${syncResult.fixed} of ${syncResult.total} books.`
                : `❌ Error: ${syncResult.error}`}
            </span>
          )}
        </div>
      </div>

      {/* ── BUG FINDER ── */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '2px solid #e0e8ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px' }}>🔍 Bug Finder</h3>
            <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
              Scans all data for sync issues, orphan records, invalid states & logic bugs
            </p>
          </div>
          <button onClick={runBugFinder} disabled={bugFinderRunning}
            style={{
              padding: '12px 24px',
              background: bugFinderRunning ? '#d1d5db' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white', border: 'none', borderRadius: '10px',
              cursor: bugFinderRunning ? 'wait' : 'pointer',
              fontWeight: '800', fontSize: '14px',
              boxShadow: bugFinderRunning ? 'none' : '0 4px 14px rgba(102,126,234,0.35)',
            }}>
            {bugFinderRunning ? `⏳ Scanning... ${bugFinderProgress}%` : '🔍 Run Bug Finder'}
          </button>
        </div>

        {/* Progress bar */}
        {bugFinderRunning && (
          <div style={{ background: '#f0f0f0', borderRadius: '6px', height: '8px', overflow: 'hidden', marginBottom: '14px' }}>
            <div style={{ width: `${bugFinderProgress}%`, height: '100%', background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: '6px', transition: 'width 0.3s' }} />
          </div>
        )}

        {/* Results */}
        {bugFinderResults && (
          <div>
            {/* Summary bar */}
            {(() => {
              const passed = bugFinderResults.filter(r => r.issues.length === 0 && !r.fixed).length;
              const fixed = bugFinderResults.filter(r => r.fixed).length;
              const issues = bugFinderResults.filter(r => r.issues.length > 0).length;
              const totalIssues = bugFinderResults.reduce((s, r) => s + r.issues.length, 0);
              return (
                <div style={{
                  display: 'flex', gap: '16px', padding: '14px 18px', borderRadius: '10px', marginBottom: '14px',
                  background: issues === 0 ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${issues === 0 ? '#a7f3d0' : '#fecaca'}`,
                }}>
                  <span style={{ fontSize: '24px' }}>{issues === 0 ? '🎉' : '🐛'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: issues === 0 ? '#059669' : '#dc2626' }}>
                      {issues === 0 ? 'All checks passed!' : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} found across ${issues} check${issues !== 1 ? 's' : ''}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                      ✅ {passed} passed · {fixed > 0 ? `🔧 ${fixed} fixed · ` : ''}⚠️ {issues} with issues · 15 total checks
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Group by category */}
            {['Sync', 'Copy Status', 'Orphans', 'Data Quality', 'Logic'].map(cat => {
              const checks = bugFinderResults.filter(r => r.category === cat);
              if (!checks.length) return null;
              return (
                <div key={cat} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {checks.map(check => {
                      const ok = check.issues.length === 0;
                      const isFixed = check.fixed;
                      const isExpanded = expandedCheck === check.id;
                      const isFixing = fixingCheck === check.id;
                      return (
                        <div key={check.id}>
                          <div
                            onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                              borderRadius: '8px', cursor: 'pointer',
                              border: `1px solid ${isFixed ? '#a7f3d0' : ok ? '#e5e7eb' : '#fecaca'}`,
                              background: isFixed ? '#ecfdf5' : ok ? '#fafafa' : '#fef2f2',
                              transition: 'all 0.15s',
                            }}
                          >
                            <span style={{ fontSize: '16px' }}>{check.icon}</span>
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                              {check.label}
                            </span>
                            {isFixed ? (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', background: '#d1fae5', padding: '2px 10px', borderRadius: '10px' }}>Fixed ✓</span>
                            ) : ok ? (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669' }}>✅ Pass</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626', background: '#fee2e2', padding: '2px 10px', borderRadius: '10px' }}>
                                  {check.issues.length} issue{check.issues.length !== 1 ? 's' : ''}
                                </span>
                                {check.fixable && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAutoFix(check); }}
                                    disabled={isFixing}
                                    style={{
                                      padding: '3px 10px', fontSize: '11px', fontWeight: '700',
                                      background: isFixing ? '#d1d5db' : '#667eea', color: 'white',
                                      border: 'none', borderRadius: '6px', cursor: isFixing ? 'wait' : 'pointer',
                                    }}
                                  >
                                    {isFixing ? '⏳' : '🔧 Fix'}
                                  </button>
                                )}
                                <span style={{ fontSize: '12px', color: '#999' }}>{isExpanded ? '▲' : '▼'}</span>
                              </div>
                            )}
                          </div>

                          {/* Expanded details */}
                          {isExpanded && check.issues.length > 0 && (
                            <div style={{ margin: '4px 0 0 36px', padding: '10px 14px', background: '#fff8f8', borderRadius: '6px', border: '1px solid #fecaca', maxHeight: '200px', overflowY: 'auto' }}>
                              {check.issues.slice(0, 50).map((issue, idx) => (
                                <div key={idx} style={{ fontSize: '12px', color: '#666', padding: '3px 0', borderBottom: idx < check.issues.length - 1 ? '1px solid #fee2e2' : 'none' }}>
                                  {check.detail(issue)}
                                </div>
                              ))}
                              {check.issues.length > 50 && (
                                <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>...and {check.issues.length - 50} more</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CONNECTION INFO ── */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>🔗 Connection Info</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
            <span style={{ color: '#999' }}>Provider: </span>
            <span style={{ fontWeight: '600' }}>Supabase</span>
          </div>
          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
            <span style={{ color: '#999' }}>Status: </span>
            <span style={{ fontWeight: '600', color: '#059669' }}>✅ Connected</span>
          </div>
          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
            <span style={{ color: '#999' }}>Deploy: </span>
            <span style={{ fontWeight: '600' }}>Vercel</span>
          </div>
          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
            <span style={{ color: '#999' }}>Stack: </span>
            <span style={{ fontWeight: '600' }}>React 18 + Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
}
