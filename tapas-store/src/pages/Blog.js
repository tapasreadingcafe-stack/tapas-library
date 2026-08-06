import React from 'react';
import PageBreadcrumb from '../components/PageBreadcrumb';
import BlogGrid from './blog/BlogGrid';
import PageRenderer from '../blocks/PageRenderer';
import { useSiteContent } from '../context/SiteContent';

export default function Blog() {
  const content = useSiteContent();
  if (content?.pages?.blog?.use_blocks) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageRenderer pageKey="blog" />
      </div>
    );
  }
  return <BlogLegacy />;
}

function BlogLegacy() {
  return (
    <div style={{ background: '#F6F8F7' }}>
      <PageBreadcrumb name="Blogs" />
      <BlogGrid articles={[]} />
    </div>
  );
}
