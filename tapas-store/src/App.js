import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SiteContentProvider, useV2Content } from './context/SiteContent';
import { ThemeProvider } from './context/ThemeContext';
import StoreEditorSync from './components/StoreEditorSync';
import TapasStickyNav from './components/TapasStickyNav';
import SiteFooter from './components/SiteFooter';
import InstallPrompt from './components/InstallPrompt';
import './App.css';

// Auth flows get a dedicated split-screen layout; stacking the
// sticky navbar on top would compete with the focused form. Add any
// new auth routes to this set to hide the nav there.
const HIDE_NAV_ROUTES = new Set(['/sign-in', '/sign-up', '/forgot-password']);

function GlobalHeader() {
  const { pathname } = useLocation();
  if (HIDE_NAV_ROUTES.has(pathname)) return null;
  return <TapasStickyNav />;
}

function GlobalFooter() {
  // SiteFooter owns the footer for the entire site. The landing tree
  // no longer carries its own footer node, so nothing else renders
  // below; SiteFooter always takes over.
  return <SiteFooter />;
}

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
const OrderTracking   = lazyWithRetry(() => import('./pages/OrderTracking'));
const Blog            = lazyWithRetry(() => import('./pages/Blog'));
const BlogPost        = lazyWithRetry(() => import('./pages/BlogPost'));
const CustomPage      = lazyWithRetry(() => import('./pages/CustomPage'));
const SearchPage      = lazyWithRetry(() => import('./pages/Search'));
const Shop            = lazyWithRetry(() => import('./pages/Shop'));
const Library         = lazyWithRetry(() => import('./pages/Library'));
const Contact         = lazyWithRetry(() => import('./pages/Contact'));
const Events          = lazyWithRetry(() => import('./pages/Events'));
const SignIn          = lazyWithRetry(() => import('./pages/SignIn'));
const SignUp          = lazyWithRetry(() => import('./pages/SignUp'));
const ForgotPassword  = lazyWithRetry(() => import('./pages/ForgotPassword'));

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
  const v2 = useV2Content();
  // Hold the first paint until we know whether v2 is enabled. Without
  // this, the shell renders the global HeaderTemplate + LegacyHome for
  // ~300ms before v2 arrives and swaps them out — the user sees a flash
  // of the old UI on every reload. A blank frame against --bg is
  // kinder than that flash; once v2.loaded flips we render normally.
  if (!v2?.loaded) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg, #faf8f4)',
        transition: 'background 200ms',
      }} />
    );
  }
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" />
      <style>{`
        :root {
          --tapas-heading-font: 'Poppins', system-ui, sans-serif;
          --tapas-body-font: 'Poppins', system-ui, sans-serif;
        }
        body, html { font-family: 'Poppins', system-ui, sans-serif; }
      `}</style>
      <StoreEditorSync />
      <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', transition:'background 200ms, color 200ms' }}>
        <GlobalHeader />
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
            <Route path="/order/:id/track" element={<OrderTracking />} />
            <Route path="/search"        element={<SearchPage />} />
            <Route path="/shop"          element={<Shop />} />
            <Route path="/library"       element={<Library />} />
            <Route path="/contact"       element={<Contact />} />
            <Route path="/events"        element={<Events />} />
            <Route path="/sign-in"       element={<SignIn />} />
            <Route path="/sign-up"       element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* Catch-all: resolve against custom pages in SiteContent,
                or render a 404 card. Must be last. */}
            <Route path="*"              element={<CustomPage />} />
          </Routes>
        </Suspense>
        <GlobalFooter />
        <InstallPrompt />
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
