import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SiteContentProvider } from './context/SiteContent';
import { ThemeProvider } from './context/ThemeContext';
import StoreEditorSync from './components/StoreEditorSync';
import HeaderTemplate from './components/HeaderTemplates';
import FooterTemplate from './components/FooterTemplates';
import './App.css';

// Recover from ChunkLoadError by forcing one hard reload. Prevents a
// stale browser tab from being stuck after a dev rebuild or deploy.
function lazyWithRetry(importFn) {
  return React.lazy(() =>
    importFn()
      .then((mod) => {
        try { sessionStorage.removeItem('tapas_store_chunk_reload'); } catch {}
        return mod;
      })
      .catch((err) => {
        const isChunkError = err?.name === 'ChunkLoadError' || /Loading chunk .* failed/i.test(err?.message || '');
        if (isChunkError) {
          try {
            if (!sessionStorage.getItem('tapas_store_chunk_reload')) {
              sessionStorage.setItem('tapas_store_chunk_reload', String(Date.now()));
              window.location.reload();
              return new Promise(() => {});
            }
          } catch {}
        }
        throw err;
      })
  );
}

const Home            = lazyWithRetry(() => import('./pages/Home'));
const Catalog         = lazyWithRetry(() => import('./pages/Catalog'));
const BookDetail      = lazyWithRetry(() => import('./pages/BookDetail'));
const Offers          = lazyWithRetry(() => import('./pages/Offers'));
const About           = lazyWithRetry(() => import('./pages/About'));
const CustomerLogin   = lazyWithRetry(() => import('./pages/CustomerLogin'));
const Profile         = lazyWithRetry(() => import('./pages/Profile'));
const Cart            = lazyWithRetry(() => import('./pages/Cart'));
const Checkout        = lazyWithRetry(() => import('./pages/Checkout'));
const OrderSuccess    = lazyWithRetry(() => import('./pages/OrderSuccess'));
const Blog            = lazyWithRetry(() => import('./pages/Blog'));
const BlogPost        = lazyWithRetry(() => import('./pages/BlogPost'));
const CustomPage      = lazyWithRetry(() => import('./pages/CustomPage'));

// ---------------------------------------------------------------------
// Backward-compat shim: existing pages (BookDetail, CustomerLogin, the
// retired MemberDashboard) import `useApp` from this file. Instead of
// touching every page, expose a thin shim that pulls the same fields
// from AuthContext.
// ---------------------------------------------------------------------
export function useApp() {
  const auth = useAuth();
  return {
    member: auth.member,
    wishlistCount: auth.wishlistCount,
    setMember: auth.setMember,
    setWishlistCount: auth.setWishlistCount,
    refresh: auth.refresh,
  };
}

function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:'16px' }}>
      <div style={{ fontSize:'48px', animation:'bookSpin 1s ease-in-out infinite' }}>📚</div>
      <p style={{ color:'#8B6914', fontFamily:'Lato, sans-serif' }}>Loading...</p>
      <style>{`@keyframes bookSpin { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
    </div>
  );
}

function AppShell() {
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Lato:wght@300;400;600;700&display=swap" />
      <StoreEditorSync />
      <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', transition:'background 200ms, color 200ms' }}>
        <HeaderTemplate />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"              element={<Home />} />
            <Route path="/books"         element={<Catalog />} />
            <Route path="/books/:id"     element={<BookDetail />} />
            <Route path="/offers"        element={<Offers />} />
            <Route path="/about"         element={<About />} />
            <Route path="/blog"          element={<Blog />} />
            <Route path="/blog/:slug"    element={<BlogPost />} />
            <Route path="/login"         element={<CustomerLogin />} />
            <Route path="/profile"       element={<Profile />} />
            {/* Backward-compat: /member now redirects to /profile */}
            <Route path="/member"        element={<Navigate to="/profile" replace />} />
            <Route path="/cart"          element={<Cart />} />
            <Route path="/checkout"      element={<Checkout />} />
            <Route path="/order/:id"     element={<OrderSuccess />} />
            {/* Catch-all: resolve against custom pages in SiteContent,
                or render a 404 card. Must be last. */}
            <Route path="*"              element={<CustomPage />} />
          </Routes>
        </Suspense>
        <FooterTemplate />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SiteContentProvider>
        <AuthProvider>
          <CartProvider>
            <AppShell />
          </CartProvider>
        </AuthProvider>
      </SiteContentProvider>
    </ThemeProvider>
  );
}
