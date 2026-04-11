import React, { useState, Suspense } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
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

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { member, wishlistCount, logout } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/books?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setSearchTerm('');
    }
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/books', label: 'Books' },
    { to: '/offers', label: 'Offers' },
    { to: '/about', label: 'About' },
  ];

  return (
    <nav style={{
      position:'sticky', top:0, zIndex:1000,
      background:'linear-gradient(135deg, #2C1810 0%, #4A2C17 100%)',
      boxShadow:'0 2px 20px rgba(0,0,0,0.35)',
      fontFamily:'Lato, sans-serif'
    }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px' }}>
        <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'28px' }}>📚</span>
          <div>
            <div style={{ color:'#F5DEB3', fontFamily:'"Playfair Display", serif', fontSize:'18px', fontWeight:'700', lineHeight:'1.1' }}>Tapas Library</div>
            <div style={{ color:'#D4A853', fontSize:'11px', letterSpacing:'2px' }}>& BOOK STORE</div>
          </div>
        </Link>

        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} style={{
              color: isActive(link.to) ? '#D4A853' : '#F5DEB3',
              textDecoration:'none', padding:'8px 16px', borderRadius:'4px',
              fontWeight: isActive(link.to) ? '600' : '400',
              borderBottom: isActive(link.to) ? '2px solid #D4A853' : '2px solid transparent',
              transition:'all 0.2s', fontSize:'15px'
            }}>
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {searchOpen ? (
            <form onSubmit={handleSearch} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <input
                autoFocus
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search books..."
                style={{ padding:'6px 12px', borderRadius:'20px', border:'none', background:'rgba(255,255,255,0.15)', color:'white', outline:'none', width:'200px', fontSize:'14px' }}
              />
              <button type="submit" style={{ background:'none', border:'none', color:'#D4A853', cursor:'pointer', fontSize:'18px' }}>🔍</button>
              <button type="button" onClick={() => setSearchOpen(false)} style={{ background:'none', border:'none', color:'#F5DEB3', cursor:'pointer', fontSize:'16px' }}>✕</button>
            </form>
          ) : (
            <button onClick={() => setSearchOpen(true)} style={{ background:'none', border:'none', color:'#F5DEB3', cursor:'pointer', fontSize:'20px', padding:'4px' }}>🔍</button>
          )}

          <Link to="/profile?tab=wishlist" style={{ position:'relative', textDecoration:'none', color:'#F5DEB3', fontSize:'20px', padding:'4px' }}>
            ❤️
            {wishlistCount > 0 && (
              <span style={{ position:'absolute', top:'-4px', right:'-4px', background:'#D4A853', color:'#2C1810', borderRadius:'50%', width:'16px', height:'16px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link to="/cart" style={{ position:'relative', textDecoration:'none', color:'#F5DEB3', fontSize:'20px', padding:'4px' }}>
            🛒
            {itemCount > 0 && (
              <span style={{ position:'absolute', top:'-4px', right:'-4px', background:'#D4A853', color:'#2C1810', borderRadius:'50%', minWidth:'16px', height:'16px', padding:'0 4px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>
                {itemCount}
              </span>
            )}
          </Link>

          {member ? (
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <Link to="/profile" style={{ color:'#D4A853', textDecoration:'none', fontSize:'14px', fontWeight:'600' }}>
                👤 {member.name?.split(' ')[0] || 'Profile'}
              </Link>
              <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'#F5DEB3', borderRadius:'4px', padding:'6px 12px', cursor:'pointer', fontSize:'13px' }}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" style={{
                color:'#F5DEB3', textDecoration:'none', padding:'8px 14px', borderRadius:'20px',
                fontWeight:'600', fontSize:'14px', border:'1px solid rgba(245,222,179,0.3)'
              }}>
                Login
              </Link>
              <Link to="/login?mode=signup" style={{
                background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
                textDecoration:'none', padding:'8px 18px', borderRadius:'20px',
                fontWeight:'700', fontSize:'14px', boxShadow:'0 2px 8px rgba(212,168,83,0.4)'
              }}>
                Sign Up
              </Link>
            </>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            display:'none', background:'none', border:'none', color:'#F5DEB3', fontSize:'24px', cursor:'pointer'
          }} className="mobile-menu-btn">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{ background:'#2C1810', borderTop:'1px solid rgba(255,255,255,0.1)', padding:'16px 20px' }}>
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} style={{
              display:'block', color:'#F5DEB3', textDecoration:'none',
              padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.08)', fontSize:'16px'
            }}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ background:'#1A0F0A', color:'#F5DEB3', fontFamily:'Lato, sans-serif', marginTop:'60px' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'50px 20px 30px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'40px', marginBottom:'40px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <span style={{ fontSize:'32px' }}>📚</span>
              <div>
                <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', fontWeight:'700' }}>Tapas Library</div>
                <div style={{ color:'#D4A853', fontSize:'12px', letterSpacing:'2px' }}>& BOOK STORE</div>
              </div>
            </div>
            <p style={{ color:'#A0856A', fontSize:'14px', lineHeight:'1.6' }}>
              Your neighbourhood library and book store. Discover, borrow, and buy books you'll love.
            </p>
          </div>

          <div>
            <h4 style={{ color:'#D4A853', fontFamily:'"Playfair Display", serif', fontSize:'16px', marginBottom:'16px' }}>Quick Links</h4>
            {[['Home','/'],['Books Catalog','/books'],['Special Offers','/offers'],['About Us','/about'],['Member Login','/login']].map(([label, to]) => (
              <div key={to} style={{ marginBottom:'10px' }}>
                <Link to={to} style={{ color:'#A0856A', textDecoration:'none', fontSize:'14px' }}>{label}</Link>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ color:'#D4A853', fontFamily:'"Playfair Display", serif', fontSize:'16px', marginBottom:'16px' }}>Opening Hours</h4>
            {[['Mon – Fri','9:00 AM – 8:00 PM'],['Saturday','9:00 AM – 6:00 PM'],['Sunday','10:00 AM – 4:00 PM']].map(([day, time]) => (
              <div key={day} style={{ marginBottom:'10px' }}>
                <div style={{ color:'#F5DEB3', fontSize:'13px', fontWeight:'600' }}>{day}</div>
                <div style={{ color:'#A0856A', fontSize:'13px' }}>{time}</div>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ color:'#D4A853', fontFamily:'"Playfair Display", serif', fontSize:'16px', marginBottom:'16px' }}>Contact</h4>
            {[['📍','123 Library Lane, Booktown'],['📞','+91 98765 43210'],['✉️','hello@tapaslibrary.in']].map(([icon, text]) => (
              <div key={text} style={{ display:'flex', gap:'10px', marginBottom:'12px', alignItems:'flex-start' }}>
                <span>{icon}</span>
                <span style={{ color:'#A0856A', fontSize:'13px' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'20px', textAlign:'center', color:'#A0856A', fontSize:'13px' }}>
          © 2024 Tapas Library & Book Store. All rights reserved. Made with ❤️ for book lovers.
        </div>
      </div>
    </footer>
  );
}

function AppShell() {
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Lato:wght@300;400;600;700&display=swap" />
      <div style={{ minHeight:'100vh', background:'#FDF8F0' }}>
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"              element={<Home />} />
            <Route path="/books"         element={<Catalog />} />
            <Route path="/books/:id"     element={<BookDetail />} />
            <Route path="/offers"        element={<Offers />} />
            <Route path="/about"         element={<About />} />
            <Route path="/login"         element={<CustomerLogin />} />
            <Route path="/profile"       element={<Profile />} />
            {/* Backward-compat: /member now redirects to /profile */}
            <Route path="/member"        element={<Navigate to="/profile" replace />} />
            <Route path="/cart"          element={<Cart />} />
            <Route path="/checkout"      element={<Checkout />} />
            <Route path="/order/:id"     element={<OrderSuccess />} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </AuthProvider>
  );
}
