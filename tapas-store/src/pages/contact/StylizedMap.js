import React from 'react';

// Hand-drawn street grid, not a real map. SVG road paths lifted from
// the reference HTML to preserve the exact angles of the square.
export default function StylizedMap() {
  return (
    <div className="contact-map" role="img" aria-label="Illustrated map of Haven Street and the square in Reading, Massachusetts">
      <div className="contact-map-label">Haven St Â· Reading, MA</div>
      <svg
        className="contact-map-roads"
        viewBox="0 0 800 380"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,120 L800,140" stroke="rgba(0,0,0,0.15)" strokeWidth="14" fill="none" />
        <path d="M0,260 L800,240" stroke="rgba(0,0,0,0.15)" strokeWidth="10" fill="none" />
        <path d="M380,0 L400,380" stroke="rgba(0,0,0,0.18)" strokeWidth="16" fill="none" />
        <path d="M160,0 L140,380" stroke="rgba(0,0,0,0.10)" strokeWidth="8"  fill="none" />
        <path d="M620,0 L640,380" stroke="rgba(0,0,0,0.10)" strokeWidth="8"  fill="none" />
        <circle cx="400" cy="180" r="46" fill="rgba(255,147,74,0.3)" />
        <text
          x="400" y="184"
          textAnchor="middle"
          fontFamily='"JetBrains Mono", ui-monospace, monospace'
          fontSize="9"
          fill="rgba(0,0,0,0.5)"
          letterSpacing="1.2"
        >
          THE SQUARE
        </text>
      </svg>

      <div className="contact-map-pin">
        <div className="contact-map-pin-label">
          Tapas Reading Cafe
          <i>14 Haven Street</i>
        </div>
        <div className="contact-map-pin-stalk" />
        <div className="contact-map-pin-dot" />
      </div>
    </div>
  );
}
