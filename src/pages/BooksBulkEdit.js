import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { usePermission } from '../hooks/usePermission';
import { exportToCSV } from '../utils/exportCSV';

ModuleRegistry.registerModules([AllCommunityModule]);

const CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'History', 'Biography', 'Mystery',
  'Fantasy', 'Romance', 'Thriller', 'Self-Help', 'Business', 'Technology',
  'Children', 'Young Adult', 'Poetry', 'Drama', 'Philosophy', 'Religion',
  'Travel', 'Cooking', 'Art', 'Sports', 'Politics', 'Economics', 'Health',
];
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];
const STATUSES = ['published', 'draft'];

const NUMERIC_FIELDS = new Set([
  'price', 'mrp', 'sales_price', 'discount_percent', 'quantity_total', 'quantity_available',
]);
const BOOL_FIELDS = new Set(['store_visible', 'is_borrowable']);

export default function BooksBulkEdit() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isReadOnly, canDeleteBooks } = usePermission();
  const gridRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState(new Map()); // id -> { field: newValue }
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('id, book_id, title, author, isbn, category, condition, price, sales_price, mrp, discount_percent, quantity_total, quantity_available, store_visible, is_borrowable, status')
        .order('title');
      if (error) {
        toast.error('Failed to load books: ' + error.message);
      } else {
        const cloned = (data || []).map(r => ({ ...r }));
        setRows(cloned);
        setOriginalRows(JSON.parse(JSON.stringify(cloned)));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  const recordEdit = useCallback((id, field, value) => {
    setEdits(prev => {
      const next = new Map(prev);
      const existing = next.get(id) || {};
      // If the new value matches the original, clear that field's edit.
      const original = originalRows.find(r => r.id === id);
      if (original && original[field] === value) {
        const { [field]: _, ...rest } = existing;
        if (Object.keys(rest).length === 0) next.delete(id);
        else next.set(id, rest);
      } else {
        next.set(id, { ...existing, [field]: value });
      }
      return next;
    });
  }, [originalRows]);

  const onCellValueChanged = useCallback((params) => {
    recordEdit(params.data.id, params.colDef.field, params.newValue);
  }, [recordEdit]);

  const handleSave = async () => {
    if (edits.size === 0) {
      toast.warning?.('No changes to save');
      return;
    }
    setSaving(true);
    let ok = 0;
    let failed = 0;
    for (const [id, partial] of edits) {
      const { error } = await supabase.from('books').update(partial).eq('id', id);
      if (error) { failed++; console.error('Update failed for', id, error); }
      else ok++;
    }
    setSaving(false);
    if (failed === 0) {
      toast.success(`Saved ${ok} book${ok === 1 ? '' : 's'}`);
      // Take a fresh snapshot — current rows become the new baseline.
      setOriginalRows(JSON.parse(JSON.stringify(rows)));
      setEdits(new Map());
    } else {
      toast.error(`Saved ${ok}, failed ${failed}. See console.`);
    }
  };

  const handleDiscard = async () => {
    if (edits.size === 0) return;
    const ok = await confirm({
      title: 'Discard changes?',
      message: `Throw away ${edits.size} pending edit${edits.size === 1 ? '' : 's'}?`,
      confirmText: 'Discard',
      danger: true,
    });
    if (!ok) return;
    setRows(originalRows.map(r => ({ ...r })));
    setEdits(new Map());
    // Force grid to redraw with restored values.
    setTimeout(() => gridRef.current?.api?.redrawRows(), 0);
  };

  const applyToSelected = useCallback((field, value) => {
    if (selectedIds.length === 0) {
      toast.warning?.('Select rows first (tick the checkboxes)');
      return;
    }
    // Update local row state for the grid to re-render the values.
    setRows(prev => prev.map(r => selectedIds.includes(r.id) ? { ...r, [field]: value } : r));
    // Record edits.
    setEdits(prev => {
      const next = new Map(prev);
      for (const id of selectedIds) {
        const existing = next.get(id) || {};
        next.set(id, { ...existing, [field]: value });
      }
      return next;
    });
    toast.success(`Applied to ${selectedIds.length} book${selectedIds.length === 1 ? '' : 's'}`);
  }, [selectedIds, toast]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!canDeleteBooks) {
      toast.error('You do not have permission to delete books.');
      return;
    }
    const ok = await confirm({
      title: 'Delete books',
      message: `Permanently delete ${selectedIds.length} selected book${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('books').delete().in('id', selectedIds);
    if (error) {
      toast.error('Delete failed: ' + error.message);
      return;
    }
    toast.success(`Deleted ${selectedIds.length} book${selectedIds.length === 1 ? '' : 's'}`);
    setRows(prev => prev.filter(r => !selectedIds.includes(r.id)));
    setOriginalRows(prev => prev.filter(r => !selectedIds.includes(r.id)));
    // Also drop any pending edits for deleted rows.
    setEdits(prev => {
      const next = new Map(prev);
      selectedIds.forEach(id => next.delete(id));
      return next;
    });
    setSelectedIds([]);
  };

  const handleExportSelection = () => {
    const rowsToExport = selectedIds.length
      ? rows.filter(r => selectedIds.includes(r.id))
      : rows;
    exportToCSV(rowsToExport, selectedIds.length ? 'books_selected' : 'books_all');
  };

  const columnDefs = useMemo(() => [
    { field: 'book_id', headerName: 'ID', editable: false, pinned: 'left', width: 110, lockPosition: true },
    { field: 'title', editable: !isReadOnly, flex: 2, minWidth: 220, pinned: 'left' },
    { field: 'author', editable: !isReadOnly, flex: 1, minWidth: 160 },
    { field: 'isbn', editable: !isReadOnly, width: 140 },
    {
      field: 'category', editable: !isReadOnly, width: 130,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: CATEGORIES },
    },
    {
      field: 'condition', editable: !isReadOnly, width: 110,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: CONDITIONS },
    },
    { field: 'price', headerName: 'Buying ₹', editable: !isReadOnly, width: 110, type: 'numericColumn', valueParser: numericParser },
    { field: 'mrp', headerName: 'MRP ₹', editable: !isReadOnly, width: 110, type: 'numericColumn', valueParser: numericParser },
    { field: 'sales_price', headerName: 'Selling ₹', editable: !isReadOnly, width: 110, type: 'numericColumn', valueParser: numericParser },
    { field: 'discount_percent', headerName: 'Disc %', editable: !isReadOnly, width: 100, type: 'numericColumn', valueParser: numericParser },
    { field: 'quantity_total', headerName: 'Total', editable: !isReadOnly, width: 90, type: 'numericColumn', valueParser: numericParser },
    { field: 'quantity_available', headerName: 'Avail', editable: !isReadOnly, width: 90, type: 'numericColumn', valueParser: numericParser },
    {
      field: 'is_borrowable', headerName: 'Borrow', editable: !isReadOnly, width: 100,
      cellDataType: 'boolean',
    },
    {
      field: 'store_visible', headerName: 'Storefront', editable: !isReadOnly, width: 160,
      valueFormatter: (p) => p.value === true ? 'Show on website' : p.value === false ? 'Not for sale' : '',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Show on website', 'Not for sale'] },
      valueParser: (p) => p.newValue === 'Show on website',
    },
    {
      field: 'status', editable: !isReadOnly, width: 110,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: STATUSES },
    },
  ], [isReadOnly]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    cellStyle: (params) => {
      const id = params.data?.id;
      const field = params.colDef?.field;
      if (id != null && edits.get(id)?.[field] !== undefined) {
        return { backgroundColor: '#fef3c7' }; // amber highlight for edited cells
      }
      return null;
    },
  }), [edits]);

  const rowSelection = useMemo(() => ({
    mode: 'multiRow',
    checkboxes: true,
    headerCheckbox: true,
  }), []);

  const onSelectionChanged = useCallback((event) => {
    const sel = event.api.getSelectedRows();
    setSelectedIds(sel.map(r => r.id));
  }, []);

  const editCount = edits.size;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/books')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#667eea', padding: '6px 10px' }}
          >← Back to Books</button>
          <h1 style={{ margin: 0, fontSize: '22px' }}>📊 Bulk Edit</h1>
          <span style={{ color: '#666', fontSize: '13px' }}>
            {rows.length} books · {selectedIds.length > 0 && `${selectedIds.length} selected · `}
            {editCount > 0 ? <strong style={{ color: '#d97706' }}>{editCount} pending edit{editCount === 1 ? '' : 's'}</strong> : 'no changes'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Search title, author, ISBN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '260px', fontSize: '14px' }}
          />
          <button
            type="button"
            onClick={handleExportSelection}
            style={{ padding: '8px 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >📥 Export {selectedIds.length > 0 ? `(${selectedIds.length})` : 'All'}</button>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={editCount === 0 || saving}
            style={{ padding: '8px 14px', background: editCount > 0 ? '#fee2e2' : '#f3f4f6', color: editCount > 0 ? '#991b1b' : '#9ca3af', border: 'none', borderRadius: '4px', cursor: editCount > 0 && !saving ? 'pointer' : 'not-allowed', fontWeight: 500 }}
          >Discard{editCount > 0 ? ` (${editCount})` : ''}</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={editCount === 0 || saving || isReadOnly}
            style={{ padding: '8px 14px', background: editCount > 0 && !saving && !isReadOnly ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '4px', cursor: editCount > 0 && !saving && !isReadOnly ? 'pointer' : 'not-allowed', fontWeight: 600 }}
          >{saving ? '⏳ Saving…' : `💾 Save${editCount > 0 ? ` (${editCount})` : ''}`}</button>
        </div>
      </div>

      {/* Bulk action bar — only shown when rows are selected */}
      {selectedIds.length > 0 && !isReadOnly && (
        <BulkActionBar
          count={selectedIds.length}
          onApply={applyToSelected}
          onDelete={canDeleteBooks ? handleBulkDelete : null}
        />
      )}

      {/* Grid */}
      <div style={{ flex: 1, minHeight: '400px' }}>
        {loading ? (
          <p style={{ color: '#666' }}>Loading books…</p>
        ) : (
          <AgGridReact
            ref={gridRef}
            theme={themeQuartz}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection={rowSelection}
            quickFilterText={search}
            onCellValueChanged={onCellValueChanged}
            onSelectionChanged={onSelectionChanged}
            stopEditingWhenCellsLoseFocus={true}
            singleClickEdit={false}
            getRowId={p => String(p.data.id)}
            animateRows={true}
            suppressRowClickSelection={true}
            pagination={true}
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 200]}
          />
        )}
      </div>

      {/* Tip footer */}
      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
        💡 Double-click a cell to edit · Edited cells turn amber · Tick rows to bulk-edit · ⌘/Ctrl+F to filter
      </p>
    </div>
  );
}

function numericParser(params) {
  if (params.newValue === '' || params.newValue == null) return null;
  const n = parseFloat(params.newValue);
  return isNaN(n) ? params.oldValue : n;
}

function BulkActionBar({ count, onApply, onDelete }) {
  const [field, setField] = useState('sales_price');
  const [value, setValue] = useState('');

  const isBool = BOOL_FIELDS.has(field);
  const isCategory = field === 'category';
  const isCondition = field === 'condition';
  const isStatus = field === 'status';

  const handleApply = () => {
    if (value === '' && !isBool) return;
    let parsed = value;
    if (NUMERIC_FIELDS.has(field)) {
      parsed = parseFloat(value);
      if (isNaN(parsed)) return;
    } else if (isBool) {
      parsed = value === 'true';
    }
    onApply(field, parsed);
    setValue('');
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 600, color: '#1e40af' }}>{count} selected:</span>
      <span style={{ color: '#1e40af', fontSize: '13px' }}>Set</span>
      <select value={field} onChange={e => { setField(e.target.value); setValue(''); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
        <option value="sales_price">Selling Price</option>
        <option value="price">Buying Price</option>
        <option value="mrp">MRP</option>
        <option value="discount_percent">Discount %</option>
        <option value="category">Category</option>
        <option value="condition">Condition</option>
        <option value="quantity_total">Total Qty</option>
        <option value="quantity_available">Available Qty</option>
        <option value="status">Status</option>
        <option value="store_visible">Storefront</option>
        <option value="is_borrowable">Borrowable</option>
      </select>
      <span style={{ color: '#1e40af', fontSize: '13px' }}>=</span>
      {isCategory ? (
        <select value={value} onChange={e => setValue(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
          <option value="">—</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : isCondition ? (
        <select value={value} onChange={e => setValue(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
          <option value="">—</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : isStatus ? (
        <select value={value} onChange={e => setValue(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
          <option value="">—</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : isBool ? (
        <select value={value} onChange={e => setValue(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
          <option value="">—</option>
          {field === 'store_visible' ? (
            <>
              <option value="true">Show on website</option>
              <option value="false">Not for sale</option>
            </>
          ) : (
            <>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </>
          )}
        </select>
      ) : (
        <input
          type={NUMERIC_FIELDS.has(field) ? 'number' : 'text'}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="value…"
          style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', width: '140px', fontSize: '13px' }}
          onKeyDown={e => { if (e.key === 'Enter') handleApply(); }}
        />
      )}
      <button
        type="button"
        onClick={handleApply}
        style={{ padding: '7px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
      >Apply to {count}</button>
      <div style={{ flex: 1 }} />
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          style={{ padding: '7px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
        >🗑️ Delete {count}</button>
      )}
    </div>
  );
}
