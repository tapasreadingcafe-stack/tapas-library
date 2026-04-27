import React from 'react';

const QUERY = '14 Haven Street, Reading, MA 01867';
const MAP_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(QUERY)}&t=m&z=15&output=embed`;

export default function StylizedMap() {
  return (
    <div
      className="contact-map"
      style={{
        background: '#fff',
        // Disable the grid pseudo-element from contactStyles.js so the
        // map shows through cleanly.
        backgroundImage: 'none',
      }}
    >
      <style>{`.contact-map::before{display:none!important}`}</style>
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
  );
}
