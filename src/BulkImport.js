import React, { useState } from 'react';
import { supabase } from './utils/supabase';

export default function BulkImport({ type, onSuccess, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('upload');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = [];

        for (let i = 1; i < Math.min(6, lines.length); i++) {
          if (lines[i].trim() === '') continue;
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx];
          });
          rows.push(row);
        }

        setFile(selectedFile);
        setPreview(rows);
        setStep('preview');
        setError(null);
      } catch (err) {
        setError('Invalid CSV format');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx];
          });
          rows.push(row);
        }

        if (type === 'members') {
          const membersToAdd = rows.map(row => ({
            name: row.name,
            phone: row.phone,
            email: row.email,
            plan: row.plan || 'basic',
            borrow_limit: parseInt(row.borrow_limit) || 2,
            customer_id: row.customer_id || '',
            status: 'active',
            subscription_start: new Date().toISOString().split('T')[0],
            subscription_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }));

          const { error } = await supabase.from('members').insert(membersToAdd);
          if (error) throw error;
        } else if (type === 'books') {
          const booksToAdd = rows.map(row => ({
            book_id: row.book_id,
            title: row.title,
            author: row.author,
            isbn: row.isbn,
            category: row.category,
            price: parseFloat(row.price) || 0,
            sales_price: parseFloat(row.sales_price) || 0,
            quantity_total: parseInt(row.quantity_total) || 1,
            quantity_available: parseInt(row.quantity_total) || 1,
            book_image: row.book_image || '',
          }));

          const { error } = await supabase.from('books').insert(booksToAdd);
          if (error) throw error;
        }

        alert(`Successfully imported ${rows.length} ${type === 'members' ? 'members' : 'books'}! ✅`);
        onSuccess();
        onClose();
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2>📤 Bulk Import {type === 'members' ? 'Members' : 'Books'}</h2>

        {step === 'upload' && (
          <>
            <div style={{ marginBottom: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '4px', borderLeft: '3px solid #667eea' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>📋 CSV Format:</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                {type === 'members' ? 'customer_id, name, phone, email, plan, borrow_limit' : 'book_id, title, author, isbn, category, price, sales_price, quantity_total, book_image'}
              </p>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ marginBottom: '15px', width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />

            {error && <p style={{ color: '#ff6b6b', marginBottom: '15px' }}>❌ {error}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv';
                  input.onchange = handleFileSelect;
                  input.click();
                }}
                style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Select CSV File
              </button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <p style={{ color: '#666', marginBottom: '15px' }}>Preview (first {preview.length} rows):</p>

            <div style={{ marginBottom: '20px', overflowX: 'auto', background: '#f9f9f9', borderRadius: '4px', padding: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    {preview.length > 0 && Object.keys(preview[0]).map(key => (
                      <th key={key} style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      {Object.values(row).map((val, idx2) => (
                        <td key={idx2} style={{ padding: '8px' }}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep('upload')}
                style={{ flex: 1, padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                style={{ flex: 1, padding: '10px', background: loading ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? '⏳ Importing...' : '✓ Confirm Import'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}