import React from 'react';

export default function RemoveToast({ pending, onUndo }) {
  if (!pending) return null;
  return (
    <div className="ct-toast-root">
      <div className="ct-toast" role="status" aria-live="polite">
        <span>Removed \u201C{pending.title}\u201D</span>
        <button type="button" onClick={onUndo}>Undo</button>
      </div>
    </div>
  );
}
