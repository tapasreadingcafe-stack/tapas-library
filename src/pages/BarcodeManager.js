import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { generateBarcodeSVG, generateBarcodeSVGString, encodeCode128B, generateZPL } from '../utils/barcodeUtils';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

const PER_PAGE = 25;

const STATUS_COLORS = {
  available: { bg: '#d4edda', color: '#155724' },
  issued:    { bg: '#cce5ff', color: '#004085' },
  sold:      { bg: '#f8d7da', color: '#721c24' },
  lost:      { bg: '#fff3cd', color: '#856404' },
  damaged:   { bg: '#f5c6cb', color: '#721c24' },
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
  const [currentPage, setCurrentPage] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(() => localStorage.getItem('barcode_template_key') || '');

  const fetchCopies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_copies')
        .select('*, books(title, category, price, mrp, sales_price, author)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCopies(data || []);
    } catch (err) {
      toast.error('Failed to load barcodes: ' + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCopies(); }, [fetchCopies]);

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

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.copy_code && c.copy_code.toLowerCase().includes(q)) ||
        (c.books?.title && c.books.title.toLowerCase().includes(q))
      );
    }

    return result;
  }, [copies, statusFilter, dateFilter, customFrom, customTo, search]);

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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length && paginated.every(c => selectedIds.has(c.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(c => c.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // --- Print ---
  const getSelectedForPrint = () => {
    const selected = copies.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) { toast.warning('No copies selected'); return null; }
    return selected;
  };

  const handlePrintSelected = () => {
    const selected = getSelectedForPrint();
    if (!selected) return;

    const win = window.open('', '_blank');
    const labels = selected.map(c => {
      const barcode = generateBarcodeSVGString(c.copy_code, { height: 40, width: '44mm' });
      const title = c.books?.title || 'Unknown';
      const price = c.books?.price;
      return `
        <div class="label">
          <div class="brand">TAPAS READING CAFE</div>
          <div class="barcode-area">${barcode}</div>
          <div class="copy-code">${c.copy_code}</div>
          <div class="book-title">${title}</div>
          ${price ? `<div class="price">Rs. ${price}</div>` : ''}
        </div>
      `;
    }).join('');

    win.document.write(`
      <html><head><title>Print Barcodes</title>
      <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        .label {
          width: 50mm; height: 25mm; padding: 1mm 2mm;
          box-sizing: border-box; text-align: center;
          page-break-after: always; overflow: hidden;
        }
        .brand { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
        .barcode-area { margin: 1mm 0; }
        .copy-code { font-size: 10px; font-family: monospace; font-weight: 600; letter-spacing: 0.5px; }
        .book-title { font-size: 9px; color: #444; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .price { font-size: 9px; font-weight: 700; }
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
    const selected = getSelectedForPrint();
    if (!selected) return;
    setDirectPrinting(true);
    try {
      const labels = selected.map(c => {
        const mrp = Number(c.books?.mrp) || 0;
        const selling = Number(c.books?.sales_price) || 0;
        const displayPrice = selling > 0 ? selling : mrp;
        const hasDiscount = mrp > 0 && selling > 0 && mrp > selling;
        return {
          brand: 'TAPAS READING CAFE',
          copyCode: c.copy_code,
          title: c.books?.title || 'Unknown',
          price: displayPrice > 0 ? `Rs.${displayPrice}` : '',
          mrpStrike: hasDiscount ? `Rs.${mrp}` : '',
        };
      });

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
        toast.success(`Printed ${selected.length} label(s)!`);
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
            value={selectedTemplate}
            onChange={e => { setSelectedTemplate(e.target.value); localStorage.setItem('barcode_template_key', e.target.value); }}
            style={{ ...inputStyle, width: 'auto', minWidth: '140px' }}
          >
            <option value="">Default Template</option>
            {templates.map(t => (
              <option key={t.key} value={t.key}>{t.key.replace('barcode_template_', '')}</option>
            ))}
          </select>
          <button onClick={handleDirectPrint} disabled={directPrinting} style={{ ...buttonStyle, background: '#38a169', opacity: directPrinting ? 0.6 : 1 }}>
            {'\uD83D\uDDA8\uFE0F'} {directPrinting ? 'Printing...' : `Direct Print${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
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
              background: STATUS_COLORS[status]?.bg || '#eee',
              color: STATUS_COLORS[status]?.color || '#333',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
          </div>
        ))}
        <div style={{
          background: '#f0f0f0', color: '#333',
          padding: '4px 12px', borderRadius: '20px',
          fontSize: '12px', fontWeight: '600',
        }}>
          Total: {filtered.length}
        </div>
      </div>

      {/* Bulk Bar */}
      {selectedIds.size > 0 && (
        <div style={{
          ...containerStyle,
          marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: '#f0f4ff',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
            {selectedIds.size} selected
          </span>
          <button onClick={handleDirectPrint} disabled={directPrinting} style={{ ...buttonStyle, background: '#38a169', opacity: directPrinting ? 0.6 : 1 }}>
            {'\uD83D\uDDA8\uFE0F'} {directPrinting ? 'Printing...' : 'Direct Print'}
          </button>
          <button onClick={handlePrintSelected} style={buttonStyle}>
            Print Preview
          </button>
          <button
            onClick={clearSelection}
            style={{ ...buttonStyle, background: '#999' }}
          >
            Clear
          </button>
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
                <th style={{ padding: '10px 8px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(copy => (
                <tr key={copy.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
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
                  <td style={{
                    padding: '10px 8px', maxWidth: '200px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {copy.books?.title || '—'}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#666' }}>
                    {copy.books?.category || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      background: STATUS_COLORS[copy.status]?.bg || '#eee',
                      color: STATUS_COLORS[copy.status]?.color || '#333',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>
                      {copy.status ? copy.status.charAt(0).toUpperCase() + copy.status.slice(1) : '—'}
                    </span>
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
    </div>
  );
}
