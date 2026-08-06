import React from 'react';

// Google Maps embed — this exact `pb` string is Google's own embed code
// (Maps → Share → Embed a map). Only Google-generated pb URLs render;
// hand-built ones 404. The "Get directions" button opens the place in Maps.
const MAP_SRC = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14627.978262134955!2d77.64503911945575!3d12.911922485450647!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae15530e201747%3A0x7e8d6135573b6b36!2sTapas%20Reading%20Cafe!5e0!3m2!1sen!2sin!4v1782992560354!5m2!1sen!2sin';
const DIRECTIONS_URL = 'https://maps.app.goo.gl/i24rAtukZxwuL1Uk9';

export default function StylizedMap() {
  return (
    <section style={{ background: '#F6F8F7', padding: 0 }}>
      <div>
        <div
          style={{
            position: 'relative',
            height: 380,
            borderRadius: 0,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <iframe
            title="Tapas Reading Cafe — location on Google Maps"
            src={MAP_SRC}
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 0,
              display: 'block',
            }}
          />
          <a
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: 'absolute',
              right: 16,
              bottom: 16,
              zIndex: 2,
              background: '#E0004F',
              color: '#fff',
              textDecoration: 'none',
              padding: '11px 20px',
              borderRadius: 999,
              fontFamily: "'Poppins', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              boxShadow: '0 6px 16px -6px rgba(0,0,0,0.45)',
            }}
          >
            Get directions →
          </a>
        </div>
      </div>
    </section>
  );
}
