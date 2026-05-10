import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageBreadcrumb from '../components/PageBreadcrumb';

const SLUG_TO_NAME = {
  '/orders': 'Order History',
  '/wishlist': 'Wishlist',
  '/faq': 'FAQs',
  '/faqs': 'FAQs',
  '/terms': 'Terms & Conditions',
  '/products': 'Products',
  '/track-order': 'Track Order',
};

function nameFor(pathname) {
  if (SLUG_TO_NAME[pathname]) return SLUG_TO_NAME[pathname];
  return pathname.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Coming Soon';
}

export default function ComingSoon() {
  const { pathname } = useLocation();
  const name = nameFor(pathname);

  return (
    <div style={{ background: '#F6F8F7', minHeight: '60vh' }}>
      <PageBreadcrumb name={name} />
      <section style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '80px 32px 120px',
        textAlign: 'center',
        fontFamily: 'Poppins, system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 56, marginBottom: 24 }}>🛠️</div>
        <h1 style={{
          margin: '0 0 16px',
          fontSize: 28,
          fontWeight: 600,
          color: '#1a1a1a',
        }}>We're working on it</h1>
        <p style={{
          margin: '0 0 32px',
          fontSize: 15,
          lineHeight: 1.6,
          color: '#4a4a4a',
        }}>
          The {name} page isn't ready just yet. Come back soon — we'll have it up shortly.
        </p>
        <Link to="/" style={{
          display: 'inline-block',
          background: '#E0004F',
          color: '#fff',
          textDecoration: 'none',
          padding: '12px 28px',
          borderRadius: 999,
          fontWeight: 600,
          fontSize: 14,
        }}>
          Back to home
        </Link>
      </section>
    </div>
  );
}
