// =====================================================================
// AssetsPanel + AssetPicker — Phase C, Lane G3.
//
// Left-rail slot 6. Grid of uploaded images/videos/SVGs from the
// editor-assets Supabase bucket. Supports:
//   * drag-drop upload anywhere on the panel (progress bar)
//   * file-picker upload button
//   * filter by kind (all / image / video / svg / other)
//   * fuzzy search by filename
//   * click to copy public URL to clipboard (with toast confirmation)
//   * trash icon to delete
//   * HTML5 drag onto the canvas — Canvas drag handler sees the custom
//     type `application/x-tapas-asset` and inserts an <img> with the
//     asset's public URL.
//
// AssetPicker is the modal variant used by the Settings tab's
// "Replace image" button. Same grid; selection calls back onPick(url).
// =====================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadAsset, listAssets, deleteAsset, classifyAsset } from '../utils/assetLibrary';

// ---- Shared chrome (matches WebsiteEditor.stubs.js) -----------------

const P = {
  bg:          '#2a2a2a',
  border:      '#2a2a2a',
  text:        '#e5e5e5',
  textDim:     '#a0a0a0',
  textFaint:   '#6a6a6a',
  rowHover:    '#333',
  accent:      '#146ef5',
  accentDim:   '#146ef522',
  danger:      '#c0443a',
  input:       '#1a1a1a',
  inputBorder: '#3a3a3a',
  labelSize:   '11px',
  labelLetter: '0.05em',
};

const KIND_FILTERS = [
  { key: 'all',   label: 'All'    },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' },
  { key: 'svg',   label: 'SVG'    },
  { key: 'other', label: 'Other'  },
];

// The transfer type the Canvas watches for — drag from the grid onto
// the canvas and the editor inserts a fresh <img> at the drop target.
export const ASSET_DRAG_TYPE = 'application/x-tapas-asset';

// ---------------------------------------------------------------------
// AssetsPanel — rail surface
// ---------------------------------------------------------------------
export default function AssetsPanel({ pageId, onInsertAsset }) {
  const grid = useGridState({ pageId });
  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: P.bg,
      borderRight: `1px solid ${P.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Header
        onUpload={grid.onUploadClick}
        onRefresh={grid.refresh}
      />
      <FilterRow
        query={grid.query}
        onQuery={grid.setQuery}
        kind={grid.kind}
        onKind={grid.setKind}
      />
      <FolderRow
        folders={grid.folders}
        folder={grid.folder}
        onFolder={grid.setFolder}
      />
      <GridSurface
        state={grid}
        onInsertAsset={onInsertAsset}
        variant="panel"
      />
      <FooterBar state={grid} />
    </div>
  );
}

// ---------------------------------------------------------------------
// AssetPicker — modal variant used by the Settings tab
// ---------------------------------------------------------------------
export function AssetPicker({ open, pageId, onPick, onClose }) {
  const grid = useGridState({ pageId, enabled: open });

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') { onClose?.(); e.stopPropagation(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3100,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8vh 6vw',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '760px', maxWidth: '100%', height: '72vh',
          background: '#222', border: `1px solid ${P.border}`,
          borderRadius: '6px', boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
        }}
      >
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${P.border}`,
          color: P.text, fontSize: '13px', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Replace image</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: P.textDim,
              border: 'none', cursor: 'pointer', fontSize: '16px',
            }}
            title="Close"
          >×</button>
        </div>
        <FilterRow
          query={grid.query}
          onQuery={grid.setQuery}
          kind={grid.kind}
          onKind={grid.setKind}
        />
        <FolderRow
          folders={grid.folders}
          folder={grid.folder}
          onFolder={grid.setFolder}
        />
        <GridSurface
          state={grid}
          variant="picker"
          onPick={(a) => { onPick?.(a); onClose?.(); }}
        />
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: '8px' }}>
          <button onClick={grid.onUploadClick} style={btnStyle(true)}>
            ⬆ Upload new
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={btnStyle(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// useGridState — the shared data/UI state. Panel and picker both
// consume this so one set of bugs lives in one place.
// ---------------------------------------------------------------------
function useGridState({ pageId, enabled = true }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [folder, setFolder] = useState('all');
  const [uploads, setUploads] = useState([]);   // { id, name, progress, error? }
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await listAssets({});
      setAssets(list);
    } catch (e) {
      setLoadError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  const notify = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const uploadFiles = useCallback(async (files) => {
    const jobs = Array.from(files || []).filter(Boolean);
    if (jobs.length === 0) return;
    for (const file of jobs) {
      const uploadId = Math.random().toString(36).slice(2, 10);
      setUploads((u) => [...u, { id: uploadId, name: file.name, progress: 0 }]);
      try {
        const asset = await uploadAsset(file, {
          pageId: pageId || 'site',
          onProgress: (p) => {
            setUploads((u) => u.map((j) => (j.id === uploadId ? { ...j, progress: p } : j)));
          },
        });
        setAssets((a) => [assetForDisplay(asset), ...a]);
        setUploads((u) => u.filter((j) => j.id !== uploadId));
        notify(`Uploaded ${file.name}`);
      } catch (e) {
        setUploads((u) => u.map((j) => (j.id === uploadId ? { ...j, error: e.message || String(e) } : j)));
        // Clear the failed entry after a beat so the toast is legible.
        setTimeout(() => setUploads((u) => u.filter((j) => j.id !== uploadId)), 4000);
        notify(`✗ Upload failed: ${file.name}`);
      }
    }
  }, [pageId, notify]);

  const onUploadClick = useCallback(() => inputRef.current?.click(), []);

  const remove = useCallback(async (asset) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${asset.name}"?`)) return;
    try {
      await deleteAsset(asset);
      setAssets((a) => a.filter((x) => x.path !== asset.path));
      notify(`Deleted ${asset.name}`);
    } catch (e) {
      notify(`✗ ${e.message || 'Delete failed'}`);
    }
  }, [notify]);

  // Derive the distinct folder list (by uploading page) straight
  // from the asset set so new uploads add folders without a re-fetch.
  const folders = useMemo(() => {
    const names = new Set();
    for (const a of assets) if (a.page_id) names.add(a.page_id);
    return Array.from(names).sort();
  }, [assets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (kind !== 'all' && a.kind !== kind) return false;
      if (folder !== 'all' && a.page_id !== folder) return false;
      if (!q) return true;
      return (a.name || '').toLowerCase().includes(q)
          || (a.page_id || '').toLowerCase().includes(q);
    });
  }, [assets, query, kind, folder]);

  return {
    folders,
    folder, setFolder,
    assets: filtered,
    loading,
    loadError,
    query, setQuery,
    kind, setKind,
    uploads,
    toast,
    refresh,
    onUploadClick,
    inputRef,
    uploadFiles,
    remove,
    notify,
  };
}

// Normalise uploadAsset's return shape to match listAssets' display
// shape — the grid is driven off the same record for both.
function assetForDisplay(a) {
  return {
    ...a,
    kind: classifyAsset({ name: a.name, metadata: { mimetype: a.type } }),
    page_id: a.path?.split('/')[0] || 'site',
  };
}

// ---------------------------------------------------------------------
// Header — title + refresh + upload button + hidden <input type=file>
// ---------------------------------------------------------------------
function Header({ onUpload, onRefresh }) {
  return (
    <div style={{
      height: '32px', flexShrink: 0,
      padding: '0 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid ${P.border}`,
      color: P.textDim, fontSize: P.labelSize, fontWeight: 600,
      letterSpacing: P.labelLetter, textTransform: 'uppercase',
    }}>
      <span>Assets</span>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={onRefresh} title="Refresh" style={iconBtn()}>↻</button>
        <button onClick={onUpload} title="Upload" style={iconBtn({ accent: true })}>+</button>
      </div>
    </div>
  );
}

function iconBtn({ accent = false } = {}) {
  return {
    width: '22px', height: '22px', padding: 0,
    background: accent ? P.accentDim : 'transparent',
    color: accent ? P.accent : P.textDim,
    border: `1px solid ${accent ? P.accent : P.inputBorder}`,
    borderRadius: '3px',
    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  };
}

function btnStyle(primary) {
  return {
    padding: '6px 12px', fontSize: '12px', fontWeight: 600,
    background: primary ? P.accentDim : 'transparent',
    color: primary ? P.accent : P.text,
    border: `1px solid ${primary ? P.accent : P.inputBorder}`,
    borderRadius: '3px', cursor: 'pointer',
  };
}

// ---------------------------------------------------------------------
// Filter row — search + kind tabs
// ---------------------------------------------------------------------
// Folder chips — upload paths use the uploading page's key as a
// prefix, so grouping by page_id gives staff a lightweight folders
// UI without needing an explicit move operation. Hidden when there's
// just one folder (usual fresh-site state).
function FolderRow({ folders, folder, onFolder }) {
  if (!folders || folders.length <= 1) return null;
  const all = [{ key: 'all', label: `All · ${folders.length} folders` }]
    .concat(folders.map((f) => ({ key: f, label: f })));
  return (
    <div style={{
      padding: '6px 10px', display: 'flex', gap: '4px', flexWrap: 'wrap',
      borderBottom: `1px solid ${P.border}`,
    }}>
      {all.map((f) => (
        <button
          key={f.key}
          onClick={() => onFolder(f.key)}
          style={{
            padding: '3px 8px', fontSize: '10.5px',
            background: folder === f.key ? P.accentDim : 'transparent',
            color:      folder === f.key ? P.accent    : P.textDim,
            border: `1px solid ${folder === f.key ? P.accent : P.inputBorder}`,
            borderRadius: '3px', cursor: 'pointer',
            fontFamily: f.key === 'all' ? 'inherit' : 'ui-monospace, monospace',
          }}
        >{f.label}</button>
      ))}
    </div>
  );
}

function FilterRow({ query, onQuery, kind, onKind }) {
  return (
    <div style={{
      padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px',
      borderBottom: `1px solid ${P.border}`,
    }}>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search filenames…"
        style={{
          background: P.input, color: P.text,
          border: `1px solid ${P.inputBorder}`, borderRadius: '3px',
          padding: '5px 8px', fontSize: '11.5px', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {KIND_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onKind(f.key)}
            style={{
              padding: '3px 8px', fontSize: '10.5px',
              background: kind === f.key ? P.accentDim : 'transparent',
              color:      kind === f.key ? P.accent    : P.textDim,
              border: `1px solid ${kind === f.key ? P.accent : P.inputBorder}`,
              borderRadius: '3px', cursor: 'pointer',
            }}
          >{f.label}</button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// GridSurface — the scrollable grid. Handles drag-drop upload and
// drag-out to canvas. `variant` controls whether the tile click copies
// the URL (panel) or resolves the picker (picker variant).
// ---------------------------------------------------------------------
function GridSurface({ state, variant, onInsertAsset, onPick }) {
  const {
    assets, loading, loadError, uploads, toast,
    uploadFiles, inputRef, remove, notify,
  } = state;
  const [dragActive, setDragActive] = useState(false);

  const onDragEnter = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragActive(true);
  };
  const onDragOver = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragActive(false);
  };
  const onDrop = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragActive(false);
    uploadFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        flex: 1, position: 'relative',
        overflowY: 'auto', padding: '8px',
        display: 'grid',
        gridTemplateColumns: variant === 'picker'
          ? 'repeat(auto-fill, minmax(130px, 1fr))'
          : 'repeat(2, 1fr)',
        gap: '8px',
        alignContent: 'start',
      }}
    >
      {loading && assets.length === 0 && (
        <EmptyText>Loading assets…</EmptyText>
      )}
      {loadError && (
        <EmptyText danger>⚠ {loadError}</EmptyText>
      )}
      {!loading && !loadError && assets.length === 0 && uploads.length === 0 && (
        <EmptyText>
          Drop files here or click + to upload.
        </EmptyText>
      )}

      {uploads.map((u) => (
        <UploadTile key={u.id} upload={u} />
      ))}
      {assets.map((a) => (
        <AssetTile
          key={a.path}
          asset={a}
          variant={variant}
          onCopy={() => {
            copyToClipboard(a.url);
            notify('URL copied');
          }}
          onDelete={() => remove(a)}
          onInsert={onInsertAsset}
          onPick={onPick}
        />
      ))}

      {dragActive && <DropOverlay />}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm,.svg"
        style={{ display: 'none' }}
        onChange={(e) => {
          uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {toast && (
        <div style={{
          position: 'sticky', bottom: 0,
          gridColumn: '1 / -1',
          padding: '6px 10px', margin: '6px 0 0',
          background: '#1a1a1a', color: P.text,
          border: `1px solid ${P.border}`, borderRadius: '3px',
          fontSize: '11px', textAlign: 'center',
        }}>{toast}</div>
      )}
    </div>
  );
}

function hasFiles(e) {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes('Files');
}

function EmptyText({ children, danger }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      padding: '24px 8px',
      textAlign: 'center',
      color: danger ? '#ff9a9a' : P.textFaint,
      fontSize: '11.5px', lineHeight: 1.5,
    }}>{children}</div>
  );
}

function DropOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(20, 110, 245, 0.12)',
      border: `2px dashed ${P.accent}`,
      color: P.accent, fontSize: '13px', fontWeight: 600,
      pointerEvents: 'none', zIndex: 5,
    }}>
      Drop to upload
    </div>
  );
}

// ---------------------------------------------------------------------
// Individual asset tile
// ---------------------------------------------------------------------
function AssetTile({ asset, variant, onCopy, onDelete, onInsert, onPick }) {
  const [hover, setHover] = useState(false);
  const onTileClick = () => {
    if (variant === 'picker') onPick?.(asset);
    else onCopy?.();
  };
  const onDragStart = (e) => {
    // Tell the Canvas's drop handler this is an asset, not a block.
    e.dataTransfer.setData('application/x-tapas-asset', JSON.stringify({
      url: asset.url,
      alt: asset.name,
      kind: asset.kind,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <div
      draggable={variant !== 'picker'}
      onDragStart={onDragStart}
      onClick={onTileClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={asset.name}
      style={{
        position: 'relative', aspectRatio: '1 / 1',
        background: P.input,
        border: `1px solid ${hover ? P.accent : P.border}`,
        borderRadius: '3px', overflow: 'hidden',
        cursor: variant === 'picker' ? 'pointer' : 'grab',
      }}
    >
      <AssetThumb asset={asset} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '2px 4px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        color: '#e5e5e5', fontSize: '10px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{asset.name}</div>
      {hover && variant !== 'picker' && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
          style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '20px', height: '20px', padding: 0,
            background: P.danger, color: '#fff',
            border: 'none', borderRadius: '3px',
            cursor: 'pointer', fontSize: '11px', fontWeight: 700,
          }}
        >×</button>
      )}
      {onInsert && variant !== 'picker' && hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onInsert(asset); }}
          title="Insert on canvas"
          style={{
            position: 'absolute', top: '4px', left: '4px',
            width: '20px', height: '20px', padding: 0,
            background: P.accent, color: '#fff',
            border: 'none', borderRadius: '3px',
            cursor: 'pointer', fontSize: '12px', fontWeight: 700,
          }}
        >↙</button>
      )}
    </div>
  );
}

function AssetThumb({ asset }) {
  if (asset.kind === 'video') {
    return (
      <div style={{ ...coverFill(), display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.text, fontSize: '22px' }}>
        ▶
      </div>
    );
  }
  if (asset.kind === 'svg') {
    return (
      <div style={{ ...coverFill(), background: '#fff' }}>
        <img src={asset.thumb_url || asset.url} alt={asset.name} style={coverImg()} />
      </div>
    );
  }
  return <img src={asset.thumb_url || asset.url} alt={asset.name} style={coverImg()} />;
}

function coverFill() {
  return { position: 'absolute', inset: 0 };
}
function coverImg() {
  return { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
}

// ---------------------------------------------------------------------
// UploadTile — pending upload with progress bar
// ---------------------------------------------------------------------
function UploadTile({ upload }) {
  const pct = Math.round((upload.progress || 0) * 100);
  return (
    <div style={{
      position: 'relative', aspectRatio: '1 / 1',
      background: P.input,
      border: `1px solid ${upload.error ? P.danger : P.accent}`,
      borderRadius: '3px', overflow: 'hidden',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: upload.error ? '#ff9a9a' : P.text,
        fontSize: '11px', textAlign: 'center', padding: '6px',
      }}>
        {upload.error ? `✗ ${upload.error}` : `${pct}%`}
      </div>
      <div style={{
        height: '3px', width: `${pct}%`,
        background: P.accent, transition: 'width 0.15s ease',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '2px 4px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        color: '#e5e5e5', fontSize: '10px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{upload.name}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Footer bar — count + tip
// ---------------------------------------------------------------------
function FooterBar({ state }) {
  return (
    <div style={{
      flexShrink: 0,
      padding: '6px 10px', borderTop: `1px solid ${P.border}`,
      color: P.textFaint, fontSize: '10.5px',
      display: 'flex', justifyContent: 'space-between',
    }}>
      <span>{state.assets.length} item{state.assets.length === 1 ? '' : 's'}</span>
      <span>Drag onto canvas</span>
    </div>
  );
}

// Small clipboard helper — newer navigator.clipboard API with a
// contenteditable-fallback for older browsers. Silent failure because
// UI already shows a toast.
function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch {}
}
