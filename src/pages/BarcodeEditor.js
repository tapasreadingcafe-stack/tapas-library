import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { generateBarcodeSVG, generateBarcodeSVGString, generateZPL } from '../utils/barcodeUtils';

const SCALE = 5; // 1mm = 5px on screen for comfortable editing
const DEFAULT_CANVAS = { width: 50, height: 25 }; // mm

const inputStyle = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '12px', width: '100%', boxSizing: 'border-box' };
const btnPrimary = { padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' };
const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px', display: 'block' };

const ELEMENT_DEFAULTS = {
  barcode:    { width: 30, height: 10, fontSize: 10 },
  title:      { width: 24, height: 5,  fontSize: 10 },
  copyCode:   { width: 18, height: 4,  fontSize: 9  },
  price:      { width: 12, height: 5,  fontSize: 11 },
  brand:      { width: 26, height: 4,  fontSize: 8  },
  customText: { width: 20, height: 4,  fontSize: 9  },
  rectangle:  { width: 20, height: 10, fontSize: 10 },
  line:       { width: 20, height: 1,  fontSize: 10 },
  image:      { width: 10, height: 10, fontSize: 10 },
};

function makeElement(type, canvasSize) {
  const d = ELEMENT_DEFAULTS[type] || { width: 20, height: 8, fontSize: 10 };
  return {
    id: crypto.randomUUID(),
    type,
    x: Math.max(0, Math.round((canvasSize.width - d.width) / 2)),
    y: Math.max(0, Math.round((canvasSize.height - d.height) / 2)),
    width: d.width,
    height: d.height,
    fontSize: d.fontSize,
    fontWeight: 'normal',
    fontStyle: 'normal',
    text: '',
    color: '#000000',
    bgColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    imageDataUrl: '',
    priceDisplayMode: 'both', // 'both' = MRP+Selling, 'selling' = Selling only, 'mrp' = MRP only
  };
}

export default function BarcodeEditor() {
  const toast = useToast();
  const showToast = (msg, type) => toast[type]?.(msg) || toast.info(msg);
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ ...DEFAULT_CANVAS });
  const [gridSnap, setGridSnap] = useState(true);
  const [snapSize, setSnapSize] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  // ---- Load templates on mount + seed defaults ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('*').like('key', 'barcode_template_%');
      if (data) setTemplates(data);

      // Seed 5 default templates if they don't exist yet
      const hasDefaults = data?.some(t => t.key === 'barcode_template_Standard');
      if (!hasDefaults) {
        const defaults = [
          { key: 'barcode_template_Standard', value: JSON.stringify({ canvasSize: { width: 50, height: 25 }, elements: [
            { id: 't1-brand', type: 'brand', x: 2, y: 1, width: 46, height: 3, fontSize: 7, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't1-barcode', type: 'barcode', x: 2, y: 5, width: 46, height: 9, fontSize: 10, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't1-title', type: 'title', x: 2, y: 17, width: 28, height: 4, fontSize: 8, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't1-price', type: 'price', x: 30, y: 17, width: 18, height: 4, fontSize: 9, fontWeight: 'bold', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't1-rect', type: 'rectangle', x: 0, y: 0, width: 50, height: 25, fontSize: 10, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
          ]})},
          { key: 'barcode_template_Minimal', value: JSON.stringify({ canvasSize: { width: 50, height: 25 }, elements: [
            { id: 't2-barcode', type: 'barcode', x: 3, y: 3, width: 44, height: 12, fontSize: 10, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't2-code', type: 'copyCode', x: 14, y: 18, width: 22, height: 4, fontSize: 9, fontWeight: 'bold', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
          ]})},
          { key: 'barcode_template_Price Tag', value: JSON.stringify({ canvasSize: { width: 50, height: 25 }, elements: [
            { id: 't3-brand', type: 'brand', x: 2, y: 1, width: 46, height: 3, fontSize: 7, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't3-price', type: 'price', x: 2, y: 5, width: 46, height: 7, fontSize: 14, fontWeight: 'bold', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'selling' },
            { id: 't3-title', type: 'title', x: 2, y: 13, width: 46, height: 3, fontSize: 7, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't3-barcode', type: 'barcode', x: 8, y: 17, width: 34, height: 7, fontSize: 10, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
          ]})},
          { key: 'barcode_template_Full Info', value: JSON.stringify({ canvasSize: { width: 50, height: 25 }, elements: [
            { id: 't4-rect', type: 'rectangle', x: 0, y: 0, width: 50, height: 25, fontSize: 10, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't4-brand', type: 'brand', x: 2, y: 1, width: 46, height: 3, fontSize: 6, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't4-line', type: 'line', x: 2, y: 4, width: 46, height: 1, fontSize: 10, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't4-barcode', type: 'barcode', x: 2, y: 5, width: 46, height: 7, fontSize: 10, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't4-code', type: 'copyCode', x: 2, y: 14, width: 20, height: 3, fontSize: 7, fontWeight: 'bold', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't4-title', type: 'title', x: 2, y: 18, width: 28, height: 3, fontSize: 7, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
            { id: 't4-price', type: 'price', x: 30, y: 18, width: 18, height: 5, fontSize: 8, fontWeight: 'bold', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
          ]})},
          { key: 'barcode_template_Barcode Only', value: JSON.stringify({ canvasSize: { width: 50, height: 25 }, elements: [
            { id: 't5-barcode', type: 'barcode', x: 1, y: 2, width: 48, height: 20, fontSize: 10, fontWeight: 'normal', text: '', color: '#000000', bgColor: 'transparent', borderWidth: 1, borderColor: '#000000', priceDisplayMode: 'both' },
          ]})},
        ];
        for (const t of defaults) {
          await supabase.from('app_settings').upsert({ ...t, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        }
        const { data: fresh } = await supabase.from('app_settings').select('*').like('key', 'barcode_template_%');
        if (fresh) setTemplates(fresh);
      }
    })();
  }, []);

  // ---- Drag handling ----
  const startDrag = useCallback((id, e) => {
    e.preventDefault();
    setSelectedId(id);
    const el = elements.find(el => el.id === id);
    if (!el) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, elStartX: el.x, elStartY: el.y };
  }, [elements]);

  // ---- Resize handling ----
  const startResize = useCallback((id, e) => {
    e.preventDefault();
    const el = elements.find(el => el.id === id);
    if (!el) return;
    resizeRef.current = { id, startX: e.clientX, startY: e.clientY, elStartW: el.width, elStartH: el.height };
  }, [elements]);

  useEffect(() => {
    const onMove = (e) => {
      if (dragRef.current) {
        const dx = (e.clientX - dragRef.current.startX) / SCALE;
        const dy = (e.clientY - dragRef.current.startY) / SCALE;
        let newX = dragRef.current.elStartX + dx;
        let newY = dragRef.current.elStartY + dy;
        if (gridSnap) {
          newX = Math.round(newX / snapSize) * snapSize;
          newY = Math.round(newY / snapSize) * snapSize;
        }
        newX = Math.max(0, Math.min(newX, canvasSize.width - 2));
        newY = Math.max(0, Math.min(newY, canvasSize.height - 2));
        setElements(prev => prev.map(el => el.id === dragRef.current.id ? { ...el, x: newX, y: newY } : el));
      }
      if (resizeRef.current) {
        const dx = (e.clientX - resizeRef.current.startX) / SCALE;
        const dy = (e.clientY - resizeRef.current.startY) / SCALE;
        let newW = resizeRef.current.elStartW + dx;
        let newH = resizeRef.current.elStartH + dy;
        if (gridSnap) {
          newW = Math.round(newW / snapSize) * snapSize;
          newH = Math.round(newH / snapSize) * snapSize;
        }
        newW = Math.max(2, newW);
        newH = Math.max(1, newH);
        setElements(prev => prev.map(el => el.id === resizeRef.current.id ? { ...el, width: newW, height: newH } : el));
      }
    };
    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [gridSnap, snapSize, canvasSize.width, canvasSize.height]);

  // ---- Keyboard delete ----
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && document.activeElement === document.body) {
        setElements(prev => prev.filter(el => el && el.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // ---- Add element ----
  const addElement = (type) => {
    const el = makeElement(type, canvasSize);
    setElements(prev => [...prev, el]);
    setSelectedId(el.id);
  };

  // ---- Update selected element property ----
  const updateEl = useCallback((key, value) => {
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, [key]: value } : el));
  }, [selectedId]);

  // ---- Save template ----
  const saveTemplate = async () => {
    if (!templateName.trim()) { showToast('Enter a template name', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: `barcode_template_${templateName.trim()}`,
        value: JSON.stringify({ elements, canvasSize }),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (error) throw error;
      showToast('Template saved!', 'success');
      const { data } = await supabase.from('app_settings').select('*').like('key', 'barcode_template_%');
      if (data) setTemplates(data);
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    }
    setSaving(false);
  };

  // ---- Load template ----
  const loadTemplate = (key) => {
    const t = templates.find(t => t.key === key);
    if (!t) return;
    try {
      const parsed = JSON.parse(t.value);
      setElements(parsed.elements || []);
      setCanvasSize(parsed.canvasSize || { ...DEFAULT_CANVAS });
      setSelectedId(null);
      setTemplateName(key.replace('barcode_template_', ''));
      showToast('Template loaded', 'success');
    } catch { showToast('Invalid template data', 'error'); }
  };

  // ---- Delete template ----
  const deleteTemplate = async () => {
    if (!templateName.trim()) return;
    const key = `barcode_template_${templateName.trim()}`;
    await supabase.from('app_settings').delete().eq('key', key);
    setTemplates(prev => prev.filter(t => t.key !== key));
    showToast('Template deleted', 'success');
  };

  // ---- Build label HTML (shared by print preview + direct print) ----
  const buildLabelHtml = () => {
    return (elements || []).filter(Boolean).map(el => {
      const base = `position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.width}mm;height:${el.height}mm;display:flex;align-items:center;justify-content:center;overflow:hidden;background:${el.bgColor || 'transparent'};`;
      let inner = '';
      if (el.type === 'barcode') {
        inner = generateBarcodeSVGString('BFIC0001', { height: el.height * 3 });
      } else if (el.type === 'title') {
        inner = `<span style="font-size:${el.fontSize}pt;font-weight:${el.fontWeight};color:${el.color}">Book Title</span>`;
      } else if (el.type === 'copyCode') {
        inner = `<span style="font-size:${el.fontSize}pt;font-family:monospace;color:${el.color};white-space:nowrap">B-FIC-0001</span>`;
      } else if (el.type === 'price') {
        inner = `<span style="font-size:${el.fontSize}pt;font-weight:bold;color:${el.color}">${el.priceDisplayMode === 'mrp' ? 'MRP ₹299' : el.priceDisplayMode === 'selling' ? '₹199' : '₹299 ₹199'}</span>`;
      } else if (el.type === 'brand') {
        inner = `<span style="font-size:${el.fontSize}pt;font-weight:${el.fontWeight};color:${el.color}">${el.text || 'Tapas Reading Cafe'}</span>`;
      } else if (el.type === 'customText') {
        inner = `<span style="font-size:${el.fontSize}pt;color:${el.color}">${el.text || 'Custom Text'}</span>`;
      } else if (el.type === 'rectangle') {
        inner = `<div style="width:100%;height:100%;border:${el.borderWidth || 1}px solid ${el.borderColor}"></div>`;
      } else if (el.type === 'line') {
        inner = `<div style="width:100%;height:${el.borderWidth || 1}px;background:${el.borderColor || '#000'}"></div>`;
      } else if (el.type === 'image' && el.imageDataUrl) {
        inner = `<img src="${el.imageDataUrl}" style="max-width:100%;max-height:100%;object-fit:contain" />`;
      }
      return `<div style="${base}">${inner}</div>`;
    }).join('\n');
  };

  // ---- Print preview (opens in new window for viewing) ----
  const printPreview = () => {
    const elHtml = buildLabelHtml();
    const w = window.open('', '_blank');
    if (!w) { showToast('Popup blocked', 'error'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Print Barcodes</title>
      <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
        .label-container { position: relative; width: ${canvasSize.width}mm; height: ${canvasSize.height}mm; overflow: hidden; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        @media print {
          @page { margin: 0; }
          body { margin: 0; padding: 0; background: none; display: block; }
          .label-container { box-shadow: none; }
        }
      </style></head>
      <body><div class="label-container">${elHtml}</div></body></html>`);
    w.document.close();
  };

  // ---- Direct print: generate raw ZPL and send to Zebra via Flask API (port 5050) ----
  const PRINT_API = 'http://127.0.0.1:5050';
  const [directPrinting, setDirectPrinting] = useState(false);

  const directPrint = async () => {
    setDirectPrinting(true);
    try {
      // Build test label from editor elements
      const brandEl = elements.find(el => el.type === 'brand');
      const testLabel = {
        brand: brandEl?.text || 'TAPAS READING CAFE',
        copyCode: 'B-FIC-0001',
        title: 'Book Title',
        price: 'Rs.200',
        mrpStrike: 'Rs.300',
      };

      // Use current editor layout as the template
      const zpl = generateZPL([testLabel], { elements, canvasSize });

      const res = await fetch(`${PRINT_API}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zpl }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Test label sent to printer!', 'success');
      } else {
        showToast('Print failed: ' + (data.message || data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showToast('Cannot reach label printer service. Is it running on port 5050?', 'error');
    }
    setDirectPrinting(false);
  };

  // ---- Image upload handler ----
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateEl('imageDataUrl', ev.target.result);
    reader.readAsDataURL(file);
  };

  const selectedEl = elements.find(el => el.id === selectedId);
  const isTextType = selectedEl && ['title', 'copyCode', 'price', 'brand', 'customText'].includes(selectedEl.type);
  const hasText = selectedEl && ['customText', 'brand'].includes(selectedEl.type);
  const hasBorder = selectedEl && ['rectangle', 'line'].includes(selectedEl.type);

  // ---- Toolbar button data ----
  const toolbarButtons = [
    { type: 'barcode',    icon: '\uD83C\uDFF7\uFE0F', label: 'Barcode' },
    { type: 'title',      icon: '\uD83D\uDCD6', label: 'Title' },
    { type: 'copyCode',   icon: '\uD83D\uDD24', label: 'Code' },
    { type: 'price',      icon: '\uD83D\uDCB0', label: 'Price' },
    { type: 'brand',      icon: '\u2615',       label: 'Brand' },
    { type: 'customText', icon: '\u270F\uFE0F', label: 'Text' },
    { type: 'rectangle',  icon: '\u25AD',       label: 'Rectangle' },
    { type: 'line',       icon: '\u2015',       label: 'Line' },
    { type: 'image',      icon: '\uD83D\uDDBC\uFE0F', label: 'Image' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <Link to="/" style={{ textDecoration: 'none', fontSize: '22px' }}>{'\u2190'}</Link>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>Barcode Label Editor</h1>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* ---- Left column ---- */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#fff', borderRadius: '10px', alignItems: 'center', marginBottom: '16px' }}>
            {toolbarButtons.map(b => (
              <button key={b.type} onClick={() => addElement(b.type)} style={{ padding: '6px 10px', background: '#f7f7f7', border: '1px solid #e0e0e0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{b.icon}</span> {b.label}
              </button>
            ))}

            <div style={{ width: '1px', height: '28px', background: '#ddd', margin: '0 4px' }} />

            <label style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
              W
              <input type="number" value={canvasSize.width} min={10} max={200} onChange={e => setCanvasSize(s => ({ ...s, width: Number(e.target.value) }))} style={{ ...inputStyle, width: '56px' }} />
            </label>
            <span style={{ fontSize: '12px', color: '#999' }}>{'\u00D7'}</span>
            <label style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
              H
              <input type="number" value={canvasSize.height} min={10} max={200} onChange={e => setCanvasSize(s => ({ ...s, height: Number(e.target.value) }))} style={{ ...inputStyle, width: '56px' }} />
            </label>
            <span style={{ fontSize: '11px', color: '#999' }}>mm</span>

            <div style={{ width: '1px', height: '28px', background: '#ddd', margin: '0 4px' }} />

            <label style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={gridSnap} onChange={e => setGridSnap(e.target.checked)} />
              Snap {snapSize}mm
            </label>
          </div>

          {/* Canvas */}
          <div style={{ background: '#f0f0f0', borderRadius: '10px', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: canvasSize.height * SCALE + 60, backgroundImage: 'repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%)', backgroundSize: '16px 16px' }}>
            <div
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
              style={{
                position: 'relative',
                width: canvasSize.width * SCALE,
                height: canvasSize.height * SCALE,
                background: '#ffffff',
                border: '2px dashed #ccc',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {(elements || []).filter(Boolean).map(el => (
                <div
                  key={el.id}
                  onMouseDown={(e) => startDrag(el.id, e)}
                  style={{
                    position: 'absolute',
                    left: el.x * SCALE,
                    top: el.y * SCALE,
                    width: el.width * SCALE,
                    height: el.height * SCALE,
                    border: selectedId === el.id ? '2px solid #667eea' : '1px dashed #ddd',
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: el.bgColor || 'transparent',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                  }}
                >
                  {el.type === 'barcode' && generateBarcodeSVG('BFIC0001', { height: el.height * SCALE * 0.8 })}
                  {el.type === 'title' && <span style={{ fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color }}>Book Title</span>}
                  {el.type === 'copyCode' && <span style={{ fontSize: el.fontSize, fontFamily: 'monospace', color: el.color }}>B-FIC-0001</span>}
                  {el.type === 'price' && <span style={{ fontSize: el.fontSize, fontWeight: 'bold', color: el.color }}>{el.priceDisplayMode === 'mrp' ? 'MRP ₹299' : el.priceDisplayMode === 'selling' ? '₹199' : '₹299 ₹199'}</span>}
                  {el.type === 'brand' && <span style={{ fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color }}>{el.text || 'Tapas Reading Cafe'}</span>}
                  {el.type === 'customText' && <span style={{ fontSize: el.fontSize, color: el.color }}>{el.text || 'Custom Text'}</span>}
                  {el.type === 'rectangle' && <div style={{ width: '100%', height: '100%', border: `${el.borderWidth || 1}px solid ${el.borderColor}`, boxSizing: 'border-box' }} />}
                  {el.type === 'line' && <div style={{ width: '100%', height: el.borderWidth || 1, background: el.borderColor || '#000' }} />}
                  {el.type === 'image' && el.imageDataUrl && <img src={el.imageDataUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
                  {el.type === 'image' && !el.imageDataUrl && <span style={{ fontSize: 10, color: '#aaa' }}>No image</span>}

                  {selectedId === el.id && (
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); startResize(el.id, e); }}
                      style={{ position: 'absolute', right: -4, bottom: -4, width: 8, height: 8, background: '#667eea', cursor: 'nwse-resize', borderRadius: 2 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Print button */}
          <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={printPreview} style={{ ...btnPrimary, padding: '10px 24px', fontSize: '14px' }}>
              {'\uD83D\uDDA8\uFE0F'} Print Preview
            </button>
            <button onClick={directPrint} disabled={directPrinting} style={{ ...btnPrimary, padding: '10px 24px', fontSize: '14px', background: '#38a169', opacity: directPrinting ? 0.6 : 1 }}>
              {'\uD83D\uDDA8\uFE0F'} {directPrinting ? 'Printing...' : 'Direct Print'}
            </button>
          </div>
        </div>

        {/* ---- Right column (properties) ---- */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {/* Template section */}
          <div style={{ background: '#fff', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <label style={labelStyle}>Template Name</label>
            <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="my-label" style={{ ...inputStyle, marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button onClick={saveTemplate} disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={deleteTemplate} style={{ ...btnPrimary, flex: 0, background: '#e53e3e', padding: '8px 12px' }}>
                {'\uD83D\uDDD1\uFE0F'}
              </button>
            </div>
            <label style={labelStyle}>Load Template</label>
            <select onChange={e => { if (e.target.value) loadTemplate(e.target.value); }} value="" style={{ ...inputStyle }}>
              <option value="">-- Select --</option>
              {templates.map(t => (
                <option key={t.key} value={t.key}>{t.key.replace('barcode_template_', '')}</option>
              ))}
            </select>
          </div>

          {/* Properties panel */}
          <div style={{ background: '#fff', borderRadius: '10px', padding: '16px' }}>
            {!selectedEl ? (
              <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', margin: '20px 0' }}>Select an element to edit its properties</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <input value={selectedEl.type} readOnly style={{ ...inputStyle, background: '#f7f7f7', cursor: 'default' }} />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>X (mm)</label>
                    <input type="number" step="0.5" value={selectedEl.x} onChange={e => updateEl('x', Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Y (mm)</label>
                    <input type="number" step="0.5" value={selectedEl.y} onChange={e => updateEl('y', Number(e.target.value))} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Width (mm)</label>
                    <input type="number" step="0.5" min="1" value={selectedEl.width} onChange={e => updateEl('width', Math.max(1, Number(e.target.value)))} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Height (mm)</label>
                    <input type="number" step="0.5" min="1" value={selectedEl.height} onChange={e => updateEl('height', Math.max(1, Number(e.target.value)))} style={inputStyle} />
                  </div>
                </div>

                {isTextType && (
                  <>
                    <div>
                      <label style={labelStyle}>Font Size (pt)</label>
                      <input type="number" min="4" max="72" value={selectedEl.fontSize} onChange={e => updateEl('fontSize', Number(e.target.value))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Font Weight</label>
                      <button
                        onClick={() => updateEl('fontWeight', selectedEl.fontWeight === 'bold' ? 'normal' : 'bold')}
                        style={{ ...btnPrimary, width: '100%', background: selectedEl.fontWeight === 'bold' ? '#667eea' : '#e2e8f0', color: selectedEl.fontWeight === 'bold' ? '#fff' : '#333' }}
                      >
                        {selectedEl.fontWeight === 'bold' ? 'Bold' : 'Normal'}
                      </button>
                    </div>
                  </>
                )}

                {selectedEl && selectedEl.type === 'price' && (
                  <div>
                    <label style={labelStyle}>Price Display</label>
                    <select value={selectedEl.priceDisplayMode || 'both'} onChange={e => updateEl('priceDisplayMode', e.target.value)} style={inputStyle}>
                      <option value="both">MRP + Selling (strikethrough)</option>
                      <option value="selling">Selling Price Only</option>
                      <option value="mrp">MRP Only</option>
                    </select>
                  </div>
                )}

                {hasText && (
                  <div>
                    <label style={labelStyle}>Text Content</label>
                    <input value={selectedEl.text} onChange={e => updateEl('text', e.target.value)} placeholder={selectedEl.type === 'brand' ? 'Tapas Reading Cafe' : 'Custom Text'} style={inputStyle} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Color</label>
                    <input type="color" value={selectedEl.color} onChange={e => updateEl('color', e.target.value)} style={{ ...inputStyle, padding: '2px 4px', height: '32px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Background</label>
                    <input type="color" value={selectedEl.bgColor === 'transparent' ? '#ffffff' : selectedEl.bgColor} onChange={e => updateEl('bgColor', e.target.value)} style={{ ...inputStyle, padding: '2px 4px', height: '32px' }} />
                  </div>
                </div>

                {hasBorder && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Border Width</label>
                      <input type="number" min="0" max="10" value={selectedEl.borderWidth} onChange={e => updateEl('borderWidth', Number(e.target.value))} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Border Color</label>
                      <input type="color" value={selectedEl.borderColor} onChange={e => updateEl('borderColor', e.target.value)} style={{ ...inputStyle, padding: '2px 4px', height: '32px' }} />
                    </div>
                  </div>
                )}

                {selectedEl.type === 'image' && (
                  <div>
                    <label style={labelStyle}>Upload Image</label>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '12px' }} />
                  </div>
                )}

                <button
                  onClick={() => { setElements(prev => prev.filter(el => el && el.id !== selectedId)); setSelectedId(null); }}
                  style={{ ...btnPrimary, background: '#e53e3e', marginTop: '8px' }}
                >
                  {'\uD83D\uDDD1\uFE0F'} Delete Element
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
