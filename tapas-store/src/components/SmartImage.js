import React from 'react';

// =====================================================================
// SmartImage
//
// Drop-in <img> replacement for images rendered in block renderers.
// Wins over a plain <img>:
//
//   • loading="lazy" + decoding="async" — cuts the JS-blocking main
//     thread cost on image-heavy pages
//   • explicit width / height or aspect-ratio box — no CLS
//   • graceful blur-up: we paint a color placeholder under the <img>
//     that stays until the image `onLoad`s
//   • optional srcset: when the URL points at Supabase Storage AND the
//     project has the image transform addon enabled, we generate
//     viewport-scaled variants. If the transform is unavailable the
//     browser falls back to the raw `src`, which is always the
//     untransformed URL, so nothing breaks.
//
// The shape is intentionally kept identical to <img> so we can
// mechanically swap <img src={x} /> → <SmartImage src={x} /> inside any
// block renderer.
// =====================================================================

const WIDTHS = [320, 640, 960, 1280, 1600];

// Turn a "…/object/public/<bucket>/<path>" URL into the Supabase image
// renderer form "…/render/image/public/<bucket>/<path>" with a width &
// quality query. Returns null if the URL isn't a Supabase storage URL.
function transformSupabaseUrl(url, width, quality = 78) {
  if (!url || typeof url !== 'string') return null;
  // We accept both /object/public/ and the already-transformed /render/image/public/
  const m = url.match(/(\/storage\/v1\/)(object|render\/image)\/(public\/.+)$/);
  if (!m) return null;
  const basePath = m[3].split('?')[0];
  const origin = url.slice(0, url.indexOf(m[0]));
  return `${origin}/storage/v1/render/image/${basePath}?width=${width}&quality=${quality}`;
}

function buildSrcset(url, widths = WIDTHS) {
  const parts = [];
  for (const w of widths) {
    const u = transformSupabaseUrl(url, w);
    if (!u) return null;
    parts.push(`${u} ${w}w`);
  }
  return parts.join(', ');
}

export default function SmartImage({
  src,
  alt = '',
  width,
  height,
  aspectRatio,      // e.g. '3/2' — used when width/height aren't both known
  placeholderColor = '#eee4d2',
  sizes,            // optional: <img> sizes attribute
  style,
  className,
  objectFit = 'cover',
  onLoad,
  onError,
  ...rest
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [errored, setErrored] = React.useState(false);
  const srcset = !errored ? buildSrcset(src) : null;

  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    background: placeholderColor,
    width: width || '100%',
    ...(height ? { height } : {}),
    ...(aspectRatio && !height ? { aspectRatio } : {}),
    ...(style || {}),
  };
  const imgStyle = {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit,
    opacity: loaded ? 1 : 0,
    transition: 'opacity 200ms ease-out',
  };

  if (!src) {
    return <div className={className} style={containerStyle} aria-label={alt} />;
  }

  return (
    <div className={className} style={containerStyle}>
      <img
        src={src}
        srcSet={srcset || undefined}
        sizes={srcset ? (sizes || '100vw') : undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={(e) => { setLoaded(true); onLoad && onLoad(e); }}
        onError={(e) => {
          // If the transformed srcset failed, fall back to the raw src
          // by dropping srcset on re-render. The browser already used
          // `src` so usually this onError fires only when the raw URL
          // itself is broken.
          setErrored(true);
          onError && onError(e);
        }}
        style={imgStyle}
        {...rest}
      />
    </div>
  );
}
