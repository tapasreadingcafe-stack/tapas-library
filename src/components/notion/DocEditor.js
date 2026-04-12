import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BLOCK_TYPES, newBlock, placeCaretAtEnd, N } from './shared';

// =====================================================================
// DocEditor — Notion-style block editor with slash menu
// ---------------------------------------------------------------------
// Props:
//   blocks       current block array (or [])
//   onChange     (newBlocks) => void — called with the next block array
//
// Features:
//   - Contenteditable blocks (text/headings/todo/bullet/numbered/quote/
//     divider/callout/code)
//   - Slash menu: type `/` at the start of an empty block to open a
//     filterable block-type picker. Arrow keys to navigate, Enter to
//     insert, Escape to close.
//   - Enter splits, Backspace on empty merges, Tab/Shift+Tab indents
//     list items up to 4 levels.
//   - Hover ⋮⋮ handle opens a block-type switcher.
// =====================================================================

export default function DocEditor({ blocks, onChange }) {
  const safeBlocks = blocks && blocks.length ? blocks : [newBlock('text', '')];

  const updateBlock = (blockId, patch) => {
    onChange(safeBlocks.map(b => b.id === blockId ? { ...b, ...patch } : b));
  };

  const insertBlockAfter = (blockId, type = 'text', content = '') => {
    const nb = newBlock(type, content);
    const idx = safeBlocks.findIndex(b => b.id === blockId);
    const next = [...safeBlocks];
    next.splice(idx + 1, 0, nb);
    onChange(next);
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${nb.id}"] [contenteditable]`);
      if (el) { el.focus(); placeCaretAtEnd(el); }
    }, 20);
    return nb.id;
  };

  const removeBlock = (blockId) => {
    if (safeBlocks.length === 1) {
      onChange([newBlock('text', '')]);
      return;
    }
    const idx = safeBlocks.findIndex(b => b.id === blockId);
    const next = safeBlocks.filter(b => b.id !== blockId);
    onChange(next);
    const prevId = next[Math.max(0, idx - 1)]?.id;
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${prevId}"] [contenteditable]`);
      if (el) { el.focus(); placeCaretAtEnd(el); }
    }, 20);
  };

  const changeBlockType = (blockId, type) => {
    updateBlock(blockId, { type, emoji: type === 'callout' ? '💡' : undefined });
  };

  const indentBlock = (blockId, delta) => {
    onChange(safeBlocks.map(b =>
      b.id === blockId
        ? { ...b, indent: Math.max(0, Math.min(4, (b.indent || 0) + delta)) }
        : b
    ));
  };

  const appendNewBlock = () => {
    const last = safeBlocks[safeBlocks.length - 1];
    insertBlockAfter(last.id, 'text', '');
  };

  return (
    <div>
      {safeBlocks.map((block, idx) => (
        <Block
          key={block.id}
          block={block}
          numberedIndex={getNumberedIndex(safeBlocks, idx)}
          onChange={(patch) => updateBlock(block.id, patch)}
          onInsertAfter={(type, content) => insertBlockAfter(block.id, type, content)}
          onRemove={() => removeBlock(block.id)}
          onChangeType={(type) => changeBlockType(block.id, type)}
          onIndent={(delta) => indentBlock(block.id, delta)}
        />
      ))}
      <div
        onClick={appendNewBlock}
        style={{
          padding: '14px 0',
          color: N.textFaint,
          cursor: 'text',
          fontSize: '14px',
        }}
      >
        Click to add a block · press <kbd style={kbdStyle}>/</kbd> for commands
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Single block
// ─────────────────────────────────────────────────────────────────────

function Block({ block, onChange, onInsertAfter, onRemove, onChangeType, onIndent, numberedIndex }) {
  const ref = useRef(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIdx, setSlashIdx] = useState(0);
  const [hover, setHover] = useState(false);

  // Sync DOM only when the content changes externally (different block
  // loaded). We avoid resetting on every keystroke so the caret doesn't
  // jump to the start.
  useEffect(() => {
    if (ref.current && ref.current.innerText !== (block.content || '')) {
      ref.current.innerText = block.content || '';
    }
    // eslint-disable-next-line
  }, [block.id]);

  const filteredTypes = BLOCK_TYPES.filter(bt => {
    if (!slashQuery) return true;
    return (
      bt.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
      bt.type.toLowerCase().includes(slashQuery.toLowerCase())
    );
  });

  const applySlashType = useCallback((type) => {
    setSlashOpen(false);
    setSlashQuery('');
    setSlashIdx(0);
    onChangeType(type);
    if (ref.current) {
      ref.current.innerText = '';
      onChange({ content: '' });
      setTimeout(() => {
        if (ref.current) { ref.current.focus(); placeCaretAtEnd(ref.current); }
      }, 10);
    }
    if (type === 'divider') {
      // Divider can't be typed in — jump to a new text block below.
      onInsertAfter('text', '');
    }
  }, [onChangeType, onChange, onInsertAfter]);

  const handleKeyDown = (e) => {
    // ── Slash menu navigation ──────────────────────────────────
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIdx(i => Math.min(filteredTypes.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIdx(i => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const pick = filteredTypes[slashIdx];
        if (pick) applySlashType(pick.type);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashOpen(false);
        setSlashQuery('');
        return;
      }
    }

    // ── Regular editing ────────────────────────────────────────
    if (e.key === 'Enter' && !e.shiftKey && !slashOpen) {
      e.preventDefault();
      const text = ref.current?.innerText || '';
      // Carry list-type forward; otherwise new block is plain text.
      const carry = ['todo', 'bullet', 'numbered'].includes(block.type);
      if (carry && !text.trim()) {
        // Escape the list on empty Enter.
        onChangeType('text');
        return;
      }
      const nextType = carry ? block.type : 'text';
      onInsertAfter(nextType, '');
      return;
    }
    if (e.key === 'Backspace') {
      const text = ref.current?.innerText || '';
      if (!text) {
        e.preventDefault();
        onRemove();
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      onIndent(e.shiftKey ? -1 : 1);
    }
  };

  const handleInput = () => {
    const text = ref.current?.innerText || '';
    // Open slash menu when the block becomes just "/" or starts with "/".
    // We keep it open while the user types the query suffix.
    if (text.startsWith('/')) {
      setSlashOpen(true);
      setSlashQuery(text.slice(1));
      setSlashIdx(0);
    } else if (slashOpen) {
      setSlashOpen(false);
      setSlashQuery('');
    }
    onChange({ content: text });
  };

  // Content element styled per block type.
  const contentStyle = {
    outline: 'none',
    width: '100%',
    padding: '3px 0',
    color: N.text,
    fontSize: styleFontSize(block.type),
    fontWeight: styleFontWeight(block.type),
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    minHeight: '1.5em',
    textDecoration: block.type === 'todo' && block.checked ? 'line-through' : 'none',
    opacity: block.type === 'todo' && block.checked ? 0.55 : 1,
    fontStyle: block.type === 'quote' ? 'italic' : 'normal',
    fontFamily: block.type === 'code' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
  };

  const indentPx = (block.indent || 0) * 24;

  return (
    <div
      data-block-id={block.id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        padding: '2px 0',
        position: 'relative',
        marginLeft: `${indentPx}px`,
      }}
    >
      {/* Hover handle / type switcher */}
      <div style={{
        width: '24px',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '6px',
        opacity: hover ? 1 : 0,
        transition: 'opacity 120ms',
      }}>
        <BlockTypeMenu currentType={block.type} onChange={(t) => onChangeType(t)} />
      </div>

      {/* Prefix cell (checkbox / bullet / number / quote mark) */}
      <div style={{ paddingTop: '6px', minWidth: '22px', userSelect: 'none' }}>
        {block.type === 'todo' && (
          <input
            type="checkbox"
            checked={!!block.checked}
            onChange={e => onChange({ checked: e.target.checked })}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: N.accent }}
          />
        )}
        {block.type === 'bullet' && (
          <span style={{ fontSize: '14px', color: N.textMuted }}>•</span>
        )}
        {block.type === 'numbered' && (
          <span style={{ fontSize: '14px', color: N.textMuted }}>{numberedIndex}.</span>
        )}
        {block.type === 'quote' && (
          <span style={{ fontSize: '20px', color: N.accent, lineHeight: 1 }}>❝</span>
        )}
        {block.type === 'callout' && (
          <button
            type="button"
            onClick={() => {
              const next = window.prompt('Emoji for callout:', block.emoji || '💡');
              if (next) onChange({ emoji: next });
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }}
          >
            {block.emoji || '💡'}
          </button>
        )}
      </div>

      {/* Block body */}
      {block.type === 'divider' ? (
        <hr style={{ flex: 1, marginTop: '14px', border: 0, borderTop: `1px solid ${N.border}` }} />
      ) : block.type === 'callout' ? (
        <div style={{
          flex: 1,
          background: N.accentSoft,
          borderRadius: '8px',
          padding: '10px 14px',
          border: `1px solid ${N.border}`,
        }}>
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder="Note / reminder…"
            style={contentStyle}
          />
        </div>
      ) : block.type === 'code' ? (
        <div style={{
          flex: 1,
          background: '#0f172a',
          borderRadius: '8px',
          padding: '12px 14px',
        }}>
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder="Code…"
            style={{ ...contentStyle, color: '#e2e8f0' }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={placeholderFor(block)}
            style={contentStyle}
          />
          {slashOpen && (
            <SlashMenu
              items={filteredTypes}
              activeIndex={slashIdx}
              onHover={(i) => setSlashIdx(i)}
              onSelect={(t) => applySlashType(t)}
              onClose={() => { setSlashOpen(false); setSlashQuery(''); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Slash menu
// ─────────────────────────────────────────────────────────────────────

function SlashMenu({ items, activeIndex, onHover, onSelect, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
      <div style={{
        position: 'absolute',
        top: '28px',
        left: 0,
        zIndex: 21,
        background: 'white',
        border: `1px solid ${N.border}`,
        borderRadius: '10px',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
        padding: '6px',
        width: '260px',
        maxHeight: '320px',
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '6px 10px 8px',
          fontSize: '10px',
          fontWeight: 700,
          color: N.textFaint,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Basic blocks
        </div>
        {items.length === 0 ? (
          <div style={{ padding: '8px 12px', color: N.textFaint, fontSize: '12px' }}>No matches</div>
        ) : items.map((bt, i) => (
          <button
            key={bt.type}
            onMouseEnter={() => onHover(i)}
            onClick={() => onSelect(bt.type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              background: i === activeIndex ? N.hover : 'transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              color: N.text,
              fontSize: '13px',
            }}
          >
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              background: N.bgAlt,
              border: `1px solid ${N.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '12px',
              fontWeight: 700,
              color: N.textDim,
              flexShrink: 0,
            }}>
              {bt.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{bt.label}</div>
              <div style={{ fontSize: '11px', color: N.textFaint }}>{bt.hint}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Block-type dropdown (on hover ⋮⋮)
// ─────────────────────────────────────────────────────────────────────

function BlockTypeMenu({ currentType, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Change block type"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: N.textFaint,
          fontSize: '14px',
          padding: '2px 4px',
          borderRadius: '4px',
        }}
      >⋮⋮</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{
            position: 'absolute',
            top: '24px',
            left: 0,
            zIndex: 11,
            background: 'white',
            border: `1px solid ${N.border}`,
            borderRadius: '8px',
            boxShadow: '0 14px 34px rgba(15,23,42,0.15)',
            padding: '4px',
            width: '220px',
          }}>
            {BLOCK_TYPES.map(bt => (
              <button
                key={bt.type}
                onClick={() => { onChange(bt.type); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '6px 10px',
                  border: 'none',
                  background: bt.type === currentType ? N.hover : 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: N.text,
                  fontSize: '12px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = N.hover; }}
                onMouseLeave={e => { e.currentTarget.style.background = bt.type === currentType ? N.hover : 'transparent'; }}
              >
                <span style={{
                  width: '22px',
                  textAlign: 'center',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: N.textMuted,
                }}>{bt.icon}</span>
                <span>{bt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function styleFontSize(type) {
  return ({
    heading1: '30px',
    heading2: '24px',
    heading3: '18px',
  })[type] || '15px';
}

function styleFontWeight(type) {
  if (type === 'heading1') return 800;
  if (type === 'heading2') return 700;
  if (type === 'heading3') return 700;
  return 400;
}

function placeholderFor(block) {
  return ({
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    text:     "Type '/' for commands",
    todo:     'To-do',
    bullet:   'List',
    numbered: 'List',
    quote:    'Empty quote',
    code:     'Code…',
  })[block.type] || 'Type something…';
}

function getNumberedIndex(blocks, idx) {
  if (!blocks) return 1;
  const current = blocks[idx];
  if (current.type !== 'numbered') return null;
  let count = 1;
  for (let i = idx - 1; i >= 0; i--) {
    if (
      blocks[i].type === 'numbered' &&
      (blocks[i].indent || 0) === (current.indent || 0)
    ) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

const kbdStyle = {
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: '4px',
  background: N.bgAlt,
  border: `1px solid ${N.border}`,
  fontSize: '11px',
  fontFamily: 'ui-monospace, monospace',
  color: N.textMuted,
  margin: '0 2px',
};
