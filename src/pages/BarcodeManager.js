import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { generateBarcodeSVG, generateBarcodeSVGString, encodeCode128B, generateZPL } from '../utils/barcodeUtils';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';
import BarcodeScanner from '../BarcodeScanner';

const PER_PAGE = 25;

const STATUS_COLORS = {
  available: { bg: '#10b981', color: '#ffffff', border: '#059669' },
  issued:    { bg: '#3b82f6', color: '#ffffff', border: '#2563eb' },
  sold:      { bg: '#ef4444', color: '#ffffff', border: '#dc2626' },
  lost:      { bg: '#f59e0b', color: '#ffffff', border: '#d97706' },
  damaged:   { bg: '#ec4899', color: '#ffffff', border: '#db2777' },
};

const STATUS_OPTIONS = ['all', 'available', 'issued', 'sold', 'lost', 'damaged'];
const DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export default function BarcodeManager() {
  const toast = useToast();
  const { isReadOnly } = usePermission();

  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showScanner, setShowScanner] = useState(false);
  const [highlightCopyId, setHighlightCopyId] = useState(null);
  const [scanSessionCount, setScanSessionCount] = useState(0);
  const [recentScans, setRecentScans] = useState([]); // {ok, code, title} for last few scans
  const [selectedOnly, setSelectedOnly] = useState(false);
  // Order in which rows were selected. Used to sort the "Selected
  // only" view so the table reads top→bottom in scan order (1st scan
  // at the top), regardless of when each copy was originally added
  // to book_copies.
  const [selectionOrder, setSelectionOrder] = useState([]);
  const [bookSets, setBookSets] = useState([]);
  const [selectedSetIds, setSelectedSetIds] = useState(new Set());
  const [setsExpanded, setSetsExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(() => localStorage.getItem('barcode_template_key') || '');

  const fetchCopies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_copies')
        .select('*, books(id, title, category, price, mrp, sales_price, author, isbn)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCopies(data || []);
    } catch (err) {
      toast.error('Failed to load barcodes: ' + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCopies(); }, [fetchCopies]);

  const fetchSets = useCallback(async () => {
    const { data } = await supabase
      .from('book_sets')
      .select('*')
      .order('created_at', { ascending: false });
    setBookSets(data || []);
  }, []);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  // Handle a scan from the camera scanner OR a handheld scanner that
  // typed into the modal's input. Detects:
  //   • Our copy code (B-XXX-NNNN borrow / S-XXX-NNNN sale)  → jump to that copy
  //   • Anything else (ISBN, etc.)  → match against books.isbn / title
  // Modal stays OPEN after each scan so you can scan book-after-book
  // and accumulate selections — close manually with the Done button.
  const handleScan = useCallback((rawCode) => {
    if (!rawCode) return;
    const code = rawCode.trim();
    if (!code) return;

    const isCopyCode = /^[BS]-[A-Z0-9]+-\d+$/i.test(code);
    let match;
    if (isCopyCode) {
      match = copies.find(c => c.copy_code?.toLowerCase() === code.toLowerCase());
    } else {
      const digits = code.replace(/[-\s]/g, '');
      match = copies.find(c => (c.books?.isbn || '').replace(/[-\s]/g, '') === digits);
    }

    if (!match) {
      setRecentScans(prev => [{ ok: false, code, title: 'No match' }, ...prev].slice(0, 6));
      toast.warning(`No copy found for "${code}"`);
      return;
    }
    setSelectedIds(prev => {
      // If already selected, treat the re-scan as a duplicate — surface
      // it so the user knows they've already counted this book.
      if (prev.has(match.id)) {
        setRecentScans(rs => [{ ok: 'dup', code: match.copy_code, title: match.books?.title }, ...rs].slice(0, 6));
        toast.info?.(`Already selected: ${match.copy_code}`);
        return prev;
      }
      // Track scan order so "Selected only" lists them in the same
      // order you scanned (1st scan at top).
      setSelectionOrder(o => o.includes(match.id) ? o : [...o, match.id]);
      return new Set([...prev, match.id]);
    });
    setScanSessionCount(n => n + 1);
    setRecentScans(prev => [{ ok: true, code: match.copy_code, title: match.books?.title }, ...prev].slice(0, 6));
    setHighlightCopyId(match.id);
    setTimeout(() => setHighlightCopyId(null), 2500);
  }, [copies, toast]);

  // Global USB scanner listener — works without opening the modal.
  // USB scanners type very fast (< 50ms between chars) then send Enter.
  useEffect(() => {
    let buffer = '';
    let lastKey = 0;
    const SPEED_THRESHOLD = 80;
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const now = Date.now();
      if (now - lastKey > SPEED_THRESHOLD) buffer = '';
      lastKey = now;
      if (e.key === 'Enter') {
        if (buffer.length > 2) handleScan(buffer);
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleScan]); // eslint-disable-line

  const openScanner = () => {
    setScanSessionCount(0);
    setRecentScans([]);
    setShowScanner(true);
  };

  const closeScanner = () => setShowScanner(false);

  // Fetch saved label templates, auto-select first if none chosen
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('*').like('key', 'barcode_template_%');
      if (data) {
        setTemplates(data);
        if (!selectedTemplate && data.length > 0) {
          // Default to "main" template if it exists, otherwise first
          const mainTmpl = data.find(t => t.key === 'barcode_template_main');
          const defaultKey = mainTmpl ? mainTmpl.key : data[0].key;
          setSelectedTemplate(defaultKey);
          localStorage.setItem('barcode_template_key', defaultKey);
        }
      }
    })();
  }, []);

  // --- Filtering ---
  const filtered = React.useMemo(() => {
    let result = copies;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const todayStart = startOfDay(now);
      result = result.filter(c => {
        const created = new Date(c.created_at);
        if (dateFilter === 'today') {
          return created >= todayStart;
        }
        if (dateFilter === 'week') {
          const weekAgo = new Date(todayStart);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return created >= weekAgo;
        }
        if (dateFilter === 'month') {
          const monthAgo = new Date(todayStart);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return created >= monthAgo;
        }
        if (dateFilter === 'custom') {
          if (customFrom && created < new Date(customFrom)) return false;
          if (customTo) {
            const toEnd = new Date(customTo);
            toEnd.setHours(23, 59, 59, 999);
            if (created > toEnd) return false;
          }
          return true;
        }
        return true;
      });
    }

    // Search filter — matches copy code, title, OR ISBN so handheld
    // scanners can drop straight into the search.
    if (search.trim()) {
      const q = search.toLowerCase();
      const qDigits = q.replace(/[-\s]/g, '');
      result = result.filter(c =>
        (c.copy_code && c.copy_code.toLowerCase().includes(q)) ||
        (c.books?.title && c.books.title.toLowerCase().includes(q)) ||
        (c.books?.isbn && c.books.isbn.toLowerCase().replace(/[-\s]/g, '').includes(qDigits))
      );
    }

    // Selected-only filter: lets the user verify which books they
    // just scanned without scrolling through the full catalogue.
    // Also reorders the list so it reads top→bottom in scan order
    // (1st book scanned at top), not by created_at as the rest of
    // the page is sorted.
    if (selectedOnly) {
      result = result.filter(c => selectedIds.has(c.id));
      const orderIndex = new Map(selectionOrder.map((id, i) => [id, i]));
      result = [...result].sort((a, b) => {
        const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
        const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
    }

    return result;
  }, [copies, statusFilter, dateFilter, customFrom, customTo, search, selectedOnly, selectedIds, selectionOrder]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, dateFilter, customFrom, customTo, search]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // --- Status counts from filtered data ---
  const statusCounts = React.useMemo(() => {
    const counts = {};
    STATUS_OPTIONS.forEach(s => { if (s !== 'all') counts[s] = 0; });
    filtered.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [filtered]);

  // --- Selection ---
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSelectionOrder(o => o.filter(x => x !== id));
      } else {
        next.add(id);
        setSelectionOrder(o => o.includes(id) ? o : [...o, id]);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length && paginated.every(c => selectedIds.has(c.id))) {
      setSelectedIds(new Set());
      setSelectionOrder(o => o.filter(id => !paginated.some(c => c.id === id)));
    } else {
      setSelectedIds(new Set(paginated.map(c => c.id)));
      setSelectionOrder(o => {
        const existing = new Set(o);
        const additions = paginated.map(c => c.id).filter(id => !existing.has(id));
        return [...o, ...additions];
      });
    }
  };

  const clearSelection = () => { setSelectedIds(new Set()); setSelectionOrder([]); setSelectedSetIds(new Set()); };

  // --- Print ---
  const getSelectedForPrint = () => {
    const selectedCopies = copies.filter(c => selectedIds.has(c.id));
    const selectedSets = bookSets.filter(s => selectedSetIds.has(s.id));
    if (selectedCopies.length === 0 && selectedSets.length === 0) {
      toast.warning('No copies or sets selected');
      return null;
    }
    const orderIndex = new Map(selectionOrder.map((id, i) => [id, i]));
    const sortedCopies = [...selectedCopies].sort((a, b) => {
      const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    return { copies: sortedCopies, sets: selectedSets };
  };

  const setShowPriceBulk = async (visible) => {
    if (selectedIds.size === 0) { toast.warning('No copies selected'); return; }
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('book_copies').update({ show_price: visible }).in('id', ids);
    if (error) { toast.error('Failed: ' + error.message); return; }
    setCopies(prev => prev.map(c => ids.includes(c.id) ? { ...c, show_price: visible } : c));
    toast.success(`${visible ? 'Showing' : 'Hiding'} price on ${ids.length} label${ids.length === 1 ? '' : 's'}`);
  };

  const toggleShowPrice = async (copy) => {
    const newVal = !(copy.show_price !== false); // treat null/undefined as true
    const { error } = await supabase.from('book_copies').update({ show_price: newVal }).eq('id', copy.id);
    if (error) { toast.error('Failed: ' + error.message); return; }
    setCopies(prev => prev.map(c => c.id === copy.id ? { ...c, show_price: newVal } : c));
  };

  const handlePrintSelected = () => {
    const result = getSelectedForPrint();
    if (!result) return;
    const { copies: selected, sets: selectedSets } = result;

    const win = window.open('', '_blank');

    const copyLabels = selected.map(c => {
      const barcode = generateBarcodeSVGString(c.copy_code, { height: 50, width: '44mm' });
      const title = c.books?.title || 'Unknown';
      const mrp = Number(c.books?.mrp) || 0;
      const selling = Number(c.books?.sales_price) || 0;
      const displayPrice = selling > 0 ? selling : mrp;
      const hasDiscount = mrp > 0 && selling > 0 && mrp > selling;
      const showPrice = c.show_price !== false;
      let priceHtml = '';
      if (showPrice && displayPrice > 0) {
        if (hasDiscount) {
          priceHtml = `<span class="sell-price">Rs.${selling}</span> <span class="mrp-strike">Rs.${mrp}</span>`;
        } else {
          priceHtml = `<span class="sell-price">Rs.${displayPrice}</span>`;
        }
      }
      return `
        <div class="label">
          <div class="brand">TAPAS READING CAFE</div>
          <div class="barcode-area">${barcode}</div>
          <div class="copy-code">${c.copy_code}</div>
          <div class="label-bottom">
            <div class="book-title">${title}</div>
            <div class="price">${priceHtml}</div>
          </div>
        </div>
      `;
    });

    const setLabels = selectedSets.map(s => {
      const barcode = generateBarcodeSVGString(s.barcode, { height: 50, width: '44mm' });
      const price = Number(s.set_price) || 0;
      const mrp = Number(s.set_mrp) || 0;
      const displayPrice = price > 0 ? price : mrp;
      const hasDiscount = mrp > 0 && price > 0 && mrp > price;
      let priceHtml = '';
      if (displayPrice > 0) {
        if (hasDiscount) {
          priceHtml = `<span class="sell-price">Rs.${price}</span> <span class="mrp-strike">Rs.${mrp}</span>`;
        } else {
          priceHtml = `<span class="sell-price">Rs.${displayPrice}</span>`;
        }
      }
      return `
        <div class="label">
          <div class="brand">TAPAS READING CAFE</div>
          <div class="barcode-area">${barcode}</div>
          <div class="copy-code">${s.barcode}</div>
          <div class="label-bottom">
            <div class="book-title">${s.name}</div>
            <div class="price">${priceHtml}</div>
          </div>
        </div>
      `;
    });

    const labels = [...copyLabels, ...setLabels].join('');

    win.document.write(`
      <html><head><title>Print Barcodes</title>
      <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        .label {
          width: 50mm; height: 25mm; padding: 1.5mm 2mm;
          box-sizing: border-box; text-align: center;
          page-break-after: always; overflow: hidden;
          border: 0.5px solid #ccc;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .brand { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; }
        .barcode-area { margin: 1mm 0; }
        .copy-code { font-size: 9px; font-family: monospace; font-weight: 600; letter-spacing: 0.5px; }
        .label-bottom { display: flex; justify-content: space-between; align-items: center; }
        .book-title { font-size: 8px; color: #444; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; }
        .price { font-size: 9px; font-weight: 700; white-space: nowrap; }
        .mrp-strike { text-decoration: line-through; color: #888; font-weight: 400; margin-right: 3px; }
        .sell-price { font-weight: 700; }
        @media print { @page { margin: 0; } .label { border: none; } }
      </style>
      </head><body>${labels}</body></html>
    `);
    win.document.close();
  };

  // Direct print: generate raw ZPL and send to Zebra via Flask API (port 5050)
  const PRINT_API = 'http://127.0.0.1:5050';
  const [directPrinting, setDirectPrinting] = useState(false);

  const handleDirectPrint = async () => {
    const result = getSelectedForPrint();
    if (!result) return;
    const { copies: selected, sets: selectedSets } = result;
    setDirectPrinting(true);
    try {
      const copyLabels = selected.map(c => {
        const mrp = Number(c.books?.mrp) || 0;
        const selling = Number(c.books?.sales_price) || 0;
        const displayPrice = selling > 0 ? selling : mrp;
        const hasDiscount = mrp > 0 && selling > 0 && mrp > selling;
        const showPrice = c.show_price !== false;
        return {
          brand: 'TAPAS READING CAFE',
          copyCode: c.copy_code,
          title: c.books?.title || 'Unknown',
          price: showPrice && displayPrice > 0 ? `Rs.${displayPrice}` : '',
          mrpStrike: showPrice && hasDiscount ? `Rs.${mrp}` : '',
        };
      });
      const setZplLabels = selectedSets.map(s => {
        const price = Number(s.set_price) || 0;
        const mrp = Number(s.set_mrp) || 0;
        const displayPrice = price > 0 ? price : mrp;
        const hasDiscount = mrp > 0 && price > 0 && mrp > price;
        return {
          brand: 'TAPAS READING CAFE',
          copyCode: s.barcode,
          title: s.name,
          price: displayPrice > 0 ? `Rs.${displayPrice}` : '',
          mrpStrike: hasDiscount ? `Rs.${mrp}` : '',
        };
      });
      const labels = [...copyLabels, ...setZplLabels];

      // Load selected template or use default
      let template = null;
      if (selectedTemplate) {
        const t = templates.find(t => t.key === selectedTemplate);
        if (t) {
          try { template = JSON.parse(t.value); } catch {}
        }
      }

      const zpl = generateZPL(labels, template);

      const res = await fetch(`${PRINT_API}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zpl }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Printed ${selected.length + selectedSets.length} label(s)!`);
      } else {
        toast.error('Print failed: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Cannot reach label printer service. Is it running on port 5050?');
    }
    setDirectPrinting(false);
  };

  // --- Styles ---
  const buttonStyle = {
    padding: '8px 16px', background: '#667eea', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center', gap: '4px',
  };

  const inputStyle = {
    padding: '7px 12px', border: '1px solid #ddd',
    borderRadius: '6px', fontSize: '13px',
  };

  const containerStyle = {
    background: 'white', borderRadius: '12px', padding: '20px',
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading barcodes...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {isReadOnly && <ViewOnlyBanner />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Barcodes</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            data-tour="template-select"
            value={selectedTemplate}
            onChange={e => { setSelectedTemplate(e.target.value); localStorage.setItem('barcode_template_key', e.target.value); }}
            style={{ ...inputStyle, width: 'auto', minWidth: '140px' }}
          >
            <option value="">Default Template</option>
            {templates.map(t => (
              <option key={t.key} value={t.key}>{t.key.replace('barcode_template_', '')}</option>
            ))}
          </select>
          <button
            onClick={openScanner}
            style={{ ...buttonStyle, background: '#0ea5e9' }}
            title="Scan multiple ISBNs/copy codes to select them all at once"
          >
            {'\uD83D\uDCF7'} Scan
          </button>
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setShowPriceBulk(true)}
                style={{ ...buttonStyle, background: '#10b981' }}
                title="Show price on labels for selected copies"
              >
                {'\u20B9'} Show ({selectedIds.size})
              </button>
              <button
                onClick={() => setShowPriceBulk(false)}
                style={{ ...buttonStyle, background: '#6b7280' }}
                title="Hide price on labels for selected copies"
              >
                {'\u20B9'} Hide ({selectedIds.size})
              </button>
            </>
          )}
          <button data-tour="direct-print" onClick={handleDirectPrint} disabled={directPrinting} style={{ ...buttonStyle, background: '#38a169', opacity: directPrinting ? 0.6 : 1 }}>
            {'\uD83D\uDDA8\uFE0F'} {directPrinting ? 'Printing...' : `Direct Print${(selectedIds.size + selectedSetIds.size) > 0 ? ` (${selectedIds.size + selectedSetIds.size})` : ''}`}
          </button>
          <Link to="/barcodes/editor" style={buttonStyle}>
            Template Editor
          </Link>
        </div>
      </div>

      {/* Filter Row */}
      <div style={{ ...containerStyle, marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search code or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, minWidth: '200px', flex: '1' }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={inputStyle}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={inputStyle}
          >
            {DATE_OPTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedOnly(v => !v)}
              title={selectedOnly ? 'Show all rows again' : 'Show only the rows you have ticked'}
              style={{
                ...buttonStyle,
                background: selectedOnly ? '#f59e0b' : '#fef3c7',
                color: selectedOnly ? 'white' : '#92400e',
              }}
            >
              {selectedOnly ? `✕ Showing selected (${selectedIds.size})` : `☑ Selected only (${selectedIds.size})`}
            </button>
          )}
          {dateFilter === 'custom' && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                style={inputStyle}
              />
              <span style={{ color: '#999', fontSize: '13px' }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                style={inputStyle}
              />
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            style={{
              background: STATUS_COLORS[status]?.bg || '#6b7280',
              color: STATUS_COLORS[status]?.color || '#ffffff',
              border: `1px solid ${STATUS_COLORS[status]?.border || '#4b5563'}`,
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              boxShadow: `0 2px 6px ${STATUS_COLORS[status]?.bg || '#6b7280'}33`,
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
          </div>
        ))}
        <div style={{
          background: '#6b7280', color: '#ffffff',
          border: '1px solid #4b5563',
          padding: '5px 14px', borderRadius: '20px',
          fontSize: '12px', fontWeight: '700',
        }}>
          Total: {filtered.length}
        </div>
      </div>

      {/* Bulk Bar */}
      {(selectedIds.size > 0 || selectedSetIds.size > 0) && (
        <div style={{
          ...containerStyle,
          marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: '#f0f4ff',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
            {selectedIds.size + selectedSetIds.size} selected
            {selectedSetIds.size > 0 && selectedIds.size > 0 && <span style={{ color: '#667eea', fontWeight: 400 }}> ({selectedIds.size} copies + {selectedSetIds.size} sets)</span>}
            {selectedSetIds.size > 0 && selectedIds.size === 0 && <span style={{ color: '#667eea', fontWeight: 400 }}> (sets)</span>}
          </span>
          <button onClick={handleDirectPrint} disabled={directPrinting} style={{ ...buttonStyle, background: '#38a169', opacity: directPrinting ? 0.6 : 1 }}>
            {'\uD83D\uDDA8\uFE0F'} {directPrinting ? 'Printing...' : 'Direct Print'}
          </button>
          <button onClick={handlePrintSelected} style={buttonStyle}>
            Print Preview
          </button>
          {selectedIds.size > 0 && <>
            <button onClick={async () => {
              if (!window.confirm(`Mark ${selectedIds.size} copies as LOST?`)) return;
              for (const id of selectedIds) { await supabase.from('book_copies').update({ status: 'lost' }).eq('id', id); }
              toast.success(`${selectedIds.size} copies marked as lost`);
              setSelectedIds(new Set()); fetchCopies();
            }} style={{ ...buttonStyle, background: '#e74c3c' }}>
              Mark Lost
            </button>
            <button onClick={async () => {
              if (!window.confirm(`Mark ${selectedIds.size} copies as DAMAGED?`)) return;
              for (const id of selectedIds) { await supabase.from('book_copies').update({ status: 'damaged' }).eq('id', id); }
              toast.success(`${selectedIds.size} copies marked as damaged`);
              setSelectedIds(new Set()); fetchCopies();
            }} style={{ ...buttonStyle, background: '#f39c12' }}>
              Mark Damaged
            </button>
          </>}
          <button
            onClick={clearSelection}
            style={{ ...buttonStyle, background: '#999' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Book Sets Section */}
      {bookSets.length > 0 && (
        <div style={{ ...containerStyle, marginBottom: '16px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: setsExpanded ? '10px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setSetsExpanded(v => !v)}
                style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', padding: '2px 7px', fontSize: '12px', color: '#555', lineHeight: 1.4 }}
                title={setsExpanded ? 'Collapse' : 'Expand'}
              >
                {setsExpanded ? '▲' : '▼'}
              </button>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#333' }}>
                📦 Book Sets ({bookSets.length})
              </h3>
            </div>
            {selectedSetIds.size > 0 && (
              <span style={{ fontSize: '12px', color: '#667eea', fontWeight: 600 }}>
                {selectedSetIds.size} set{selectedSetIds.size !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          {setsExpanded && <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '8px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={bookSets.length > 0 && bookSets.every(s => selectedSetIds.has(s.id))}
                    onChange={() => {
                      if (bookSets.every(s => selectedSetIds.has(s.id))) {
                        setSelectedSetIds(new Set());
                      } else {
                        setSelectedSetIds(new Set(bookSets.map(s => s.id)));
                      }
                    }}
                  />
                </th>
                <th style={{ padding: '8px' }}>Barcode</th>
                <th style={{ padding: '8px' }}>Set Code</th>
                <th style={{ padding: '8px' }}>Set Name</th>
                <th style={{ padding: '8px' }}>Price</th>
                <th style={{ padding: '8px' }}>MRP</th>
              </tr>
            </thead>
            <tbody>
              {bookSets.map(set => (
                <tr key={set.id} style={{ borderBottom: '1px solid #f0f0f0', background: selectedSetIds.has(set.id) ? '#f0f4ff' : undefined }}>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="checkbox"
                      checked={selectedSetIds.has(set.id)}
                      onChange={() => {
                        setSelectedSetIds(prev => {
                          const next = new Set(prev);
                          if (next.has(set.id)) next.delete(set.id);
                          else next.add(set.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', width: '150px' }}>
                    {set.barcode && generateBarcodeSVG(set.barcode, { height: 35, width: '140px' })}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', color: '#667eea', fontWeight: '600' }}>
                    {set.barcode || '—'}
                  </td>
                  <td style={{ padding: '8px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {set.name}
                  </td>
                  <td style={{ padding: '8px', color: '#333' }}>
                    {set.set_price ? `₹${set.set_price}` : set.set_mrp ? `₹${set.set_mrp}` : '—'}
                  </td>
                  <td style={{ padding: '8px', color: '#888' }}>
                    {set.set_mrp ? `₹${set.set_mrp}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
      )}

      {/* Table */}
      <div style={{ ...containerStyle, overflowX: 'auto' }}>
        {paginated.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
            No barcodes found matching your filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && paginated.every(c => selectedIds.has(c.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ padding: '10px 8px' }}>Barcode</th>
                <th style={{ padding: '10px 8px' }}>Copy Code</th>
                <th style={{ padding: '10px 8px' }}>Book Title</th>
                <th style={{ padding: '10px 8px' }}>Category</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }} title="Show price on label?">₹ Label</th>
                <th style={{ padding: '10px 8px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(copy => (
                <tr key={copy.id} style={{
                  borderBottom: '1px solid #f0f0f0',
                  background: copy.id === highlightCopyId ? '#fef9c3' : undefined,
                  transition: 'background 0.6s ease',
                }}>
                  <td style={{ padding: '10px 8px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(copy.id)}
                      onChange={() => toggleSelect(copy.id)}
                    />
                  </td>
                  <td style={{ padding: '10px 8px', width: '150px' }}>
                    {copy.copy_code && generateBarcodeSVG(copy.copy_code, { height: 35, width: '140px' })}
                  </td>
                  <td style={{
                    padding: '10px 8px', fontFamily: 'monospace',
                    color: '#667eea', fontWeight: '600',
                  }}>
                    {copy.copy_code}
                  </td>
                  <td style={{ padding: '10px 8px', maxWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{copy.books?.title || '—'}</span>
                      <Link
                        to={`/books?edit=${copy.book_id || copy.books?.id || ''}`}
                        title="Edit this book"
                        style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', background: '#f0f4ff', border: '1px solid #c7d2fe', textDecoration: 'none', color: '#667eea' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </Link>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px', color: '#666' }}>
                    {copy.books?.category || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      background: STATUS_COLORS[copy.status]?.bg || '#6b7280',
                      color: STATUS_COLORS[copy.status]?.color || '#ffffff',
                      border: `1px solid ${STATUS_COLORS[copy.status]?.border || '#4b5563'}`,
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'inline-block',
                      boxShadow: `0 2px 4px ${STATUS_COLORS[copy.status]?.bg || '#6b7280'}33`,
                    }}>
                      {copy.status ? copy.status.charAt(0).toUpperCase() + copy.status.slice(1) : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggleShowPrice(copy)}
                      title={copy.show_price !== false ? 'Price IS printed on this label — click to hide' : 'Price is HIDDEN on this label — click to show'}
                      style={{
                        background: copy.show_price !== false ? '#10b981' : '#e5e7eb',
                        color: copy.show_price !== false ? 'white' : '#6b7280',
                        border: 'none', borderRadius: '4px',
                        padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {copy.show_price !== false ? '₹ Show' : '₹ Hide'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 8px', color: '#666', whiteSpace: 'nowrap' }}>
                    {formatDate(copy.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '16px', padding: '0 4px',
        }}>
          <span style={{ fontSize: '13px', color: '#666' }}>
            Page {currentPage} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                ...buttonStyle,
                background: currentPage === 1 ? '#ccc' : '#667eea',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                ...buttonStyle,
                background: currentPage === totalPages ? '#ccc' : '#667eea',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Multi-scan session: stays open after each scan so you can blast
          through 10+ books and accumulate selections. Close with Done. */}
      {showScanner && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={closeScanner}
        >
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', maxWidth: '460px', width: '94%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '17px' }}>📷 Multi-scan</h3>
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>
                ✓ {scanSessionCount} scanned · {selectedIds.size} total selected
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
              Scan book after book — each one stays ticked. Hit <strong>Done</strong> when finished, then print or set price all at once.
            </p>

            <BarcodeScanner onScan={handleScan} onClose={closeScanner} continuous={true} />

            <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px', fontWeight: 600 }}>
                Or use a USB/Bluetooth scanner — focus stays here:
              </p>
              <input
                type="text"
                autoFocus
                placeholder="ISBN or B-XXX-XXXX, then Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.target.value.trim();
                    if (val) handleScan(val);
                    e.target.value = '';
                  }
                }}
                style={{ width: '100%', padding: '10px', border: '2px solid #667eea', borderRadius: '6px', fontSize: '16px', textAlign: 'center', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>

            {recentScans.length > 0 && (
              <div style={{ marginTop: '12px', maxHeight: '180px', overflowY: 'auto', background: '#f9fafb', borderRadius: '6px', padding: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Recent scans
                </p>
                {recentScans.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px' }}>
                    <span style={{
                      display: 'inline-block', width: '18px', textAlign: 'center',
                      color: s.ok === true ? '#10b981' : s.ok === 'dup' ? '#f59e0b' : '#ef4444',
                      fontWeight: 700,
                    }}>{s.ok === true ? '✓' : s.ok === 'dup' ? '↻' : '✗'}</span>
                    <span style={{ fontFamily: 'monospace', color: '#374151' }}>{s.code}</span>
                    <span style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button
                onClick={() => { setSelectedIds(new Set()); setSelectionOrder([]); setScanSessionCount(0); setRecentScans([]); }}
                style={{ flex: 1, padding: '10px 12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
              >Clear all</button>
              <button
                onClick={closeScanner}
                style={{ flex: 2, padding: '10px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >Done ({selectedIds.size})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
