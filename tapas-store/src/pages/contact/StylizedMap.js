import React from 'react';

const QUERY = '14 Haven Street, Reading, MA 01867';
const MAP_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(QUERY)}&t=m&z=15&output=embed`;

export default function StylizedMap() {
  return (
    <section style={{ background: '#F6F8F7', padding: '0 0 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 64px' }}>
        <div
          style={{
            position: 'relative',
            height: 380,
            borderRadius: 6,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <iframe
            title="Tapas Reading Cafe — location on Google Maps"
            src={MAP_SRC}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 0,
              display: 'block',
            }}
          />
        </div>
      </div>
    </section>
  );
}
