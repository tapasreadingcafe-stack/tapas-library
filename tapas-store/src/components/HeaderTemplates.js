import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSiteContent } from '../context/SiteContent';

// Pick black or original light text based on the bg luminance. Threshold
// 0.6 = anything brighter than mid-gray gets dark text.
function pickContrastText(bg, fallbackLight) {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg || '');
  if (!m) return fallbackLight;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1a2e0a' : fallbackLight;
}

// =====================================================================
// HeaderTemplates — 10 swappable navbar layouts.
//
// Every template reads the same fields from SiteContent (brand, header,
// member, wishlistCount, itemCount) so swapping templates is one line
// in the dashboard.
//
// Responsive: each template ships with a small <style> block scoped
// by className that handles the <900px mobile collapse.
//
// Templates:
//   1  classic           logo left · nav center · CTAs right
//   2  centered          2 rows: CTAs top, logo + nav below
//   3  split             nav left · logo center · CTAs right
//   4  minimal           logo left · single Sign Up CTA right
//   5  search_forward    logo left · big search center · CTAs right
//   6  double_decker     top strip phone/email/hours · main navbar below
//   7  transparent       classic but transparent over the hero
//   8  pill_nav          nav pills enclosed in a rounded pill container
//   9  accent_bar        classic with a bold accent border on the left
//   10 announcement      thin top row with accent ticker text, then navbar
// =====================================================================

function useHeaderState() {
  const location = useLocation();
  const navigate = useNavigate();
  const { member, wishlistCount, logout } = useAuth();
  const { itemCount } = useCart();
  const content = useSiteContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const ss = content.section_styles || {};
  // sand_color drives navbar text. Auto-contrast against the navbar bg
  // so a light primary_color flips text to dark instead of unreadable cream.
  const navBg = ss.header_bg_color || content.brand?.primary_color;
  const autoText = pickContrastText(navBg, content.brand?.sand_color);
  const brand = {
    ...content.brand,
    primary_color:       ss.header_bg_color || content.brand?.primary_color,
    primary_color_light: ss.header_bg_color || content.brand?.primary_color_light,
    sand_color:          ss.header_text_color || autoText,
    accent_color:        ss.header_link_active_color || content.brand?.accent_color,
  };
  const header = content.header || {};
  const contact = content.contact || {};

  // Phase 5: if staff added Custom nav links in the Header section, use
  // those instead of the fixed Home/Books/Offers/About set. An empty
  // array keeps the default behavior.
  const customLinks = Array.isArray(header.custom_nav_links)
    ? header.custom_nav_links.filter(l => l && l.label && l.href)
    : [];
  const navLinks = customLinks.length > 0
    ? customLinks.map(l => ({ to: l.href, label: l.label }))
    : [
        { to: '/',       label: header.nav_home   || 'Home' },
        { to: '/books',  label: header.nav_books  || 'Books' },
        { to: '/offers', label: header.nav_offers || 'Offers' },
        { to: '/blog',   label: header.nav_blog   || 'Journal' },
        { to: '/about',  label: header.nav_about  || 'About' },
      ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await logout?.();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Phase 7: unified search across books, journal, events.
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setSearchTerm('');
    }
  };

  return {
    location, navigate, member, wishlistCount, itemCount, content, brand, header, contact,
    navLinks, isActive, handleLogout, handleSearch, searchTerm, setSearchTerm,
    searchOpen, setSearchOpen, menuOpen, setMenuOpen,
  };
}

// Shared micro-components --------------------------------------------

function Logo({ brand, header, size = 18, gap = 10, compact = false }) {
  return (
    <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap: `${gap}px` }}>
      <img
        src={`${process.env.PUBLIC_URL || ''}/logo%20v2.png`}
        alt={brand.name || 'Tapas reading cafe'}
        style={{ height: `${size + 24}px`, width: 'auto', display: 'block' }}
      />
    </Link>
  );
}

function NavList({ navLinks, isActive, brand, style = {}, itemStyle = {} }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'4px', ...style }}>
      {navLinks.map(link => (
        <Link key={link.to} to={link.to} style={{
          color: isActive(link.to) ? brand.accent_color : brand.sand_color,
          textDecoration:'none',
          padding:'8px 16px',
          borderRadius:'4px',
          fontWeight: isActive(link.to) ? '600' : '400',
          borderBottom: isActive(link.to) ? `2px solid ${brand.accent_color}` : '2px solid transparent',
          transition:'all 0.2s',
          fontSize:'15px',
          ...itemStyle,
        }}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function AuthActions({ member, header, brand, handleLogout }) {
  if (member) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <Link to="/profile" style={{ color:brand.accent_color, textDecoration:'none', fontSize:'14px', fontWeight:'600' }}>
          👤 {member.name?.split(' ')[0] || 'Profile'}
        </Link>
        <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.1)', border:`1px solid ${brand.sand_color}33`, color:brand.sand_color, borderRadius:'4px', padding:'6px 12px', cursor:'pointer', fontSize:'13px' }}>
          Logout
        </button>
      </div>
    );
  }
  return (
    <>
      <Link to="/login" style={{
        color:'#FFFFFF', textDecoration:'underline', textUnderlineOffset:'4px',
        padding:'8px 4px', fontWeight:'500', fontSize:'15px',
      }}>
        {header.login_label || 'Sign In'}
      </Link>
      <Link to="/login?mode=signup" style={{
        background:'#EF3D7B', color:'#FFFFFF',
        textDecoration:'none', padding:'12px 28px', borderRadius:'999px',
        fontWeight:'600', fontSize:'15px',
      }}>
        {header.signup_label || 'Sign Up'}
      </Link>
    </>
  );
}

function IconsRow({ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder }) {
  const iconBtn = {
    background:'none', border:'none', color:'#FFFFFF', cursor:'pointer',
    padding:'6px', display:'inline-flex', alignItems:'center', justifyContent:'center',
  };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      {searchOpen ? (
        <form onSubmit={handleSearch} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <input autoFocus value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder={placeholder || 'Search books…'}
            style={{ padding:'6px 12px', borderRadius:'20px', border:'none', background:'rgba(255,255,255,0.15)', color:'#fff', outline:'none', width:'200px', fontSize:'14px' }} />
          <button type="submit" style={iconBtn} aria-label="Search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button type="button" onClick={() => setSearchOpen(false)} style={iconBtn} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </form>
      ) : (
        <button onClick={() => setSearchOpen(true)} style={iconBtn} aria-label="Search">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      )}
      <Link to="/cart" style={{ ...iconBtn, position:'relative', textDecoration:'none' }} aria-label="Cart">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        {itemCount > 0 && (
          <span style={{ position:'absolute', top:'-2px', right:'-2px', background:'#EF3D7B', color:'#fff', borderRadius:'50%', minWidth:'16px', height:'16px', padding:'0 4px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>
            {itemCount}
          </span>
        )}
      </Link>
    </div>
  );
}

function MobileMenu({ navLinks, menuOpen, setMenuOpen, brand }) {
  if (!menuOpen) return null;
  return (
    <div style={{ background:brand.primary_color, borderTop:'1px solid rgba(255,255,255,0.1)', padding:'16px 20px' }}>
      {navLinks.map(link => (
        <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} style={{
          display:'block', color:brand.sand_color, textDecoration:'none',
          padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.08)', fontSize:'16px'
        }}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

// Responsive helper: injects a <style> tag with a media query that
// hides `.tapas-hide-mobile` elements and shows `.tapas-show-mobile`
// below 900px, and a single .tapas-nav-wrap flex-direction toggle.
function ResponsiveStyles() {
  return (
    <style>{`
      @media (max-width: 900px) {
        .tapas-hide-mobile { display: none !important; }
        .tapas-show-mobile { display: flex !important; }
        .tapas-nav-wrap { flex-wrap: wrap !important; padding: 10px 16px !important; height: auto !important; gap: 10px !important; }
        .tapas-logo-center { order: 1; }
        .tapas-nav-center { order: 3; width: 100%; justify-content: center; }
        .tapas-cta-right { order: 2; margin-left: auto; }
      }
      .tapas-show-mobile { display: none; }
    `}</style>
  );
}

const baseNav = (brand) => ({
  position:'sticky', top:0, zIndex:1000,
  background:'#CFF389',
  fontFamily:'var(--tapas-body-font, Lato), sans-serif',
});

// =====================================================================
// Template 1: Classic
// =====================================================================
function HeaderClassic(props) {
  const { brand, header, navLinks, isActive, member, handleLogout, wishlistCount, itemCount, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, menuOpen, setMenuOpen } = props;
  return (
    <nav style={baseNav(brand)}>
      <ResponsiveStyles />
      <div className="tapas-nav-wrap" style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px' }}>
        <Logo brand={brand} header={header} />
        <div className="tapas-hide-mobile"><NavList navLinks={navLinks} isActive={isActive} brand={brand} /></div>
        <div className="tapas-hide-mobile" style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <IconsRow {...{ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder: header.search_placeholder }} />
          <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
        </div>
        <button className="tapas-show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', color:brand.sand_color, fontSize:'24px', cursor:'pointer' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <MobileMenu navLinks={navLinks} menuOpen={menuOpen} setMenuOpen={setMenuOpen} brand={brand} />
    </nav>
  );
}

// =====================================================================
// Template 2: Centered (two rows)
// =====================================================================
function HeaderCentered(props) {
  const { brand, header, navLinks, isActive, member, handleLogout, wishlistCount, itemCount, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch } = props;
  return (
    <nav style={baseNav(brand)}>
      <ResponsiveStyles />
      {/* Top row: CTAs right, icons */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'10px 20px', display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'16px', borderBottom:`1px solid ${brand.sand_color}22` }}>
        <IconsRow {...{ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder: header.search_placeholder }} />
        <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
      </div>
      {/* Bottom row: logo center, nav center below */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'20px 20px 16px', textAlign:'center' }}>
        <Logo brand={brand} header={header} size={26} />
        <div className="tapas-hide-mobile" style={{ marginTop:'16px', display:'flex', justifyContent:'center' }}>
          <NavList navLinks={navLinks} isActive={isActive} brand={brand} />
        </div>
      </div>
    </nav>
  );
}

// =====================================================================
// Template 3: Split — nav left, logo center, CTAs right
// =====================================================================
function HeaderSplit(props) {
  const { brand, header, navLinks, isActive, member, handleLogout, wishlistCount, itemCount, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, menuOpen, setMenuOpen } = props;
  return (
    <nav style={baseNav(brand)}>
      <ResponsiveStyles />
      <div className="tapas-nav-wrap" style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', height:'72px', gap:'16px' }}>
        <div className="tapas-hide-mobile" style={{ justifySelf:'start' }}>
          <NavList navLinks={navLinks} isActive={isActive} brand={brand} />
        </div>
        <div style={{ justifySelf:'center' }}>
          <Logo brand={brand} header={header} size={20} />
        </div>
        <div className="tapas-hide-mobile" style={{ justifySelf:'end', display:'flex', alignItems:'center', gap:'12px' }}>
          <IconsRow {...{ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder: header.search_placeholder }} />
          <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
        </div>
        <button className="tapas-show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', color:brand.sand_color, fontSize:'24px', cursor:'pointer', justifySelf:'end' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <MobileMenu navLinks={navLinks} menuOpen={menuOpen} setMenuOpen={setMenuOpen} brand={brand} />
    </nav>
  );
}

// =====================================================================
// Template 4: Minimal — logo left, single Sign Up CTA right
// =====================================================================
function HeaderMinimal(props) {
  const { brand, header, member, handleLogout } = props;
  return (
    <nav style={baseNav(brand)}>
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'56px' }}>
        <Logo brand={brand} header={header} size={16} />
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          {member ? (
            <>
              <Link to="/profile" style={{ color:brand.accent_color, textDecoration:'none', fontSize:'14px', fontWeight:'600' }}>
                👤 {member.name?.split(' ')[0] || 'Profile'}
              </Link>
              <button onClick={handleLogout} style={{ background:'transparent', border:`1px solid ${brand.sand_color}55`, color:brand.sand_color, borderRadius:'20px', padding:'6px 14px', cursor:'pointer', fontSize:'13px' }}>Logout</button>
            </>
          ) : (
            <Link to="/login?mode=signup" style={{
              background:`linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})`, color:brand.primary_color,
              textDecoration:'none', padding:'9px 22px', borderRadius:'20px', fontWeight:'700', fontSize:'14px',
            }}>
              {header.signup_label || 'Sign Up'} →
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// =====================================================================
// Template 5: Search-forward — big search bar in the middle
// =====================================================================
function HeaderSearchForward(props) {
  const { brand, header, member, handleLogout, searchTerm, setSearchTerm, handleSearch, itemCount, wishlistCount } = props;
  return (
    <nav style={baseNav(brand)}>
      <ResponsiveStyles />
      <div className="tapas-nav-wrap" style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', gap:'24px', height:'72px' }}>
        <Logo brand={brand} header={header} />
        <form onSubmit={handleSearch} className="tapas-hide-mobile" style={{ flex:1, display:'flex', background:'rgba(255,255,255,0.12)', borderRadius:'24px', padding:'4px', border:`1px solid ${brand.sand_color}33` }}>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder={header.search_placeholder || 'Search title, author, or genre…'}
            style={{ flex:1, padding:'10px 18px', border:'none', background:'transparent', color:brand.sand_color, outline:'none', fontSize:'14px' }} />
          <button type="submit" style={{ background:`linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})`, color:brand.primary_color, border:'none', padding:'8px 22px', borderRadius:'20px', fontWeight:'700', cursor:'pointer', fontSize:'13px' }}>Search</button>
        </form>
        <div className="tapas-hide-mobile" style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <Link to="/profile?tab=wishlist" style={{ position:'relative', textDecoration:'none', color:brand.sand_color, fontSize:'20px' }}>❤️{wishlistCount > 0 && <span style={{ position:'absolute', top:'-4px', right:'-8px', background:brand.accent_color, color:brand.primary_color, borderRadius:'50%', width:'16px', height:'16px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>{wishlistCount}</span>}</Link>
          <Link to="/cart" style={{ position:'relative', textDecoration:'none', color:brand.sand_color, fontSize:'20px' }}>🛒{itemCount > 0 && <span style={{ position:'absolute', top:'-4px', right:'-8px', background:brand.accent_color, color:brand.primary_color, borderRadius:'50%', minWidth:'16px', height:'16px', padding:'0 4px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>{itemCount}</span>}</Link>
          <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
        </div>
      </div>
    </nav>
  );
}

// =====================================================================
// Template 6: Double-decker — top info strip + main navbar
// =====================================================================
function HeaderDoubleDecker(props) {
  const { brand, header, navLinks, isActive, member, handleLogout, wishlistCount, itemCount, contact, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, menuOpen, setMenuOpen } = props;
  return (
    <nav style={baseNav(brand)}>
      <ResponsiveStyles />
      {/* Top info strip */}
      <div style={{ background:brand.primary_color_dark, color:brand.sand_color, fontSize:'12px' }}>
        <div className="tapas-hide-mobile" style={{ maxWidth:'1200px', margin:'0 auto', padding:'6px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:'18px', opacity:0.85 }}>
            <span>📞 {contact.phone}</span>
            <span>✉️ {contact.email}</span>
          </div>
          <div style={{ opacity:0.85 }}>
            🕐 Mon–Fri {contact.hours_weekdays}
          </div>
        </div>
      </div>
      {/* Main navbar */}
      <div className="tapas-nav-wrap" style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px' }}>
        <Logo brand={brand} header={header} />
        <div className="tapas-hide-mobile"><NavList navLinks={navLinks} isActive={isActive} brand={brand} /></div>
        <div className="tapas-hide-mobile" style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <IconsRow {...{ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder: header.search_placeholder }} />
          <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
        </div>
        <button className="tapas-show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', color:brand.sand_color, fontSize:'24px', cursor:'pointer' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <MobileMenu navLinks={navLinks} menuOpen={menuOpen} setMenuOpen={setMenuOpen} brand={brand} />
    </nav>
  );
}

// =====================================================================
// Template 7: Transparent — same layout as classic, no background
// =====================================================================
function HeaderTransparent(props) {
  const { brand, header, navLinks, isActive, member, handleLogout, wishlistCount, itemCount, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, menuOpen, setMenuOpen } = props;
  return (
    <nav style={{
      position:'absolute', top:0, left:0, right:0, zIndex:1000,
      background:'transparent',
      fontFamily:'var(--tapas-body-font, Lato), sans-serif',
    }}>
      <ResponsiveStyles />
      <div className="tapas-nav-wrap" style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'72px' }}>
        <Logo brand={brand} header={header} />
        <div className="tapas-hide-mobile"><NavList navLinks={navLinks} isActive={isActive} brand={brand} /></div>
        <div className="tapas-hide-mobile" style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <IconsRow {...{ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder: header.search_placeholder }} />
          <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
        </div>
        <button className="tapas-show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', color:brand.sand_color, fontSize:'24px', cursor:'pointer' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <MobileMenu navLinks={navLinks} menuOpen={menuOpen} setMenuOpen={setMenuOpen} brand={brand} />
    </nav>
  );
}

// =====================================================================
// Template 8: Pill nav — nav links wrapped in a rounded pill
// =====================================================================
function HeaderPillNav(props) {
  const { brand, header, navLinks, isActive, member, handleLogout, wishlistCount, itemCount, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, menuOpen, setMenuOpen } = props;
  return (
    <nav style={baseNav(brand)}>
      <ResponsiveStyles />
      <div className="tapas-nav-wrap" style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'72px' }}>
        <Logo brand={brand} header={header} />
        <div className="tapas-hide-mobile" style={{ background:'rgba(255,255,255,0.08)', borderRadius:'30px', padding:'6px', border:`1px solid ${brand.sand_color}22` }}>
          <NavList navLinks={navLinks} isActive={isActive} brand={brand} itemStyle={{ padding:'7px 18px', borderRadius:'22px', borderBottom:'none' }} />
        </div>
        <div className="tapas-hide-mobile" style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <IconsRow {...{ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder: header.search_placeholder }} />
          <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
        </div>
        <button className="tapas-show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', color:brand.sand_color, fontSize:'24px', cursor:'pointer' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <MobileMenu navLinks={navLinks} menuOpen={menuOpen} setMenuOpen={setMenuOpen} brand={brand} />
    </nav>
  );
}

// =====================================================================
// Template 9: Accent bar — classic + thick accent border along the top
// =====================================================================
function HeaderAccentBar(props) {
  const { brand, header, navLinks, isActive, member, handleLogout, wishlistCount, itemCount, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, menuOpen, setMenuOpen } = props;
  return (
    <nav style={{ ...baseNav(brand), borderTop:`4px solid ${brand.accent_color}` }}>
      <ResponsiveStyles />
      <div className="tapas-nav-wrap" style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'68px' }}>
        <Logo brand={brand} header={header} />
        <div className="tapas-hide-mobile"><NavList navLinks={navLinks} isActive={isActive} brand={brand} /></div>
        <div className="tapas-hide-mobile" style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <IconsRow {...{ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder: header.search_placeholder }} />
          <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
        </div>
        <button className="tapas-show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', color:brand.sand_color, fontSize:'24px', cursor:'pointer' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <MobileMenu navLinks={navLinks} menuOpen={menuOpen} setMenuOpen={setMenuOpen} brand={brand} />
    </nav>
  );
}

// =====================================================================
// Template 10: Announcement bar — thin marquee-style accent row + navbar
// =====================================================================
function HeaderAnnouncement(props) {
  const { brand, header, navLinks, isActive, member, handleLogout, wishlistCount, itemCount, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, menuOpen, setMenuOpen } = props;
  return (
    <nav style={baseNav(brand)}>
      <ResponsiveStyles />
      <div style={{ background:`linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})`, color:brand.primary_color, textAlign:'center', padding:'7px 20px', fontSize:'12px', fontWeight:'700', letterSpacing:'0.5px', textTransform:'uppercase' }}>
        ✨ Free pickup at the cafe · Handpicked books · Become a member for 20% off
      </div>
      <div className="tapas-nav-wrap" style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px' }}>
        <Logo brand={brand} header={header} />
        <div className="tapas-hide-mobile"><NavList navLinks={navLinks} isActive={isActive} brand={brand} /></div>
        <div className="tapas-hide-mobile" style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <IconsRow {...{ wishlistCount, itemCount, brand, searchOpen, setSearchOpen, searchTerm, setSearchTerm, handleSearch, placeholder: header.search_placeholder }} />
          <AuthActions member={member} header={header} brand={brand} handleLogout={handleLogout} />
        </div>
        <button className="tapas-show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', color:brand.sand_color, fontSize:'24px', cursor:'pointer' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <MobileMenu navLinks={navLinks} menuOpen={menuOpen} setMenuOpen={setMenuOpen} brand={brand} />
    </nav>
  );
}

// =====================================================================
// Exported registry + selector component
// =====================================================================
const TEMPLATES = {
  classic: HeaderClassic,
  centered: HeaderCentered,
  split: HeaderSplit,
  minimal: HeaderMinimal,
  search_forward: HeaderSearchForward,
  double_decker: HeaderDoubleDecker,
  transparent: HeaderTransparent,
  pill_nav: HeaderPillNav,
  accent_bar: HeaderAccentBar,
  announcement: HeaderAnnouncement,
};

export const HEADER_TEMPLATE_OPTIONS = [
  { value: 'classic',        label: '1. Classic (logo · nav · CTAs)' },
  { value: 'centered',       label: '2. Centered (2 rows, logo center)' },
  { value: 'split',          label: '3. Split (nav left · logo center)' },
  { value: 'minimal',        label: '4. Minimal (logo + single CTA)' },
  { value: 'search_forward', label: '5. Search-forward (big search bar)' },
  { value: 'double_decker',  label: '6. Double-decker (info strip + nav)' },
  { value: 'transparent',    label: '7. Transparent (overlays hero)' },
  { value: 'pill_nav',       label: '8. Pill nav (rounded container)' },
  { value: 'accent_bar',     label: '9. Accent bar (thick top border)' },
  { value: 'announcement',   label: '10. Announcement (marquee + nav)' },
];

export default function HeaderTemplate() {
  const state = useHeaderState();
  const template = state.header.template || 'classic';
  const Component = TEMPLATES[template] || HeaderClassic;
  const ss = state.content?.section_styles || {};

  // Transparent-over-hero nav: flip to opaque once the user scrolls past
  // a few px. Uses a body data attribute so we don't have to thread a
  // scrolled prop through every one of the 10 header templates.
  useEffect(() => {
    const onScroll = () => {
      document.body.dataset.navScrolled = window.scrollY > 24 ? 'true' : 'false';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cssOverrides = `
    ${ss.header_link_color ? `.tapas-header-root nav a { color: ${ss.header_link_color} !important; }` : ''}
    /* Transparent-at-top behaviour */
    body:not([data-nav-scrolled="true"]) .tapas-header-root > nav,
    body[data-nav-scrolled="false"] .tapas-header-root > nav {
      background: transparent !important;
      box-shadow: none !important;
      transition: background 220ms ease, box-shadow 220ms ease;
    }
    body[data-nav-scrolled="true"] .tapas-header-root > nav {
      transition: background 220ms ease, box-shadow 220ms ease;
    }
  `;
  return (
    <div className="tapas-header-root" style={{ display: 'contents' }}>
      <style>{cssOverrides}</style>
      <Component {...state} />
    </div>
  );
}
