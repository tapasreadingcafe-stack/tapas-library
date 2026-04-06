import React from 'react';

export default function Placeholder() {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '50vh', background: 'white', borderRadius: '12px', padding: '40px 20px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>🚧</div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>Coming Soon</h2>
        <p style={{ color: '#999', fontSize: '14px', maxWidth: '400px' }}>
          This feature is currently under development. Check back soon!
        </p>
      </div>
    </div>
  );
}
