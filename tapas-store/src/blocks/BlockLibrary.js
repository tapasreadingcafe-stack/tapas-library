// =====================================================================
// BlockLibrary
//
// All built-in block renderers for the Webflow-style page builder.
// Each export is a React component that takes `props` and a `blockId`
// and renders a self-contained section. Components wrap themselves in
// `data-editable="pages.{pageKey}.blocks.{blockId}"` so the canvas
// selector in the editor can hover/select them.
//
// Three categories:
//   - Static blocks: all content lives in `props` and is editable from
//     the inspector. Hero, CTA, FeatureGrid, Footer, TextImage,
//     Testimonials, Pricing, FAQ, Gallery, Newsletter.
//   - Dynamic blocks: the block's props define the query shape
//     (limit / filter / layout), the content comes from Supabase at
//     render time. BookList, BlogList, EventList.
//
// Styles are kept inline + driven by CSS variables defined in the
// SiteContent context (--tapas-primary, --tapas-accent, etc.) so
// colour/typography edits in the Brand panel live-update every block.
// =====================================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';

// Shared wrapper every block uses. Provides the data-editable attribute
// the canvas selector keys off, plus sensible max-width + padding so
// blocks look presentable out of the box. Also provides floating toolbar
// on hover with delete, duplicate, and move actions (Phase 3).
function BlockFrame({ id, pageKey, children, full, style, blockIndex, totalBlocks }) {
  const selector = `pages.${pageKey || 'unknown'}.blocks.${id}`;
  const [isHovered, setIsHovered] = useState(false);
  const [toolbarPos, setToolbarPos] = useState(null);
  const sectionRef = React.useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect();
      setToolbarPos({ top: rect.top, right: window.innerWidth - rect.right });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const sendMessage = (action, extra = {}) => {
    const msg = {
      type: `tapas:${action}`,
      fieldPath: selector,
      blockId: id,
      pageKey,
      ...extra,
    };
    try {
      window.parent?.postMessage(msg, '*');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[BlockFrame] postMessage failed', err);
    }
  };

  const handleDelete = (e) => { e?.stopPropagation?.(); sendMessage('delete-block'); };
  const handleDuplicate = (e) => { e?.stopPropagation?.(); sendMessage('duplicate-block'); };
  const handleMoveUp = (e) => { e?.stopPropagation?.(); sendMessage('move-block', { direction: 'up' }); };
  const handleMoveDown = (e) => { e?.stopPropagation?.(); sendMessage('move-block', { direction: 'down' }); };
  const handleSaveTemplate = (e) => { e?.stopPropagation?.(); sendMessage('save-template'); };
  const handleCopy = (e) => { e?.stopPropagation?.(); sendMessage('copy-block'); };

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('blockId', id);
    e.dataTransfer.setData('pageKey', pageKey);
  };

  return (
    <section
      ref={sectionRef}
      data-editable={selector}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        padding: full ? 0 : 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        boxSizing: 'border-box',
        position: 'relative',
        cursor: 'grab',
        ...(style || {}),
      }}
    >
      {full ? children : (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>{children}</div>
      )}

      {/* Floating toolbar (visible on hover) */}
      {isHovered && (
        <div
          style={{
            position: 'fixed',
            top: toolbarPos?.top ?? 0,
            right: (toolbarPos?.right ?? 0) + 12,
            display: 'flex',
            gap: '6px',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '8px',
            zIndex: 10000,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {blockIndex > 0 && (
            <button
              onClick={handleMoveUp}
              title="Move up (or drag to reorder)"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                background: '#374151',
                border: 'none',
                borderRadius: '5px',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4b5563';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#374151';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              ⬆
            </button>
          )}

          {blockIndex < totalBlocks - 1 && (
            <button
              onClick={handleMoveDown}
              title="Move down (or drag to reorder)"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                background: '#374151',
                border: 'none',
                borderRadius: '5px',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4b5563';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#374151';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              ⬇
            </button>
          )}

          <button
            onClick={handleDuplicate}
            title="Duplicate"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: '#374151',
              border: 'none',
              borderRadius: '5px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4b5563';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#374151';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            📋
          </button>

          <button
            onClick={handleCopy}
            title="Copy block (paste on any page)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: '#374151',
              border: 'none',
              borderRadius: '5px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4b5563';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#374151';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            ✂
          </button>

          <button
            onClick={handleSaveTemplate}
            title="Save as template"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: '#374151',
              border: 'none',
              borderRadius: '5px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4b5563';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#374151';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            ⭐
          </button>

          <button
            onClick={handleDelete}
            title="Delete"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: '#374151',
              border: 'none',
              borderRadius: '5px',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7f1d1d';
              e.currentTarget.style.color = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#374151';
              e.currentTarget.style.color = '#f87171';
            }}
          >
            🗑
          </button>
        </div>
      )}
    </section>
  );
}

function Button({ href, children, variant = 'primary' }) {
  const styles = variant === 'primary' ? {
    background: 'var(--tapas-accent, #006a6a)',
    color: '#fff',
    border: 'none',
  } : {
    background: 'transparent',
    color: 'var(--tapas-primary, #26170c)',
    border: '2px solid var(--tapas-primary, #26170c)',
  };
  return (
    <Link
      to={href || '#'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: 'var(--tapas-btn-padding, 14px 32px)',
        borderRadius: 'var(--tapas-btn-radius, 50px)',
        fontSize: 'var(--tapas-btn-font-size, 15px)',
        fontWeight: 'var(--tapas-btn-font-weight, 700)',
        textTransform: 'var(--tapas-btn-text-transform, none)',
        letterSpacing: 'var(--tapas-btn-letter-spacing, 0.5px)',
        textDecoration: 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
        ...styles,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------
// Static blocks
// ---------------------------------------------------------------------

export function Hero({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: p.background_image
        ? `linear-gradient(rgba(0,0,0,${p.overlay_opacity ?? 0.4}), rgba(0,0,0,${p.overlay_opacity ?? 0.4})), url("${p.background_image}") center/cover`
        : 'linear-gradient(135deg, var(--tapas-primary, #26170c), var(--tapas-primary-dark, #1a0f08))',
      color: p.background_image ? '#fff' : '#f5f5dc',
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{ textAlign: p.align || 'center', maxWidth: '800px', margin: '0 auto' }}>
        {p.eyebrow && (
          <div style={{
            fontSize: 'var(--tapas-eyebrow-size, 11px)',
            letterSpacing: 'var(--tapas-eyebrow-tracking, 2.5px)',
            textTransform: 'uppercase', fontWeight: '700',
            marginBottom: '18px', opacity: 0.8,
          }}>{p.eyebrow}</div>
        )}
        <h1 style={{
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-xxl-size, 72px)',
          fontWeight: 'var(--tapas-h-weight, 800)',
          lineHeight: 1.05, margin: '0 0 20px',
        }}>
          {p.headline || 'Your headline here'}
          {p.subheadline && (
            <span style={{ display: 'block', fontStyle: 'italic', fontWeight: 500, opacity: 0.9 }}>
              {p.subheadline}
            </span>
          )}
        </h1>
        {p.description && (
          <p style={{
            fontSize: '18px', lineHeight: 1.65, margin: '0 0 32px',
            maxWidth: '620px', marginLeft: p.align === 'center' ? 'auto' : 0, marginRight: p.align === 'center' ? 'auto' : 0,
            opacity: 0.88,
          }}>{p.description}</p>
        )}
        {p.cta_text && (
          <Button href={p.cta_href}>{p.cta_text}</Button>
        )}
      </div>
    </BlockFrame>
  );
}

export function CTA({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: p.background_color || 'var(--tapas-accent, #006a6a)',
      color: p.text_color || '#fff',
      textAlign: 'center',
    }}>
      <h2 style={{
        fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
        fontSize: 'var(--tapas-h-xl-size, 42px)',
        fontWeight: 800, margin: '0 0 14px', lineHeight: 1.15,
      }}>{p.headline || 'Ready to get started?'}</h2>
      {p.description && (
        <p style={{ fontSize: '17px', margin: '0 0 28px', opacity: 0.9, maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          {p.description}
        </p>
      )}
      <Button href={p.cta_href} variant={p.cta_variant || 'primary'}>
        {p.cta_text || 'Get started →'}
      </Button>
    </BlockFrame>
  );
}

export function FeatureGrid({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const items = Array.isArray(p.items) ? p.items : [];
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.eyebrow && (
        <div style={{
          textAlign: 'center',
          fontSize: 'var(--tapas-eyebrow-size, 11px)',
          letterSpacing: 'var(--tapas-eyebrow-tracking, 2.5px)',
          textTransform: 'uppercase', fontWeight: 700,
          color: 'var(--tapas-accent, #006a6a)', marginBottom: '14px',
        }}>{p.eyebrow}</div>
      )}
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 48px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`,
        gap: '28px',
      }}>
        {items.map((item, i) => (
          <div key={i} style={{
            padding: '32px 24px', borderRadius: '12px',
            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {item.icon && (
              <div style={{ fontSize: '36px', marginBottom: '14px' }}>{item.icon}</div>
            )}
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: 'var(--tapas-primary, #26170c)' }}>
              {item.title}
            </h3>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--tapas-body-color, #5c3a1e)', margin: 0 }}>
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </BlockFrame>
  );
}

export function Footer({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const columns = Array.isArray(p.columns) ? p.columns : [];
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: p.background_color || 'var(--tapas-primary-dark, #1a0f08)',
      color: '#f5f5dc',
      padding: '60px 20px 32px',
    }} full>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
          gap: '40px', marginBottom: '40px',
        }}>
          {columns.map((col, i) => (
            <div key={i}>
              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 16px', opacity: 0.7 }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(col.links || []).map((lnk, j) => (
                  <li key={j} style={{ marginBottom: '8px' }}>
                    <Link to={lnk.href || '#'} style={{ color: '#f5f5dc', textDecoration: 'none', fontSize: '14px', opacity: 0.85 }}>
                      {lnk.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          borderTop: '1px solid rgba(245,245,220,0.15)',
          paddingTop: '24px', fontSize: '13px', opacity: 0.7, textAlign: 'center',
        }}>
          {p.copyright || `© ${new Date().getFullYear()} Tapas Reading Cafe`}
        </div>
      </div>
    </BlockFrame>
  );
}

export function TextImage({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const imageRight = p.image_side !== 'left';
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '48px', alignItems: 'center',
        direction: imageRight ? 'ltr' : 'rtl',
      }}>
        <div style={{ direction: 'ltr' }}>
          {p.eyebrow && (
            <div style={{
              fontSize: 'var(--tapas-eyebrow-size, 11px)',
              letterSpacing: 'var(--tapas-eyebrow-tracking, 2.5px)',
              textTransform: 'uppercase', fontWeight: 700,
              color: 'var(--tapas-accent, #006a6a)', marginBottom: '12px',
            }}>{p.eyebrow}</div>
          )}
          <h2 style={{
            fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
            fontSize: 'var(--tapas-h-l-size, 32px)',
            margin: '0 0 18px', color: 'var(--tapas-h-color, #26170c)',
            lineHeight: 1.2,
          }}>{p.heading || 'Add a heading'}</h2>
          <div style={{
            fontSize: '16px', lineHeight: 1.7,
            color: 'var(--tapas-body-color, #5c3a1e)',
            whiteSpace: 'pre-wrap', marginBottom: p.cta_text ? '28px' : 0,
          }}>{p.body || ''}</div>
          {p.cta_text && <Button href={p.cta_href}>{p.cta_text}</Button>}
        </div>
        <div style={{ direction: 'ltr' }}>
          {p.image_url ? (
            <img src={p.image_url} alt={p.heading || ''} style={{
              width: '100%', borderRadius: '12px',
              aspectRatio: '4/3', objectFit: 'cover',
              boxShadow: '0 20px 60px rgba(38,23,12,0.15)',
            }} />
          ) : (
            <div style={{
              width: '100%', aspectRatio: '4/3', borderRadius: '12px',
              background: 'linear-gradient(135deg, #ede8d0, #d4c9a8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8a7a5c', fontSize: '14px',
            }}>Add an image</div>
          )}
        </div>
      </div>
    </BlockFrame>
  );
}

export function Testimonials({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const items = Array.isArray(p.items) ? p.items : [];
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: 'var(--tapas-cream, #f5f5dc)',
    }}>
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 48px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '28px',
      }}>
        {items.map((it, i) => (
          <figure key={i} style={{
            background: '#fff', padding: '32px 28px', borderRadius: '12px',
            margin: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <blockquote style={{
              fontSize: '16px', lineHeight: 1.65,
              color: 'var(--tapas-body-color, #5c3a1e)',
              margin: '0 0 20px', fontStyle: 'italic',
            }}>&ldquo;{it.quote}&rdquo;</blockquote>
            <figcaption style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tapas-primary, #26170c)' }}>
              {it.author}
              {it.role && <span style={{ fontWeight: 400, opacity: 0.7 }}>, {it.role}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </BlockFrame>
  );
}

export function Pricing({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const tiers = Array.isArray(p.tiers) ? p.tiers : [];
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 12px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      {p.subtitle && (
        <p style={{
          textAlign: 'center', fontSize: '16px',
          color: 'var(--tapas-body-color, #5c3a1e)', opacity: 0.8,
          margin: '0 0 48px',
        }}>{p.subtitle}</p>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`,
        gap: '24px', maxWidth: '1000px', margin: '0 auto',
      }}>
        {tiers.map((t, i) => (
          <div key={i} style={{
            background: t.highlight ? 'var(--tapas-primary, #26170c)' : '#fff',
            color: t.highlight ? '#f5f5dc' : 'var(--tapas-primary, #26170c)',
            padding: '36px 28px', borderRadius: '16px',
            boxShadow: t.highlight ? '0 20px 60px rgba(38,23,12,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
            transform: t.highlight ? 'scale(1.02)' : 'none',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 12px', opacity: 0.7 }}>
              {t.name}
            </h3>
            <div style={{ fontSize: '42px', fontWeight: 800, marginBottom: '20px', lineHeight: 1 }}>
              {t.price}
              {t.interval && <span style={{ fontSize: '14px', fontWeight: 400, opacity: 0.7 }}> / {t.interval}</span>}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', fontSize: '14px' }}>
              {(Array.isArray(t.features) ? t.features : String(t.features || '').split('\n').filter(Boolean)).map((f, j) => (
                <li key={j} style={{ padding: '6px 0', opacity: 0.85 }}>✓ {f}</li>
              ))}
            </ul>
            {t.cta_text && (
              <Link to={t.cta_href || '#'} style={{
                display: 'block', textAlign: 'center',
                padding: '12px 20px', borderRadius: '999px',
                background: t.highlight ? 'var(--tapas-accent, #006a6a)' : 'var(--tapas-primary, #26170c)',
                color: '#fff', textDecoration: 'none',
                fontSize: '14px', fontWeight: 700,
              }}>{t.cta_text}</Link>
            )}
          </div>
        ))}
      </div>
    </BlockFrame>
  );
}

export function FAQ({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const items = Array.isArray(p.items) ? p.items : [];
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 48px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {items.map((it, i) => {
          const open = openIdx === i;
          return (
            <div key={i} style={{ borderBottom: '1px solid rgba(38,23,12,0.1)' }}>
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '16px',
                  padding: '20px 0', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                  fontSize: '17px', fontWeight: 600,
                  color: 'var(--tapas-primary, #26170c)',
                }}
              >
                <span>{it.question}</span>
                <span style={{ fontSize: '20px', transform: open ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>+</span>
              </button>
              {open && (
                <div style={{
                  paddingBottom: '20px', fontSize: '15px', lineHeight: 1.65,
                  color: 'var(--tapas-body-color, #5c3a1e)',
                }}>{it.answer}</div>
              )}
            </div>
          );
        })}
      </div>
    </BlockFrame>
  );
}

export function Gallery({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const images = Array.isArray(p.images) ? p.images : [];
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 48px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${p.min_width || 240}px, 1fr))`,
        gap: '16px',
      }}>
        {images.map((src, i) => (
          <div key={i} style={{
            aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: '8px',
            background: '#ede8d0',
          }}>
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
    </BlockFrame>
  );
}

export function Newsletter({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      // Upsert on lower(email) — duplicate signups just get "re-activated"
      // instead of erroring.
      await supabase.from('newsletter_subscribers').insert([{
        email: email.trim(),
        source_page: pageKey,
      }]);
    } catch {
      // Unique violation / network — still show thanks, don't reveal details
    } finally {
      setSubmitted(true);
      setSubmitting(false);
    }
  };
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: 'var(--tapas-sand, #fbfbe2)',
      textAlign: 'center',
    }}>
      <h2 style={{
        fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
        fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 14px',
        color: 'var(--tapas-h-color, #26170c)',
      }}>{p.headline || 'Join the list'}</h2>
      {p.description && (
        <p style={{
          fontSize: '16px', color: 'var(--tapas-body-color, #5c3a1e)',
          maxWidth: '540px', margin: '0 auto 28px', opacity: 0.85,
        }}>{p.description}</p>
      )}
      {submitted ? (
        <div style={{
          maxWidth: '440px', margin: '0 auto',
          padding: '14px 20px', borderRadius: '12px',
          background: 'rgba(0,106,106,0.08)',
          color: 'var(--tapas-accent, #006a6a)',
          fontSize: '15px', fontWeight: 600,
        }}>
          ✓ {p.success_message || 'You\'re on the list. Thanks!'}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '440px', margin: '0 auto' }}>
          <input
            type="email" required placeholder={p.placeholder || 'you@email.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            style={{
              flex: 1, padding: '14px 18px', fontSize: '15px',
              border: '1px solid rgba(38,23,12,0.2)', borderRadius: '999px',
              outline: 'none', background: '#fff',
            }}
          />
          <button type="submit" disabled={submitting} style={{
            padding: '14px 24px', borderRadius: '999px',
            background: 'var(--tapas-accent, #006a6a)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: '15px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}>{submitting ? '…' : (p.button_text || 'Subscribe')}</button>
        </form>
      )}
    </BlockFrame>
  );
}

// ---------------------------------------------------------------------
// Phase 4: New block types — Video, Map, Countdown, ContactForm
// ---------------------------------------------------------------------

export function VideoEmbed({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  // Extract YouTube/Vimeo ID from common URL formats
  const getEmbedUrl = (url) => {
    if (!url) return '';
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return url;
  };
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {(p.title || p.subtitle) && (
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {p.title && <h2 style={{
            fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
            fontSize: 'var(--tapas-h-l-size, 36px)', margin: '0 0 12px',
            color: 'var(--tapas-h-color, #26170c)',
          }}>{p.title}</h2>}
          {p.subtitle && <p style={{
            fontSize: '16px', color: 'var(--tapas-body-color, #5c3a1e)',
            opacity: 0.8, maxWidth: '600px', margin: '0 auto',
          }}>{p.subtitle}</p>}
        </div>
      )}
      <div style={{
        position: 'relative',
        paddingBottom: '56.25%',
        height: 0,
        overflow: 'hidden',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        maxWidth: p.max_width || '960px',
        margin: '0 auto',
      }}>
        {p.video_url ? (
          <iframe
            src={getEmbedUrl(p.video_url)}
            title={p.title || 'Video'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f3f4f6', color: '#9ca3af', fontSize: '14px',
          }}>
            Paste a YouTube or Vimeo URL in the inspector
          </div>
        )}
      </div>
    </BlockFrame>
  );
}

export function MapEmbed({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const query = encodeURIComponent(p.address || 'Tapas Reading Cafe');
  const src = `https://www.google.com/maps?q=${query}&output=embed`;
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.title && (
        <h2 style={{
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 24px',
          textAlign: 'center',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      <div style={{
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        height: p.height || '400px',
        maxWidth: p.max_width || '100%',
        margin: '0 auto',
      }}>
        <iframe
          src={src}
          title={p.title || 'Map'}
          frameBorder="0"
          style={{ width: '100%', height: '100%', border: 0 }}
          allowFullScreen
          loading="lazy"
        />
      </div>
      {p.address_text && (
        <p style={{
          textAlign: 'center', marginTop: '16px',
          color: 'var(--tapas-body-color, #5c3a1e)', fontSize: '14px',
        }}>📍 {p.address_text}</p>
      )}
    </BlockFrame>
  );
}

export function Countdown({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!p.target_date) return;
    const tick = () => {
      const diff = new Date(p.target_date).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [p.target_date]);

  const Unit = ({ value, label }) => (
    <div style={{ textAlign: 'center', minWidth: '80px' }}>
      <div style={{
        fontSize: '48px', fontWeight: '800', lineHeight: 1,
        color: p.accent_color || 'var(--tapas-accent, #006a6a)',
        fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
      }}>{String(value).padStart(2, '0')}</div>
      <div style={{
        fontSize: '11px', letterSpacing: '2px',
        textTransform: 'uppercase', marginTop: '8px', opacity: 0.6,
      }}>{label}</div>
    </div>
  );

  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: p.background_color || 'var(--tapas-sand, #fbfbe2)',
      textAlign: 'center',
    }}>
      {p.eyebrow && (
        <div style={{
          fontSize: '11px', letterSpacing: '2.5px', textTransform: 'uppercase',
          fontWeight: '700', marginBottom: '18px', opacity: 0.7,
        }}>{p.eyebrow}</div>
      )}
      {p.title && (
        <h2 style={{
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 40px)', margin: '0 0 32px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      <div style={{
        display: 'flex', gap: '24px', justifyContent: 'center',
        flexWrap: 'wrap', marginBottom: p.cta_text ? '32px' : 0,
      }}>
        <Unit value={timeLeft.days} label="Days" />
        <Unit value={timeLeft.hours} label="Hours" />
        <Unit value={timeLeft.minutes} label="Minutes" />
        <Unit value={timeLeft.seconds} label="Seconds" />
      </div>
      {p.cta_text && (
        <Button href={p.cta_href}>{p.cta_text}</Button>
      )}
    </BlockFrame>
  );
}

// Default field set when a block hasn't been customized yet. Matches
// the legacy name/email/message trio so existing pages keep rendering
// identically.
const DEFAULT_FORM_FIELDS = [
  { key: 'name',    label: 'Your name',     type: 'text',     required: true, placeholder: 'Your name' },
  { key: 'email',   label: 'Email',         type: 'email',    required: true, placeholder: 'your@email.com' },
  { key: 'message', label: 'Message',       type: 'textarea', required: true, placeholder: 'Your message...' },
];

const FORM_INPUT_STYLE = {
  padding: '14px 18px', fontSize: '15px',
  border: '1px solid rgba(38,23,12,0.2)', borderRadius: '8px',
  outline: 'none', background: '#fff',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};

export function ContactForm({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const configured = Array.isArray(p.fields) && p.fields.length > 0 ? p.fields : DEFAULT_FORM_FIELDS;
  // Normalize + generate keys for any fields missing one
  const fields = configured.map((f, i) => ({
    type: f?.type || 'text',
    label: f?.label || `Field ${i + 1}`,
    required: !!f?.required,
    placeholder: f?.placeholder || '',
    options: Array.isArray(f?.options) ? f.options : [],
    key: f?.key || (f?.label || `field_${i}`).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `field_${i}`,
  }));
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach(f => { init[f.key] = f.type === 'checkbox' ? false : ''; });
    return init;
  });
  const setValue = (key, v) => setValues(prev => ({ ...prev, [key]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Populate the legacy top-level columns when the corresponding
      // keys exist, so the existing inbox renders nicely. The full
      // shape is always stored on `fields`.
      const row = {
        source_page: pageKey,
        created_at: new Date().toISOString(),
        fields: { ...values },
        name: typeof values.name === 'string' ? values.name : null,
        email: typeof values.email === 'string' ? values.email : null,
        message: typeof values.message === 'string' ? values.message : null,
      };
      const { error } = await supabase.from('contact_submissions').insert([row]);
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      // Silently fail if table doesn't exist — still show thank-you
      setSubmitted(true);
    }
  };

  const renderField = (f) => {
    const v = values[f.key];
    const common = { required: f.required, placeholder: f.placeholder || f.label, style: FORM_INPUT_STYLE };
    switch (f.type) {
      case 'textarea':
        return (
          <textarea
            {...common}
            value={v || ''}
            onChange={(e) => setValue(f.key, e.target.value)}
            rows={5}
            style={{ ...FORM_INPUT_STYLE, resize: 'vertical' }}
          />
        );
      case 'select':
        return (
          <select
            value={v || ''}
            required={f.required}
            onChange={(e) => setValue(f.key, e.target.value)}
            style={{ ...FORM_INPUT_STYLE, cursor: 'pointer' }}
          >
            <option value="">{f.placeholder || 'Select one…'}</option>
            {(f.options || []).map((opt, i) => {
              const value = typeof opt === 'string' ? opt : (opt?.value ?? opt?.label ?? '');
              const label = typeof opt === 'string' ? opt : (opt?.label ?? value);
              return <option key={i} value={value}>{label}</option>;
            })}
          </select>
        );
      case 'checkbox':
        return (
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            fontSize: '14px', color: 'var(--tapas-body-color, #5c3a1e)',
            lineHeight: 1.5, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={!!v}
              required={f.required}
              onChange={(e) => setValue(f.key, e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <span>{f.label}{f.required && <span style={{ color: '#dc2626' }}> *</span>}</span>
          </label>
        );
      case 'tel':
      case 'phone':
        return (
          <input type="tel" inputMode="tel" {...common}
            value={v || ''} onChange={(e) => setValue(f.key, e.target.value)} />
        );
      case 'email':
        return (
          <input type="email" {...common}
            value={v || ''} onChange={(e) => setValue(f.key, e.target.value)} />
        );
      default:
        return (
          <input type="text" {...common}
            value={v || ''} onChange={(e) => setValue(f.key, e.target.value)} />
        );
    }
  };

  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        {p.title && (
          <h2 style={{
            fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
            fontSize: 'var(--tapas-h-l-size, 36px)', margin: '0 0 12px',
            textAlign: 'center',
            color: 'var(--tapas-h-color, #26170c)',
          }}>{p.title}</h2>
        )}
        {p.subtitle && (
          <p style={{
            textAlign: 'center', marginBottom: '32px',
            color: 'var(--tapas-body-color, #5c3a1e)', opacity: 0.8,
          }}>{p.subtitle}</p>
        )}
        {submitted ? (
          <div style={{
            padding: '40px 24px', textAlign: 'center',
            background: '#ecfdf5', border: '1px solid #a7f3d0',
            borderRadius: '12px', color: '#065f46',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>✓</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {p.success_message || 'Thanks! We\'ll be in touch soon.'}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fields.map((f) => (
              <div key={f.key}>
                {/* Checkbox label is inline; others get a label above */}
                {f.type !== 'checkbox' && (
                  <label style={{
                    display: 'block', fontSize: '12px', fontWeight: 600,
                    color: 'var(--tapas-body-color, #5c3a1e)',
                    marginBottom: '6px',
                  }}>
                    {f.label}{f.required && <span style={{ color: '#dc2626' }}> *</span>}
                  </label>
                )}
                {renderField(f)}
              </div>
            ))}
            <button type="submit" style={{
              padding: '14px 24px', borderRadius: '8px',
              background: 'var(--tapas-accent, #006a6a)', color: '#fff',
              border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
            }}>{p.button_text || 'Send message'}</button>
          </form>
        )}
      </div>
    </BlockFrame>
  );
}

// ---------------------------------------------------------------------
// Dynamic blocks — each does its own Supabase query on mount. Loading
// skeletons keep layout stable during fetch. All queries are read-only
// and respect the store_visible / published_at / status flags so the
// storefront doesn't leak unpublished records.
// ---------------------------------------------------------------------

function useCollection(tableName, buildQuery, deps) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const q = buildQuery(supabase.from(tableName));
        const { data, error: err } = await q;
        if (!alive) return;
        if (err) throw err;
        setRows(data || []);
      } catch (e) {
        if (alive) { setError(e.message || String(e)); setRows([]); }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { rows, error };
}

function Skeleton({ count = 4, aspectRatio = '3/4' }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          aspectRatio,
          borderRadius: '8px',
          background: 'linear-gradient(90deg, #f0ecda 0%, #e8e2c8 50%, #f0ecda 100%)',
          backgroundSize: '200% 100%',
          animation: 'tapas-shimmer 1.4s infinite',
        }} />
      ))}
      <style>{`@keyframes tapas-shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }`}</style>
    </div>
  );
}

export function BookList({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const limit = Math.max(1, Math.min(48, Number(p.limit) || 8));
  const { rows, error } = useCollection(
    'books',
    (q) => {
      let query = q
        .select('id, title, author, price, sales_price, mrp, book_image, category, is_staff_pick, staff_pick_blurb, store_visible')
        .eq('store_visible', true);
      if (p.staff_picks_only) query = query.eq('is_staff_pick', true);
      if (p.category && p.category !== 'all') query = query.eq('category', p.category);
      query = query.order(p.sort || 'created_at', { ascending: p.sort === 'title' }).limit(limit);
      return query;
    },
    [limit, p.category, p.sort, p.staff_picks_only]
  );

  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.eyebrow && (
        <div style={{
          textAlign: 'center',
          fontSize: 'var(--tapas-eyebrow-size, 11px)',
          letterSpacing: 'var(--tapas-eyebrow-tracking, 2.5px)',
          textTransform: 'uppercase', fontWeight: 700,
          color: 'var(--tapas-accent, #006a6a)', marginBottom: '14px',
        }}>{p.eyebrow}</div>
      )}
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 48px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      {rows === null && <Skeleton count={limit} aspectRatio="3/4" />}
      {error && (
        <div style={{ textAlign: 'center', color: '#a55', padding: '24px', fontSize: '14px' }}>
          Could not load books: {error}
        </div>
      )}
      {rows && rows.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: '#8a7a5c', padding: '48px', fontSize: '14px' }}>
          No books to show yet.
        </div>
      )}
      {rows && rows.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
        }}>
          {rows.map((b) => {
            const price = b.sales_price || b.price;
            const hasDiscount = b.mrp && price && Number(b.mrp) > Number(price);
            return (
              <Link key={b.id} to={`/books/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden',
                  background: '#ede8d0', marginBottom: '12px',
                  boxShadow: '0 8px 24px rgba(38,23,12,0.12)',
                }}>
                  {b.book_image ? (
                    <img src={b.book_image} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a7a5c', fontSize: '28px' }}>📖</div>
                  )}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tapas-primary, #26170c)', marginBottom: '4px', lineHeight: 1.3 }}>
                  {b.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--tapas-body-color, #5c3a1e)', opacity: 0.7, marginBottom: '6px' }}>
                  {b.author}
                </div>
                {price && (
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tapas-accent, #006a6a)' }}>
                    ₹{price}
                    {hasDiscount && (
                      <span style={{ fontSize: '12px', color: '#8a7a5c', textDecoration: 'line-through', marginLeft: '8px', fontWeight: 400 }}>
                        ₹{b.mrp}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
      {p.cta_text && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Button href={p.cta_href || '/books'}>{p.cta_text}</Button>
        </div>
      )}
    </BlockFrame>
  );
}

export function BlogList({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const limit = Math.max(1, Math.min(24, Number(p.limit) || 6));
  const { rows, error } = useCollection(
    'blog_posts',
    (q) => q
      .select('id, title, slug, excerpt, cover_image, published_at, tags')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit),
    [limit]
  );

  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 48px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      {rows === null && <Skeleton count={limit} aspectRatio="16/9" />}
      {error && <div style={{ textAlign: 'center', color: '#a55', padding: '24px' }}>Could not load blog: {error}</div>}
      {rows && rows.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: '#8a7a5c', padding: '48px', fontSize: '14px' }}>
          No blog posts yet.
        </div>
      )}
      {rows && rows.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '28px',
        }}>
          {rows.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug || post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article>
                <div style={{
                  aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden',
                  background: '#ede8d0', marginBottom: '16px',
                }}>
                  {post.cover_image ? (
                    <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a7a5c', fontSize: '32px' }}>✍️</div>
                  )}
                </div>
                {post.published_at && (
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--tapas-accent, #006a6a)', fontWeight: 700, marginBottom: '10px' }}>
                    {new Date(post.published_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px', color: 'var(--tapas-primary, #26170c)', lineHeight: 1.3 }}>
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--tapas-body-color, #5c3a1e)', margin: 0, opacity: 0.85 }}>
                    {post.excerpt}
                  </p>
                )}
              </article>
            </Link>
          ))}
        </div>
      )}
      {p.cta_text && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Button href={p.cta_href || '/blog'}>{p.cta_text}</Button>
        </div>
      )}
    </BlockFrame>
  );
}

export function EventList({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const limit = Math.max(1, Math.min(24, Number(p.limit) || 6));
  const today = new Date().toISOString().slice(0, 10);
  const { rows, error } = useCollection(
    'events',
    (q) => {
      let query = q
        .select('id, title, description, event_type, start_date, start_time, end_time, location, image_url, is_paid, ticket_price, status');
      if (p.upcoming_only !== false) query = query.gte('start_date', today);
      query = query.eq('status', 'published').order('start_date', { ascending: true }).limit(limit);
      return query;
    },
    [limit, p.upcoming_only]
  );

  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 48px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      {rows === null && <Skeleton count={limit} aspectRatio="4/3" />}
      {error && <div style={{ textAlign: 'center', color: '#a55', padding: '24px' }}>Could not load events: {error}</div>}
      {rows && rows.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: '#8a7a5c', padding: '48px', fontSize: '14px' }}>
          No upcoming events.
        </div>
      )}
      {rows && rows.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {rows.map((e) => {
            const d = e.start_date ? new Date(e.start_date) : null;
            return (
              <div key={e.id} style={{
                background: '#fff', borderRadius: '12px', overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{
                  aspectRatio: '16/10', background: '#ede8d0', position: 'relative',
                }}>
                  {e.image_url ? (
                    <img src={e.image_url} alt={e.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: '#8a7a5c' }}>🎟️</div>
                  )}
                  {d && (
                    <div style={{
                      position: 'absolute', top: '14px', left: '14px',
                      background: '#fff', padding: '8px 12px', borderRadius: '8px',
                      textAlign: 'center', minWidth: '54px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--tapas-accent, #006a6a)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {d.toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--tapas-primary, #26170c)', lineHeight: 1 }}>
                        {d.getDate()}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  {e.event_type && (
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--tapas-accent, #006a6a)', fontWeight: 700, marginBottom: '8px' }}>
                      {e.event_type}
                    </div>
                  )}
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px', color: 'var(--tapas-primary, #26170c)', lineHeight: 1.3 }}>
                    {e.title}
                  </h3>
                  {e.description && (
                    <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--tapas-body-color, #5c3a1e)', margin: '0 0 14px', opacity: 0.85 }}>
                      {e.description.length > 110 ? e.description.slice(0, 110) + '…' : e.description}
                    </p>
                  )}
                  <div style={{ fontSize: '12px', color: '#8a7a5c', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {e.start_time && <span>⏰ {e.start_time.slice(0, 5)}</span>}
                    {e.location && <span>📍 {e.location}</span>}
                    {e.is_paid && e.ticket_price && <span>💰 ₹{e.ticket_price}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {p.cta_text && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Button href={p.cta_href || '/events'}>{p.cta_text}</Button>
        </div>
      )}
    </BlockFrame>
  );
}

// ---------------------------------------------------------------------
// Phase 5: Accordion + Tabs blocks
// ---------------------------------------------------------------------

// Accordion — stacked panels that expand/collapse. Similar to FAQ but
// supports an optional "open by default" first item and richer content.
export function Accordion({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const items = Array.isArray(p.items) ? p.items : [];
  const allowMultiple = p.allow_multiple !== false;
  const [openSet, setOpenSet] = useState(() => new Set(p.open_first ? [0] : []));

  const toggle = (i) => {
    setOpenSet(prev => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        if (!allowMultiple) next.clear();
        next.add(i);
      }
      return next;
    });
  };

  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {(p.eyebrow || p.title) && (
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {p.eyebrow && (
            <div style={{
              fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase', color: 'var(--tapas-accent, #006a6a)',
              marginBottom: '8px',
            }}>{p.eyebrow}</div>
          )}
          {p.title && (
            <h2 style={{
              fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
              fontSize: 'var(--tapas-h-l-size, 32px)', margin: 0,
              color: 'var(--tapas-h-color, #26170c)',
            }}>{p.title}</h2>
          )}
        </div>
      )}
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {items.map((it, i) => {
          const open = openSet.has(i);
          return (
            <div key={i} style={{
              marginBottom: '10px',
              background: 'var(--tapas-card-bg, #faf7ed)',
              border: '1px solid rgba(38,23,12,0.08)',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s',
              boxShadow: open ? '0 4px 18px rgba(38,23,12,0.08)' : 'none',
            }}>
              <button
                onClick={() => toggle(i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '16px',
                  padding: '18px 22px',
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                  fontSize: '16px', fontWeight: 600,
                  color: 'var(--tapas-primary, #26170c)',
                }}
              >
                <span>{it.title}</span>
                <span style={{
                  flexShrink: 0, fontSize: '18px',
                  transform: open ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s',
                  color: 'var(--tapas-accent, #006a6a)',
                }}>⌄</span>
              </button>
              {open && (
                <div style={{
                  padding: '0 22px 20px',
                  fontSize: '15px', lineHeight: 1.7,
                  color: 'var(--tapas-body-color, #5c3a1e)',
                  whiteSpace: 'pre-wrap',
                }}>{it.content}</div>
              )}
            </div>
          );
        })}
      </div>
    </BlockFrame>
  );
}

// Tabs — horizontal tab bar with panels underneath. Good for product
// details, sections like "Shipping / Returns / Sizing".
export function Tabs({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const items = Array.isArray(p.items) ? p.items : [];
  const [activeIdx, setActiveIdx] = useState(0);
  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, items.length - 1));
  const active = items[safeIdx];

  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {p.title && (
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'var(--tapas-h-l-size, 32px)', margin: '0 0 36px',
          color: 'var(--tapas-h-color, #26170c)',
        }}>{p.title}</h2>
      )}
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Tab bar */}
        <div role="tablist" style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px',
          borderBottom: '2px solid rgba(38,23,12,0.08)',
          marginBottom: '32px',
        }}>
          {items.map((it, i) => {
            const isActive = i === safeIdx;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveIdx(i)}
                style={{
                  padding: '12px 20px',
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', position: 'relative',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--tapas-accent, #006a6a)' : 'var(--tapas-body-color, #5c3a1e)',
                  borderBottom: isActive ? '2px solid var(--tapas-accent, #006a6a)' : '2px solid transparent',
                  marginBottom: '-2px',
                  transition: 'color 0.15s',
                }}
              >
                {it.label}
              </button>
            );
          })}
        </div>
        {/* Active panel */}
        {active && (
          <div style={{
            fontSize: '15px', lineHeight: 1.75,
            color: 'var(--tapas-body-color, #5c3a1e)',
            whiteSpace: 'pre-wrap',
            minHeight: '120px',
          }}>
            {active.content}
          </div>
        )}
      </div>
    </BlockFrame>
  );
}

// Stats — big-number metrics row. Trust-building content like
// "500+ books · 200 active members · 4.8★ average rating".
export function Stats({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const items = Array.isArray(p.items) ? p.items : [];
  const columns = items.length || 1;
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: p.background_color || 'transparent',
    }}>
      {(p.eyebrow || p.title) && (
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {p.eyebrow && (
            <div style={{
              fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase', color: 'var(--tapas-accent, #006a6a)',
              marginBottom: '8px',
            }}>{p.eyebrow}</div>
          )}
          {p.title && (
            <h2 style={{
              fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
              fontSize: 'var(--tapas-h-l-size, 32px)', margin: 0,
              color: 'var(--tapas-h-color, #26170c)',
            }}>{p.title}</h2>
          )}
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(160, Math.floor(1000 / columns))}px, 1fr))`,
        gap: '24px', textAlign: 'center',
        maxWidth: '1000px', margin: '0 auto',
      }}>
        {items.map((it, i) => (
          <div key={i}>
            <div style={{
              fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: 600, lineHeight: 1.1,
              color: p.number_color || 'var(--tapas-accent, #006a6a)',
              marginBottom: '6px',
            }}>{it.value}</div>
            <div style={{
              fontSize: '14px', fontWeight: 600,
              color: 'var(--tapas-primary, #26170c)',
              marginBottom: it.caption ? '4px' : 0,
            }}>{it.label}</div>
            {it.caption && (
              <div style={{
                fontSize: '12px', color: 'var(--tapas-body-color, #5c3a1e)',
                opacity: 0.75, lineHeight: 1.4,
              }}>{it.caption}</div>
            )}
          </div>
        ))}
      </div>
    </BlockFrame>
  );
}

// LogoRow — horizontal strip of brand/partner logos. Often called a
// "trust bar". Accepts an array of { src, alt, href? }.
export function LogoRow({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const logos = Array.isArray(p.logos) ? p.logos : [];
  const grayscale = p.grayscale !== false;
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: p.background_color || 'transparent',
    }}>
      {p.title && (
        <div style={{
          textAlign: 'center', marginBottom: '28px',
          fontSize: '12px', fontWeight: 700, letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'var(--tapas-body-color, #5c3a1e)',
          opacity: 0.7,
        }}>{p.title}</div>
      )}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(28px, 5vw, 56px)',
        maxWidth: '1100px', margin: '0 auto',
      }}>
        {logos.map((l, i) => {
          const img = (
            <img
              src={l.src}
              alt={l.alt || ''}
              style={{
                maxHeight: `${p.logo_height || 40}px`,
                maxWidth: '160px',
                objectFit: 'contain',
                filter: grayscale ? 'grayscale(100%)' : 'none',
                opacity: grayscale ? 0.65 : 1,
                transition: 'filter 0.2s, opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                if (grayscale) {
                  e.currentTarget.style.filter = 'grayscale(0%)';
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                if (grayscale) {
                  e.currentTarget.style.filter = 'grayscale(100%)';
                  e.currentTarget.style.opacity = '0.65';
                }
              }}
            />
          );
          return l.href ? (
            <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.alt || 'Logo link'}>{img}</a>
          ) : (
            <span key={i}>{img}</span>
          );
        })}
      </div>
    </BlockFrame>
  );
}

// ---------------------------------------------------------------------
// Phase 6: Team members, Announcement bar, Pricing compare, Testimonial carousel
// ---------------------------------------------------------------------

// Team — grid of portraits + name + role. Optional bio snippet + per-member
// social links array of { label, href }.
export function Team({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const members = Array.isArray(p.members) ? p.members : [];
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {(p.eyebrow || p.title || p.subtitle) && (
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {p.eyebrow && (
            <div style={{
              fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase', color: 'var(--tapas-accent, #006a6a)',
              marginBottom: '8px',
            }}>{p.eyebrow}</div>
          )}
          {p.title && (
            <h2 style={{
              fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
              fontSize: 'var(--tapas-h-l-size, 32px)', margin: 0,
              color: 'var(--tapas-h-color, #26170c)',
            }}>{p.title}</h2>
          )}
          {p.subtitle && (
            <p style={{
              marginTop: '10px',
              fontSize: '15px', lineHeight: 1.6,
              color: 'var(--tapas-body-color, #5c3a1e)',
              maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto',
            }}>{p.subtitle}</p>
          )}
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${p.min_card_width || 220}px, 1fr))`,
        gap: '28px',
      }}>
        {members.map((m, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            {m.photo && (
              <div style={{
                width: '140px', height: '140px',
                margin: '0 auto 16px',
                borderRadius: '50%', overflow: 'hidden',
                background: 'var(--tapas-card-bg, #faf7ed)',
                boxShadow: '0 4px 16px rgba(38,23,12,0.08)',
              }}>
                <img src={m.photo} alt={m.name || 'Team member'} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  display: 'block',
                }} />
              </div>
            )}
            <div style={{
              fontSize: '17px', fontWeight: 700,
              color: 'var(--tapas-primary, #26170c)',
              marginBottom: '4px',
            }}>{m.name}</div>
            {m.role && (
              <div style={{
                fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--tapas-accent, #006a6a)',
                marginBottom: '10px',
              }}>{m.role}</div>
            )}
            {m.bio && (
              <p style={{
                fontSize: '13px', lineHeight: 1.6,
                color: 'var(--tapas-body-color, #5c3a1e)',
                margin: '0 0 12px',
              }}>{m.bio}</p>
            )}
            {(m.social_label || m.social_href) && (
              <a
                href={m.social_href || '#'}
                target="_blank" rel="noopener noreferrer"
                style={{
                  fontSize: '12px', fontWeight: 700,
                  color: 'var(--tapas-accent, #006a6a)',
                  textDecoration: 'none',
                }}
              >{m.social_label || 'Profile'} →</a>
            )}
          </div>
        ))}
      </div>
    </BlockFrame>
  );
}

// AnnouncementBar — single-row banner for promos / notices. Sits in the
// normal page flow as a block; for a persistent site-wide banner use the
// "announcement" header template.
export function AnnouncementBar({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  if (!p.text && !p.cta_text) return null;
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} full style={{
      background: p.background_color || 'var(--tapas-accent, #006a6a)',
      color: p.text_color || '#fff',
    }}>
      <div style={{
        padding: '12px 20px', textAlign: 'center',
        fontSize: '14px', fontWeight: 500,
        display: 'flex', flexWrap: 'wrap',
        gap: '12px', alignItems: 'center', justifyContent: 'center',
      }}>
        {p.icon && <span style={{ fontSize: '16px' }}>{p.icon}</span>}
        <span>{p.text}</span>
        {p.cta_text && (
          <a
            href={p.cta_href || '#'}
            style={{
              color: p.text_color || '#fff',
              textDecoration: 'underline', fontWeight: 700,
              marginLeft: '4px',
            }}
          >{p.cta_text} →</a>
        )}
      </div>
    </BlockFrame>
  );
}

// PricingCompare — multi-plan comparison table. Columns are plans, rows
// are features. Each row has a name + a per-plan value (string, ✓, or ✗).
export function PricingCompare({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const plans = Array.isArray(p.plans) ? p.plans : [];
  const features = Array.isArray(p.features) ? p.features : [];
  const highlightIdx = Math.max(0, plans.findIndex(pl => pl?.highlight));
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks}>
      {(p.eyebrow || p.title) && (
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {p.eyebrow && (
            <div style={{
              fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase', color: 'var(--tapas-accent, #006a6a)',
              marginBottom: '8px',
            }}>{p.eyebrow}</div>
          )}
          {p.title && (
            <h2 style={{
              fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
              fontSize: 'var(--tapas-h-l-size, 32px)', margin: 0,
              color: 'var(--tapas-h-color, #26170c)',
            }}>{p.title}</h2>
          )}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', maxWidth: '960px', margin: '0 auto',
          borderCollapse: 'collapse', fontSize: '14px',
          color: 'var(--tapas-body-color, #5c3a1e)',
        }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '16px 12px' }}></th>
              {plans.map((pl, i) => {
                const isHi = i === highlightIdx && pl?.highlight;
                return (
                  <th key={i} style={{
                    textAlign: 'center', padding: '20px 12px',
                    background: isHi ? 'var(--tapas-accent, #006a6a)' : 'transparent',
                    color: isHi ? '#fff' : 'var(--tapas-primary, #26170c)',
                    borderTopLeftRadius: '12px', borderTopRightRadius: '12px',
                    minWidth: '140px',
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.75, marginBottom: '6px' }}>
                      {pl.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
                      fontSize: '28px', fontWeight: 600, lineHeight: 1,
                    }}>{pl.price}</div>
                    {pl.period && (
                      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '3px' }}>{pl.period}</div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {features.map((f, rowIdx) => (
              <tr key={rowIdx} style={{ borderTop: '1px solid rgba(38,23,12,0.08)' }}>
                <td style={{
                  padding: '12px', fontWeight: 600,
                  color: 'var(--tapas-primary, #26170c)',
                }}>{f.name}</td>
                {plans.map((_, colIdx) => {
                  const val = f[`plan_${colIdx}`];
                  const isBool = val === true || val === 'true' || val === '✓' || val === false || val === 'false' || val === '✗';
                  const checked = val === true || val === 'true' || val === '✓';
                  const isHi = colIdx === highlightIdx && plans[colIdx]?.highlight;
                  return (
                    <td key={colIdx} style={{
                      padding: '12px', textAlign: 'center',
                      background: isHi ? 'rgba(0,106,106,0.06)' : 'transparent',
                      color: isBool && !checked ? 'rgba(38,23,12,0.3)' : 'var(--tapas-body-color, #5c3a1e)',
                    }}>
                      {isBool ? (checked ? '✓' : '—') : (val || '—')}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* CTA row */}
            {plans.some(pl => pl?.cta_text) && (
              <tr style={{ borderTop: '1px solid rgba(38,23,12,0.08)' }}>
                <td style={{ padding: '18px 12px' }}></td>
                {plans.map((pl, i) => (
                  <td key={i} style={{
                    padding: '18px 12px', textAlign: 'center',
                    background: i === highlightIdx && pl?.highlight ? 'rgba(0,106,106,0.06)' : 'transparent',
                  }}>
                    {pl.cta_text && (
                      <Button href={pl.cta_href || '#'} variant={i === highlightIdx && pl?.highlight ? 'primary' : 'secondary'}>
                        {pl.cta_text}
                      </Button>
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </BlockFrame>
  );
}

// TestimonialCarousel — one quote visible at a time, manual prev/next +
// optional autoplay. Each item is { quote, name, role, photo? }.
export function TestimonialCarousel({ id, pageKey, props, blockIndex, totalBlocks }) {
  const p = props || {};
  const items = Array.isArray(p.items) ? p.items : [];
  const [idx, setIdx] = useState(0);
  const safeIdx = items.length ? idx % items.length : 0;
  const active = items[safeIdx];
  const autoplayMs = Math.max(0, Number(p.autoplay_seconds) || 0) * 1000;
  useEffect(() => {
    if (autoplayMs === 0 || items.length < 2) return undefined;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), autoplayMs);
    return () => clearInterval(t);
  }, [autoplayMs, items.length]);
  if (!items.length) return null;
  return (
    <BlockFrame id={id} pageKey={pageKey} blockIndex={blockIndex} totalBlocks={totalBlocks} style={{
      background: p.background_color || 'transparent',
    }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
        {p.eyebrow && (
          <div style={{
            fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: 'var(--tapas-accent, #006a6a)',
            marginBottom: '12px',
          }}>{p.eyebrow}</div>
        )}
        <div style={{
          fontFamily: 'var(--tapas-heading-font, Newsreader, serif)',
          fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 500, lineHeight: 1.4,
          color: 'var(--tapas-primary, #26170c)',
          marginBottom: '28px', fontStyle: 'italic',
          minHeight: '4.2em',
        }}>“{active.quote}”</div>
        {active.photo && (
          <img src={active.photo} alt={active.name || ''} style={{
            width: '56px', height: '56px', borderRadius: '50%',
            objectFit: 'cover', margin: '0 auto 10px', display: 'block',
          }} />
        )}
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tapas-primary, #26170c)' }}>{active.name}</div>
        {active.role && (
          <div style={{
            fontSize: '12px', color: 'var(--tapas-body-color, #5c3a1e)',
            opacity: 0.75, marginTop: '2px',
          }}>{active.role}</div>
        )}
        {items.length > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '18px', marginTop: '28px',
          }}>
            <button
              onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}
              aria-label="Previous testimonial"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '1px solid rgba(38,23,12,0.15)',
                background: 'transparent', cursor: 'pointer',
                color: 'var(--tapas-primary, #26170c)',
                fontSize: '18px',
              }}
            >‹</button>
            <div style={{ display: 'flex', gap: '6px' }}>
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  style={{
                    width: '8px', height: '8px', padding: 0, borderRadius: '50%',
                    border: 'none', cursor: 'pointer',
                    background: i === safeIdx ? 'var(--tapas-accent, #006a6a)' : 'rgba(38,23,12,0.15)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setIdx(i => (i + 1) % items.length)}
              aria-label="Next testimonial"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '1px solid rgba(38,23,12,0.15)',
                background: 'transparent', cursor: 'pointer',
                color: 'var(--tapas-primary, #26170c)',
                fontSize: '18px',
              }}
            >›</button>
          </div>
        )}
      </div>
    </BlockFrame>
  );
}
