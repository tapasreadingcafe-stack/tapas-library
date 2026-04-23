import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SiteContentProvider, useSiteContent, useV2Content } from './context/SiteContent';
import { findV2PageByPath } from './utils/findPage';
import { ThemeProvider } from './context/ThemeContext';
import StoreEditorSync from './components/StoreEditorSync';
import FooterTemplate from './components/FooterTemplates';
import TapasStickyNav from './components/TapasStickyNav';
import InstallPrompt from './components/InstallPrompt';
import { findPageByPath } from './utils/findPage';
import './App.css';

// When the current page has a Navbar/Footer block in its block tree,
// the global app-chrome Header/Footer should get out of the way — we'd
// otherwise render two navbars or two footers, one from the app shell
// and one from the block. These helpers check the current URL against
// content.pages and hide the global chrome if a block version exists.
function currentPageBlocks(content, pathname) {
  const matchKey = findPageByPath(content?.pages, pathname);
  if (!matchKey) return [];
  const blocks = content.pages[matchKey]?.blocks;
  return Array.isArray(blocks) ? blocks : [];
}

// v2 equivalent: walk the Node tree for the current page and look for
// any node whose semantic tag (or authored class) indicates a navbar
// or footer. Without this check, every page authored in the v2 editor
// would double-stack chrome against the global HeaderTemplate /
// FooterTemplate app shell.
function v2TreeHas(tree, predicate) {
  if (!tree) return false;
  const stack = [tree];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (predicate(n)) return true;
    if (Array.isArray(n.children)) stack.push(...n.children);
  }
  return false;
}

function hasFooterNode(n) {
  if (n?.tag === 'footer') return true;
  const cls = n?.classes;
  if (!Array.isArray(cls)) return false;
  return cls.some(c => /(^|-)footer(-|$)/i.test(c || ''));
}

function currentV2PageTree(v2, pathname) {
  if (!v2?.enabled || !v2?.content?.pages) return null;
  const key = findV2PageByPath(v2.content.pages, pathname);
  if (!key) return null;
  return v2.content.pages[key]?.tree || null;
}

// Routes whose page component renders its own footer, so the global
// app shell must step aside. Kept for the footer only — the header is
// now a single React component (TapasStickyNav) that renders across
// every route so active-state styling can follow the router.
const FULL_BLEED_ROUTES = new Set();

function GlobalHeader() {
  // TapasStickyNav owns the header for the entire site now. It has
  // its own active-route logic via useLocation, so we no longer route
  // through HeaderTemplate / the v2-tree nav detection.
  return <TapasStickyNav />;
}

function GlobalFooter() {
  const location = useLocation();
  const content = useSiteContent();
  const v2 = useV2Content();
  if (FULL_BLEED_ROUTES.has(location.pathname)) return null;
  const v2Tree = currentV2PageTree(v2, location.pathname);
  if (v2Tree && v2TreeHas(v2Tree, hasFooterNode)) return null;
  if (!v2Tree) {
    const blocks = currentPageBlocks(content, location.pathname);
    if (blocks.some(b => b?.type === 'footer' && !b?.props?.hidden)) return null;
  }
  return <FooterTemplate />;
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
