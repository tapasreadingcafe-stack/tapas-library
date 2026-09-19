/* A book's cover on a catalog tile — loaded only once the tile is on screen.
 *
 * The POS grid can hold hundreds of books. Each cover is a base64 blob of
 * roughly 100 KB, so fetching them with the catalog would be tens of megabytes
 * for a screen that shows twelve of them. This asks for one cover when its own
 * tile scrolls into view (a little before, so it's usually there by the time
 * you look at it), and never asks twice.
 */
import React, { useEffect, useRef, useState } from 'react';
import { cachedCover, requestCover } from '../utils/bookCovers';

export default function BookCover({ bookId, height = 110, placeholder = '📖' }) {
  // undefined = not asked yet · null = this book has no cover · string = a cover
  const [src, setSrc] = useState(() => cachedCover(bookId));
  const holder = useRef(null);

  useEffect(() => {
    const known = cachedCover(bookId);
    if (known !== undefined) { setSrc(known); return undefined; }
    setSrc(undefined);

    let alive = true;
    const load = () => requestCover(bookId).then((value) => { if (alive) setSrc(value); });

    const node = holder.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      load();                       // older browser: just fetch it
      return () => { alive = false; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: '250px' });    // start a little before it's actually visible
    observer.observe(node);
    return () => { alive = false; observer.disconnect(); };
  }, [bookId]);

  return (
    <div ref={holder} style={{ width: '100%', height: `${height}px`, background: '#f4f4f4', overflow: 'hidden', position: 'relative' }}>
      {src ? (
        <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', color: '#ddd' }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}
