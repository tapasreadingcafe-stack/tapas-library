import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

// =====================================================================
// HeroCarousel — 3-slide rotating card for events / announcements
// ---------------------------------------------------------------------
// Reads slide data from SiteContent home.hero_slide_{1,2,3}_{...}.
// Slides with an empty title are skipped, so hiding one is as easy as
// clearing its title in the dashboard.
//
// Features:
//   - Autoplay with configurable interval (0 disables)
//   - Prev / next arrows
//   - Clickable pagination dots
//   - Pauses autoplay on hover
//   - Respects prefers-reduced-motion
//   - Background image per slide with readable overlay
// =====================================================================

function buildSlides(home) {
  const slides = [];
  for (let i = 1; i <= 3; i++) {
    const title = home[`hero_slide_${i}_title`];
    if (!title || !title.trim()) continue;
    slides.push({
      index: i,
      eyebrow: home[`hero_slide_${i}_eyebrow`],
      title,
      body: home[`hero_slide_${i}_body`],
      ctaLabel: home[`hero_slide_${i}_cta_label`],
      ctaLink: home[`hero_slide_${i}_cta_link`] || '#',
      image: home[`hero_slide_${i}_image`],
    });
  }
  return slides;
}

function isExternal(link) {
  return /^https?:\/\//i.test(link || '');
}

export default function HeroCarousel({ home }) {
  const slides = useMemo(() => buildSlides(home), [home]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const intervalSeconds = Number(home.hero_carousel_autoplay_seconds || 0);
  const autoplay = intervalSeconds > 0 && slides.length > 1;

  const next = useCallback(() => {
    setActive((a) => (a + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setActive((a) => (a - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay — skipped if user prefers reduced motion.
  useEffect(() => {
    if (!autoplay || paused) return;
    const prefersReduced = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const id = setInterval(next, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [autoplay, paused, intervalSeconds, next]);

  // Keep active index valid when slides change.
  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [slides.length, active]);

  if (slides.length === 0) return null;
  const current = slides[active];

  return (
    <div
      className="tps-hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: 'relative',
        maxWidth: '1200px',
        margin: '48px auto 0',
        padding: '0 20px',
      }}
    >
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        minHeight: '220px',
        background: current.image
          ? `linear-gradient(135deg, rgba(15,23,42,0.82) 0%, rgba(44,24,16,0.68) 100%), url("${current.image}") center/cover`
          : 'linear-gradient(135deg, rgba(212,168,83,0.25) 0%, rgba(44,24,16,0.6) 100%)',
        backdropFilter: 'blur(2px)',
        border: '1px solid rgba(245,222,179,0.18)',
        transition: 'background 400ms ease',
      }}>
        {/* Slide content */}
        <div key={active} className="tps-animate-in" style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: '28px',
          padding: '32px 40px',
        }}>
          <div>
            {current.eyebrow && (
              <div className="tps-badge tps-badge-accent" style={{ marginBottom: '14px' }}>
                {current.eyebrow}
              </div>
            )}
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(22px, 3vw, 32px)',
              fontWeight: '800',
              color: '#F5DEB3',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              marginBottom: '10px',
            }}>
              {current.title}
            </h3>
            {current.body && (
              <p style={{
                color: 'rgba(245,222,179,0.82)',
                fontSize: '15px',
                lineHeight: 1.6,
                maxWidth: '520px',
                marginBottom: current.ctaLabel ? '18px' : 0,
              }}>
                {current.body}
              </p>
            )}
            {current.ctaLabel && (
              isExternal(current.ctaLink) ? (
                <a href={current.ctaLink} target="_blank" rel="noreferrer" className="tps-btn tps-btn-primary">
                  {current.ctaLabel}
                </a>
              ) : (
                <Link to={current.ctaLink} className="tps-btn tps-btn-primary">
                  {current.ctaLabel}
                </Link>
              )
            )}
          </div>

          {/* Slide counter — discreet */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            color: 'rgba(245,222,179,0.6)',
            fontFamily: 'var(--font-heading)',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>
              <span style={{ color: '#D4A853', fontSize: '28px' }}>{String(active + 1).padStart(2, '0')}</span>
              <span style={{ margin: '0 4px' }}>/</span>
              {String(slides.length).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Prev / next controls */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(15,23,42,0.55)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(245,222,179,0.25)',
                color: '#F5DEB3',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms var(--ease)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,168,83,0.95)'; e.currentTarget.style.color = '#2C1810'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.55)'; e.currentTarget.style.color = '#F5DEB3'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
            >‹</button>
            <button
              onClick={next}
              aria-label="Next slide"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(15,23,42,0.55)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(245,222,179,0.25)',
                color: '#F5DEB3',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms var(--ease)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,168,83,0.95)'; e.currentTarget.style.color = '#2C1810'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.55)'; e.currentTarget.style.color = '#F5DEB3'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
            >›</button>
          </>
        )}
      </div>

      {/* Pagination dots */}
      {slides.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '18px',
        }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === active ? '28px' : '10px',
                height: '10px',
                borderRadius: '99px',
                border: 'none',
                background: i === active ? '#D4A853' : 'rgba(245,222,179,0.35)',
                cursor: 'pointer',
                transition: 'all 300ms var(--ease)',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .tps-hero-carousel > div > div { grid-template-columns: 1fr !important; padding: 24px !important; }
        }
      `}</style>
    </div>
  );
}
