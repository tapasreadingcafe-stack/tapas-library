import React from 'react';

export default function ViewOnlyBanner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      marginBottom: '16px',
      background: '#fef3c7',
      border: '1px solid #fde68a',
      borderRadius: '10px',
      color: '#92400e',
      fontSize: '13px',
      fontWeight: '600',
    }}>
      <span style={{ fontSize: '18px' }}>🔒</span>
      <span>You have read-only access to this page. Editing is disabled.</span>
    </div>
  );
}
