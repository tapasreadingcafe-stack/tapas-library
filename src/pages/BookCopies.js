import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { getBookCopies, createBookCopies, updateCopyStatus, BOOK_COPIES_SQL } from '../utils/bookCopies';

// Simple Code128 barcode SVG generator
function generateBarcodeSVG(text) {
  // Use a simple visual representation — alternating bars based on char codes
  const bars = [];
  let x = 0;
  // Start pattern
  [2,1,1,2,3,2].forEach(w => { bars.push({ x, w, black: bars.length % 2 === 0 }); x += w; });
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const widths = [(code % 4) + 1, ((code >> 2) % 3) + 1, ((code >> 4) % 4) + 1, ((code >> 6) % 3) + 1];
    widths.forEach((w, j) => { bars.push({ x, w, black: (bars.length) % 2 === 0 }); x += w; });
  }
  // Stop pattern
  [2,3,1,1,2,1,2].forEach(w => { bars.push({ x, w, black: bars.length % 2 === 0 }); x += w; });

  const totalW = x;
  return (
    <svg viewBox={`0 0 ${totalW} 40`} style={{ width: '100%', height: '40px' }}>
      {bars.filter(b => b.black).map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={40} fill="black" />
      ))}
    </svg>
  );
}

export default function BookCopies() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const printRef = useRef();
  const [book, setBook] = useState(null);
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [addCount, setAddCount] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedCopies, setSelectedCopies] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPriceOnLabel, setShowPriceOnLabel] = useState(true);

  useEffect(() => { checkAndFetch(); }, [bookId]);

  const checkAndFetch = async () => {
    const { error } = await supabase.from('book_copies').select('id').limit(0);
    if (error) { setTableReady(false); setLoading(false); return; }
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    const [{ data: bookData }, copiesData] = await Promise.all([
      supabase.from('books').select('*').eq('id', bookId).single(),
      getBookCopies(bookId),
    ]);
    setBook(bookData);
    setCopies(copiesData);
    setLoading(false);
  };

  const handleAddCopies = async () => {
    if (!book || addCount < 1) return;
    setAdding(true);
    try {
      const newCopies = await createBookCopies(bookId, book.category, addCount);
      // Update book total quantity
      await supabase.from('books').update({
        quantity_total: (book.quantity_total || 0) + addCount,
        quantity_available: (book.quantity_available || 0) + addCount,
      }).eq('id', bookId);
      toast.success(`${addCount} copies added!`);
      fetchData();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
    setAdding(false);
  };

  const handleStatusChange = async (copyId, newStatus) => {
    try {
      await updateCopyStatus(copyId, newStatus);
      toast.success('Status updated');
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const toggleSelect = (id) => {
    setSelectedCopies(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedCopies.length === copies.length) setSelectedCopies([]);
    else setSelectedCopies(copies.map(c => c.id));
  };

  const handlePrint = () => {
    const selected = selectedCopies.length > 0 ? copies.filter(c => selectedCopies.includes(c.id)) : copies;
    if (selected.length === 0) { toast.warning('No copies to print'); return; }
    setShowPrintPreview(true);
  };

  const doPrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Print Barcodes</title>
      <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        .label { width: 58mm; padding: 3mm; border: 0.5px dashed #ccc; display: inline-block; vertical-align: top; page-break-inside: avoid; text-align: center; box-sizing: border-box; }
        .brand { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2mm; }
        .barcode-area { margin: 2mm 0; }
        .copy-code { font-size: 10px; font-weight: 700; font-family: monospace; letter-spacing: 1px; }
        .book-title { font-size: 7px; color: #666; margin-top: 1mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 52mm; }
        .book-author { font-size: 6px; color: #999; }
        .price-line { margin-top: 1mm; font-size: 8px; }
        .mrp-strike { text-decoration: line-through; color: #999; margin-right: 4px; }
        .sell-price { font-weight: 700; color: #333; }
        @media print { .label { border: none; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const statusColors = { available: '#1dd1a1', issued: '#667eea', sold: '#f39c12', lost: '#e74c3c', damaged: '#ff6b6b' };

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>📦 Book Copies</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <h3>Setup Required</h3>
          <p style={{ fontSize: '14px', marginBottom: '8px' }}>Run this SQL in Supabase:</p>
          <pre style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{BOOK_COPIES_SQL}</pre>
          <button onClick={checkAndFetch} style={{ marginTop: '12px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check Again</button>
        </div>
      </div>
    );
  }

  if (loading) return <p style={{ padding: '20px', color: '#999' }}>Loading...</p>;
  if (!book) return <p style={{ padding: '20px', color: '#e74c3c' }}>Book not found</p>;

  const printCopies = selectedCopies.length > 0 ? copies.filter(c => selectedCopies.includes(c.id)) : copies;

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        @media (max-width: 768px) {
          .copies-grid { grid-template-columns: 1fr !important; }
          .copies-header { flex-direction: column !important; align-items: stretch !important; }
        }
      `}</style>

      {/* Header */}
      <div className="copies-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button onClick={() => navigate('/books')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#667eea', marginBottom: '4px' }}>← Back to Books</button>
          <h1 style={{ fontSize: '24px', margin: 0 }}>📦 {book.title}</h1>
          <p style={{ color: '#999', fontSize: '13px', margin: '2px 0 0' }}>{book.author} · {book.category} · {copies.length} copies</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input type="number" value={addCount} onChange={e => setAddCount(Math.max(1, parseInt(e.target.value) || 1))} min="1"
              style={{ width: '50px', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', textAlign: 'center' }} />
            <button onClick={handleAddCopies} disabled={adding}
              style={{ padding: '8px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              {adding ? '...' : '+ Add Copies'}
            </button>
          </div>
          <button onClick={handlePrint}
            style={{ padding: '8px 14px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            🖨️ Print Labels {selectedCopies.length > 0 ? `(${selectedCopies.length})` : `(All)`}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['available', 'issued', 'sold', 'lost', 'damaged'].map(s => {
          const count = copies.filter(c => c.status === s).length;
          return count > 0 ? (
            <div key={s} style={{ padding: '6px 14px', background: 'white', borderRadius: '8px', borderLeft: `3px solid ${statusColors[s]}`, fontSize: '13px' }}>
              <strong style={{ color: statusColors[s] }}>{count}</strong> <span style={{ color: '#999', textTransform: 'capitalize' }}>{s}</span>
            </div>
          ) : null;
        })}
      </div>

      {/* Copies table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '10px', width: '40px' }}>
                <input type="checkbox" checked={selectedCopies.length === copies.length && copies.length > 0} onChange={selectAll} />
              </th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Copy ID</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Barcode</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Condition</th>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {copies.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No copies yet. Click "+ Add Copies" to generate.</td></tr>
            ) : copies.map(copy => (
              <tr key={copy.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px' }}>
                  <input type="checkbox" checked={selectedCopies.includes(copy.id)} onChange={() => toggleSelect(copy.id)} />
                </td>
                <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: '700', fontSize: '14px', color: '#667eea' }}>{copy.copy_code}</td>
                <td style={{ padding: '10px', width: '150px' }}>{generateBarcodeSVG(copy.copy_code)}</td>
                <td style={{ padding: '10px' }}>
                  <select value={copy.status} onChange={e => handleStatusChange(copy.id, e.target.value)}
                    style={{ padding: '4px 8px', border: `2px solid ${statusColors[copy.status] || '#ccc'}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: statusColors[copy.status], background: 'white' }}>
                    {['available', 'issued', 'sold', 'lost', 'damaged'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px', fontSize: '13px' }}>{copy.condition}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => { setSelectedCopies([copy.id]); handlePrint(); }}
                    style={{ padding: '4px 10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                    🖨️ Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={() => setShowPrintPreview(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>🖨️ Print Preview ({printCopies.length} labels)</h3>
              <button onClick={() => setShowPrintPreview(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" checked={showPriceOnLabel} onChange={e => setShowPriceOnLabel(e.target.checked)} /> Show price on label
              </label>
            </div>

            {/* Labels preview */}
            <div ref={printRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {printCopies.map(copy => (
                <div key={copy.id} className="label" style={{
                  width: '200px', padding: '12px', border: '1px dashed #ccc', borderRadius: '6px', textAlign: 'center',
                }}>
                  <div className="brand" style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px', color: '#667eea' }}>
                    📚 TAPAS READING CAFE
                  </div>
                  <div className="barcode-area" style={{ margin: '6px 0' }}>
                    {generateBarcodeSVG(copy.copy_code)}
                  </div>
                  <div className="copy-code" style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', letterSpacing: '1px' }}>
                    {copy.copy_code}
                  </div>
                  <div className="book-title" style={{ fontSize: '9px', color: '#666', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {book.title}
                  </div>
                  {showPriceOnLabel && (book.mrp > 0 || book.sales_price > 0) && (
                    <div className="price-line" style={{ marginTop: '4px', fontSize: '10px' }}>
                      {book.sales_price > 0 && book.mrp > 0 && book.sales_price < book.mrp ? (
                        <>
                          <span className="sell-price" style={{ fontWeight: '700', color: '#333' }}>Price: ₹{book.sales_price}</span>
                          <span className="mrp-strike" style={{ textDecoration: 'line-through', color: '#999', marginLeft: '6px' }}>₹{book.mrp}</span>
                        </>
                      ) : book.mrp > 0 ? (
                        <span style={{ fontWeight: '600' }}>MRP: ₹{book.mrp}</span>
                      ) : book.sales_price > 0 ? (
                        <span style={{ fontWeight: '600' }}>Price: ₹{book.sales_price}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={doPrint}
                style={{ flex: 1, padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                🖨️ Print Labels
              </button>
              <button onClick={() => setShowPrintPreview(false)}
                style={{ padding: '12px 20px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
