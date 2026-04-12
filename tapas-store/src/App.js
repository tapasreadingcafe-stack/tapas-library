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

const Home            = React.lazy(() => import('./pages/Home'));
const Catalog         = React.lazy(() => import('./pages/Catalog'));
const BookDetail      = React.lazy(() => import('./pages/BookDetail'));
const Offers          = React.lazy(() => import('./pages/Offers'));
const About           = React.lazy(() => import('./pages/About'));
const CustomerLogin   = React.lazy(() => import('./pages/CustomerLogin'));
const Profile         = React.lazy(() => import('./pages/Profile'));
const Cart            = React.lazy(() => import('./pages/Cart'));
const Checkout        = React.lazy(() => import('./pages/Checkout'));
const OrderSuccess    = React.lazy(() => import('./pages/OrderSuccess'));
const Blog            = React.lazy(() => import('./pages/Blog'));
const BlogPost        = React.lazy(() => import('./pages/BlogPost'));

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
