import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteContent, useV2Content } from '../context/SiteContent';
import PageRenderer from '../blocks/PageRenderer';
import { findPageByPath, findV2PageByPath, NotFound } from '../utils/findPage';

// =====================================================================
// CustomPage
//
// Catch-all for any route not matched by the hardcoded Route entries in
// App.js. Resolves the URL to a page via findPageByPath — a user may
// have moved a default page to a new slug, or created a brand new page
// at this URL. If no page matches, 404.
//
// v2 routing (Phase 10 cutover): when the v2 flag is enabled OR ?v2=1
// is present, also search v2's pages (which key by `slug` instead of
// `meta.path`). PageRenderer's v2 branch takes over rendering from
// there. Falls back to v1 lookup if v2 doesn't have a match — a page
// can exist only in v1 (hardcoded fallback), only in v2 (net-new
// authored page), or both.
// =====================================================================

export default function CustomPage() {
  const location = useLocation();
  const content = useSiteContent();
  const v2 = useV2Content();
  const path = location.pathname;

  // Try v2 first when it's enabled so newly-authored pages take
  // precedence over any stale v1 seed mapping. If v2 is loading or
  // doesn't have the URL, fall through to v1.
  if (v2?.enabled && v2.loaded) {
    const v2Key = findV2PageByPath(v2?.content?.pages, path);
    if (v2Key) {
      return (
        <div style={{ minHeight: '60vh' }}>
          <PageRenderer pageKey={v2Key} />
        </div>
      );
    }
  }

  const matchKey = findPageByPath(content?.pages, path);
  if (!matchKey) return <NotFound path={path} />;

  return (
    <div style={{ minHeight: '60vh' }}>
      <PageRenderer pageKey={matchKey} />
    </div>
  );
}
