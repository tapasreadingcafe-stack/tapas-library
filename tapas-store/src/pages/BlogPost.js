import React from 'react';
import { Link, useParams } from 'react-router-dom';
import BLOG_CSS from './blog/blogStyles';
import {
  JOURNAL_FEATURED,
  JOURNAL_SIDEBAR,
  JOURNAL_ARCHIVE,
  titleText,
} from '../data/journalPosts';

// Stub detail page. The Blog archive + featured + sidebar all route
// here; we just look up the slug so we can echo the title back, and
// leave a note that the full post renderer is coming.
export default function BlogPost() {
  const { slug } = useParams();

  const lookup = (() => {
    if (JOURNAL_FEATURED.slug === slug) {
      return { title: JOURNAL_FEATURED.title, kicker: 'Featured' };
    }
    const side = JOURNAL_SIDEBAR.find((s) => s.slug === slug);
    if (side) return { title: side.title, kicker: side.kicker };
    const arch = JOURNAL_ARCHIVE.find((a) => a.slug === slug);
    if (arch) return { title: arch.title, kicker: arch.category };
    return null;
  })();

  return (
    <div className="blog-root">
      <style>{BLOG_CSS}</style>
      <article className="blog-detail">
        {lookup ? (
          <>
            <div className="blog-detail-kicker">
              {lookup.kicker.toUpperCase()}
            </div>
            <h1 className="blog-detail-title">
              {Array.isArray(lookup.title) ? titleText(lookup.title) : lookup.title}
            </h1>
          </>
        ) : (
          <>
            <div className="blog-detail-kicker">The Journal</div>
            <h1 className="blog-detail-title">Post not found</h1>
          </>
        )}
        <p className="blog-detail-note">
          Coming soon — full post detail page in the next spec.
        </p>
        <Link to="/blog" className="blog-detail-back">← Back to the journal</Link>
      </article>
    </div>
  );
}
