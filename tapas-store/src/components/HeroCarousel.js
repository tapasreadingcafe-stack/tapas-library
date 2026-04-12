import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

// =====================================================================
// HeroCarousel — full-width rotating hero for the Home page
// ---------------------------------------------------------------------
// This IS the hero section. It renders a full-viewport-width rotating
// carousel with 3 slides. Each slide has eyebrow / title / body / CTA.
// Default content is "coming soon" placeholders — editable from the
// dashboard under Home → Hero carousel.
//
// Features
//   - Autoplay with configurable interval (0 disables)
//   - Prev / next arrows
//   - Clickable pagination dots
//   - Pauses on hover
//   - Respects prefers-reduced-motion
//   - Per-slide background image with readable overlay
//   - Height ~520px on desktop, 440px on mobile
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

export default function HeroCarousel({ home, sectionStyles = {} }) {
  const slides = useMemo(() => buildSlides(home), [home]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const intervalSeconds = Number(home.hero_carousel_autoplay_seconds || 0);
  const autoplay = intervalSeconds > 0 && slides.length > 1;

  const goTo = useCallback((i) => {
    setActive(i);
  }, []);

  const next = useCallback(() => {
    setActive((a) => (a + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setActive((a) => (a - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!autoplay || paused) return;
    const prefersReduced = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const id = setInterval(next, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [autoplay, paused, intervalSeconds, next]);

  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [slides.length, active]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  if (slides.length === 0) return null;
  const current = slides[active];

  const heroBg = sectionStyles.home_hero_bg_color ||
    (sectionStyles.home_hero_bg_image
      ? `url("${sectionStyles.home_hero_bg_image}") center/cover`
      : 'linear-gradient(135deg, #26170c 0%, #3d2b1f 40%, #5c3d2e 100%)');

  return (
    <section
      id="section-home-hero"
      data-editable-section="home"
      className="tps-hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'clamp(440px, 65vh, 620px)',
        background: heroBg,
        overflow: 'hidden',
        paddingTop: `${sectionStyles.home_hero_padding_top ?? 88}px`,
        paddingBottom: `${sectionStyles.home_hero_padding_bottom ?? 112}px`,
      }}
    >
      {/* Atmospheric radial glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage:
          'radial-gradient(circle at 18% 50%, rgba(212,168,83,0.14) 0%, transparent 55%), ' +
          'radial-gradient(circle at 82% 18%, rgba(245,222,179,0.08) 0%, transparent 50%)',
      }} />
      <div style={{
        position: 'absolute', right: '-160px', top: '-160px',
        width: '520px', height: '520px', borderRadius: '50%',
        background: 'rgba(212,168,83,0.05)',
        border: '1px solid rgba(212,168,83,0.12)',
        filter: 'blur(2px)',
      }} />

      {/* Slide content — keyed to re-trigger fade-in animation */}
      <div
        key={active}
        className="tps-hero-slide"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '980px',
          margin: '0 auto',
          padding: '0 40px',
          textAlign: 'center',
          color: '#F5DEB3',
          animation: `tps-slide-in 500ms var(--ease-out) both`,
        }}
      >
        {/* Slide background image (per-slide, optional) */}
        {current.image && (
          <div style={{
            position: 'absolute',
            inset: '-120px -9999px',
            backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.75) 0%, rgba(44,24,16,0.65) 100%), url("${current.image}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: -1,
            animation: 'tps-fade-in 600ms var(--ease-out) both',
          }} />
        )}

        {current.eyebrow && (
          <div className="tps-badge tps-badge-accent" style={{
            marginBottom: '28px',
            padding: '8px 20px',
            fontSize: '12px',
          }}>
            {current.eyebrow}
          </div>
        )}

        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(36px, 6vw, 76px)',
          fontWeight: '800',
          lineHeight: 1.04,
          color: '#F5DEB3',
          letterSpacing: '-0.02em',
          marginBottom: '24px',
          maxWidth: '820px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          {current.title}
        </h1>

        {current.body && (
          <p style={{
            fontSize: '18px',
            lineHeight: 1.7,
            color: 'rgba(245,222,179,0.82)',
            marginBottom: current.ctaLabel ? '36px' : 0,
            maxWidth: '620px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            {current.body}
          </p>
        )}

        {current.ctaLabel && (
          isExternal(current.ctaLink) ? (
            <a
              href={current.ctaLink}
              target="_blank"
              rel="noreferrer"
              className="tps-btn tps-btn-primary tps-btn-lg"
            >
              {current.ctaLabel}
            </a>
          ) : (
            <Link to={current.ctaLink} className="tps-btn tps-btn-primary tps-btn-lg">
              {current.ctaLabel}
            </Link>
          )
        )}
      </div>

      {/* Prev / next arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            style={{
              position: 'absolute',
              left: '28px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(15,23,42,0.45)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(245,222,179,0.25)',
              color: '#F5DEB3',
              cursor: 'pointer',
              fontSize: '26px',
              fontWeight: '300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms var(--ease)',
              zIndex: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212,168,83,0.95)';
              e.currentTarget.style.color = '#2C1810';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15,23,42,0.45)';
              e.currentTarget.style.color = '#F5DEB3';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >‹</button>
          <button
            onClick={next}
            aria-label="Next slide"
            style={{
              position: 'absolute',
              right: '28px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(15,23,42,0.45)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(245,222,179,0.25)',
              color: '#F5DEB3',
              cursor: 'pointer',
              fontSize: '26px',
              fontWeight: '300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms var(--ease)',
              zIndex: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212,168,83,0.95)';
              e.currentTarget.style.color = '#2C1810';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15,23,42,0.45)';
              e.currentTarget.style.color = '#F5DEB3';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >›</button>
        </>
      )}

      {/* Pagination dots */}
      {slides.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          padding: '10px 16px',
          borderRadius: '99px',
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(245,222,179,0.18)',
          zIndex: 2,
        }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === active ? '32px' : '10px',
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
          <span style={{
            marginLeft: '8px',
            fontSize: '11px',
            fontWeight: '700',
            color: 'rgba(245,222,179,0.75)',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            letterSpacing: '0.5px',
          }}>
            {String(active + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </span>
        </div>
      )}

      <style>{`
        @keyframes tps-slide-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 700px) {
          .tps-hero-carousel { min-height: clamp(400px, 60vh, 520px) !important; }
          .tps-hero-carousel .tps-hero-slide { padding: 0 24px !important; }
          .tps-hero-carousel button[aria-label^="Previous"],
          .tps-hero-carousel button[aria-label^="Next"] {
            width: 40px !important;
            height: 40px !important;
            font-size: 22px !important;
          }
          .tps-hero-carousel button[aria-label^="Previous"] { left: 12px !important; }
          .tps-hero-carousel button[aria-label^="Next"]     { right: 12px !important; }
        }
      `}</style>
    </section>
  );
}
