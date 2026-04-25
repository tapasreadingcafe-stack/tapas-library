import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteContent } from '../context/SiteContent';
import PageRenderer from '../blocks/PageRenderer';
import { findPageByPath, NotFound } from '../utils/findPage';

// Catch-all for any route not matched by the hardcoded Route entries
// in App.js. Resolves the URL to a page via findPageByPath — a user
// may have moved a default page to a new slug, or created a brand
// new page at this URL. If no page matches, 404.
export default function CustomPage() {
  const location = useLocation();
  const content = useSiteContent();
  const path = location.pathname;

  const matchKey = findPageByPath(content?.pages, path);
  if (!matchKey) return <NotFound path={path} />;

  return (
    <div style={{ minHeight: '60vh' }}>
      <PageRenderer pageKey={matchKey} />
    </div>
  );
}
