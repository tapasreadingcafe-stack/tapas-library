import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../context/SiteContent';

// =====================================================================
// FooterTemplates — 10 swappable footer layouts.
//
// All templates read from SiteContent: brand, footer, contact, header.
// Responsive via inline <style> with .tapas-foot-* class toggles.
//
//   1  classic      4 columns: brand / links / hours / contact
//   2  minimal      one row: logo · links · copyright
//   3  big_visit    huge Visit us block with map link
//   4  newsletter   subscribe form top, links below
//   5  centered     single narrow centered column
//   6  two_column   brand+contact left, links right
//   7  dark_gold    black bg with gold accents
//   8  three_column brand / links / hours+contact
//   9  social_first big social row above links
//   10 map_embed    real Google Maps iframe + contact
// =====================================================================

function useFooterState() {
  const content = useSiteContent();
  const ss = content.section_styles || {};
  // Apply per-section overrides by merging them into the brand colors
  // that footer templates read. Empty string = keep brand default.
  const brand = {
    ...content.brand,
    // Footer bg overrides brand primary_color_dark only for the footer.
    primary_color_dark: ss.footer_bg_color || content.brand?.primary_color_dark,
    // Footer body text color overrides sand_color (if set).
    sand_color: ss.footer_text_color || content.brand?.sand_color,
    // Heading color overrides accent (if set).
    accent_color: ss.footer_heading_color || content.brand?.accent_color,
  };
  return {
    content,
    brand,
    footer: content.footer || {},
    contact: content.contact || {},
    header: content.header || {},
    // Raw section style map for additional tweaks (alignment, link color)
    sectionStyles: ss,
  };
}

function FooterResponsiveStyles() {
  return (
    <style>{`
      @media (max-width: 768px) {
        .tapas-foot-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        .tapas-foot-row { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
        .tapas-foot-center-mobile { text-align: center !important; }
      }
    `}</style>
  );
}

function quickLinks(header) {
  return [
    [header.nav_home   || 'Home',   '/'],
    [header.nav_books  || 'Books',  '/books'],
    [header.nav_offers || 'Offers', '/offers'],
    [header.nav_blog   || 'Journal', '/blog'],
    [header.nav_about  || 'About',  '/about'],
    [header.login_label || 'Login', '/login'],
  ];
}

// =====================================================================
// F1 Classic 4-column
// =====================================================================
function FooterClassic({ brand, footer, contact, header }) {
  return (
    <footer style={{ background:brand.primary_color_dark, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <FooterResponsiveStyles />
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'50px 20px 30px' }}>
        <div className="tapas-foot-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'40px', marginBottom:'40px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <span style={{ fontSize:'32px' }}>{header.logo_emoji || '📚'}</span>
              <div>
                <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'20px', fontWeight:'700' }}>{brand.name}</div>
                <div style={{ color:brand.accent_color, fontSize:'12px', letterSpacing:'2px' }}>{brand.tagline}</div>
              </div>
            </div>
            <p style={{ color:'#A0856A', fontSize:'14px', lineHeight:'1.6' }}>{footer.tagline}</p>
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'16px', marginBottom:'16px' }}>{footer.quick_links_heading || 'Quick Links'}</h4>
            {quickLinks(header).map(([label, to]) => (
              <div key={to} style={{ marginBottom:'10px' }}>
                <Link to={to} style={{ color:'#A0856A', textDecoration:'none', fontSize:'14px' }}>{label}</Link>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'16px', marginBottom:'16px' }}>{footer.hours_heading || 'Opening Hours'}</h4>
            {[['Mon – Fri', contact.hours_weekdays],['Saturday', contact.hours_saturday],['Sunday', contact.hours_sunday]].map(([day, time]) => (
              <div key={day} style={{ marginBottom:'10px' }}>
                <div style={{ color:brand.sand_color, fontSize:'13px', fontWeight:'600' }}>{day}</div>
                <div style={{ color:'#A0856A', fontSize:'13px' }}>{time}</div>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'16px', marginBottom:'16px' }}>{footer.contact_heading || 'Contact'}</h4>
            {[['📍', contact.address],['📞', contact.phone],['✉️', contact.email]].map(([icon, text]) => (
              <div key={text} style={{ display:'flex', gap:'10px', marginBottom:'12px', alignItems:'flex-start' }}>
                <span>{icon}</span>
                <span style={{ color:'#A0856A', fontSize:'13px' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'20px', textAlign:'center', color:'#A0856A', fontSize:'13px' }}>
          © {new Date().getFullYear()} {brand.name} {brand.tagline}. {footer.copyright_text || 'All rights reserved.'}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F2 Minimal one-row
// =====================================================================
function FooterMinimal({ brand, footer, header }) {
  return (
    <footer style={{ background:brand.primary_color_dark, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <FooterResponsiveStyles />
      <div className="tapas-foot-row" style={{ maxWidth:'1200px', margin:'0 auto', padding:'28px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'22px' }}>{header.logo_emoji || '📚'}</span>
          <span style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'16px', fontWeight:'700' }}>{brand.name}</span>
        </div>
        <div style={{ display:'flex', gap:'20px' }}>
          {quickLinks(header).slice(0, 4).map(([label, to]) => (
            <Link key={to} to={to} style={{ color:'#A0856A', textDecoration:'none', fontSize:'13px' }}>{label}</Link>
          ))}
        </div>
        <div style={{ color:'#A0856A', fontSize:'12px' }}>
          © {new Date().getFullYear()} {brand.name}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F3 Big Visit Us
// =====================================================================
function FooterBigVisit({ brand, footer, contact, header }) {
  return (
    <footer style={{ background:`linear-gradient(135deg, ${brand.primary_color_dark} 0%, ${brand.primary_color} 100%)`, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <FooterResponsiveStyles />
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'70px 20px 40px', textAlign:'center' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>📍</div>
        <h2 style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'40px', fontWeight:'800', color:brand.sand_color, marginBottom:'14px', lineHeight:'1.1' }}>
          Come visit us
        </h2>
        <p style={{ color:'rgba(245,222,179,0.8)', fontSize:'18px', maxWidth:'520px', margin:'0 auto 28px', lineHeight:'1.6' }}>
          {contact.address}
        </p>
        <div style={{ display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap', marginBottom:'40px' }}>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(contact.address || '')}`} target="_blank" rel="noreferrer" style={{
            background:`linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})`, color:brand.primary_color,
            textDecoration:'none', padding:'14px 32px', borderRadius:'50px',
            fontWeight:'700', fontSize:'14px', letterSpacing:'0.5px',
          }}>📍 Open in Maps</a>
          <a href={`tel:${contact.phone?.replace(/\s/g, '')}`} style={{
            border:`2px solid ${brand.sand_color}66`, color:brand.sand_color,
            textDecoration:'none', padding:'14px 32px', borderRadius:'50px',
            fontWeight:'700', fontSize:'14px',
          }}>📞 {contact.phone}</a>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.12)', paddingTop:'20px', color:'#A0856A', fontSize:'13px' }}>
          © {new Date().getFullYear()} {brand.name} {brand.tagline}. {footer.copyright_text}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F4 Newsletter first
// =====================================================================
function FooterNewsletterFirst({ brand, footer, contact, header }) {
  return (
    <footer style={{ background:brand.primary_color_dark, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <FooterResponsiveStyles />
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'60px 20px 30px' }}>
        {/* Newsletter strip */}
        <div style={{ background:`${brand.accent_color}11`, border:`1px solid ${brand.accent_color}33`, borderRadius:'16px', padding:'32px', marginBottom:'40px', textAlign:'center' }}>
          <h3 style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'26px', fontWeight:'700', color:brand.sand_color, marginBottom:'8px' }}>
            Stay in the loop
          </h3>
          <p style={{ color:'rgba(245,222,179,0.7)', fontSize:'14px', marginBottom:'20px' }}>
            Weekly reading list, staff picks, cafe events — straight to your inbox.
          </p>
          <form style={{ display:'flex', gap:'8px', maxWidth:'440px', margin:'0 auto', flexWrap:'wrap', justifyContent:'center' }} onSubmit={e => e.preventDefault()}>
            <input type="email" placeholder="your@email.com"
              style={{ flex:'1 1 220px', padding:'12px 18px', borderRadius:'50px', border:'none', background:'rgba(255,255,255,0.08)', color:brand.sand_color, fontSize:'14px', outline:'none', minWidth:0 }} />
            <button type="submit" style={{
              padding:'12px 26px', borderRadius:'50px', border:'none',
              background:`linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})`, color:brand.primary_color,
              fontWeight:'700', fontSize:'13px', cursor:'pointer',
            }}>Subscribe</button>
          </form>
        </div>
        <div className="tapas-foot-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'32px', marginBottom:'28px' }}>
          <div>
            <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'18px', fontWeight:'700', marginBottom:'6px' }}>{brand.name}</div>
            <p style={{ color:'#A0856A', fontSize:'13px', lineHeight:'1.6' }}>{footer.tagline}</p>
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontSize:'14px', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'1px' }}>Links</h4>
            {quickLinks(header).map(([label, to]) => (
              <div key={to} style={{ marginBottom:'8px' }}>
                <Link to={to} style={{ color:'#A0856A', textDecoration:'none', fontSize:'13px' }}>{label}</Link>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontSize:'14px', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'1px' }}>Visit</h4>
            <div style={{ color:'#A0856A', fontSize:'13px', lineHeight:'1.7' }}>
              {contact.address}<br/>
              {contact.phone}<br/>
              {contact.email}
            </div>
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'18px', textAlign:'center', color:'#A0856A', fontSize:'12px' }}>
          © {new Date().getFullYear()} {brand.name} {brand.tagline}. {footer.copyright_text}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F5 Centered compact
// =====================================================================
function FooterCentered({ brand, footer, contact, header }) {
  return (
    <footer style={{ background:brand.primary_color_dark, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <div style={{ maxWidth:'600px', margin:'0 auto', padding:'48px 20px 28px', textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'10px' }}>{header.logo_emoji || '📚'}</div>
        <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'22px', fontWeight:'700', marginBottom:'4px' }}>{brand.name}</div>
        <div style={{ color:brand.accent_color, fontSize:'12px', letterSpacing:'2px', marginBottom:'20px' }}>{brand.tagline}</div>
        <p style={{ color:'#A0856A', fontSize:'14px', lineHeight:'1.6', marginBottom:'24px', maxWidth:'460px', margin:'0 auto 24px' }}>{footer.tagline}</p>
        <div style={{ display:'flex', gap:'24px', justifyContent:'center', flexWrap:'wrap', marginBottom:'24px' }}>
          {quickLinks(header).map(([label, to]) => (
            <Link key={to} to={to} style={{ color:brand.sand_color, textDecoration:'none', fontSize:'13px', fontWeight:'600' }}>{label}</Link>
          ))}
        </div>
        <div style={{ color:'#A0856A', fontSize:'12px', marginBottom:'16px' }}>
          {contact.address} · {contact.phone} · {contact.email}
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'18px', color:'#A0856A', fontSize:'12px' }}>
          © {new Date().getFullYear()} {brand.name}. {footer.copyright_text}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F6 Two-column
// =====================================================================
function FooterTwoColumn({ brand, footer, contact, header }) {
  return (
    <footer style={{ background:brand.primary_color_dark, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <FooterResponsiveStyles />
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'50px 20px 30px' }}>
        <div className="tapas-foot-grid" style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:'60px', marginBottom:'40px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <span style={{ fontSize:'32px' }}>{header.logo_emoji || '📚'}</span>
              <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'22px', fontWeight:'700' }}>{brand.name}</div>
            </div>
            <p style={{ color:'#A0856A', fontSize:'14px', lineHeight:'1.7', marginBottom:'20px', maxWidth:'440px' }}>{footer.tagline}</p>
            <div style={{ color:'#A0856A', fontSize:'13px', lineHeight:'1.8' }}>
              📍 {contact.address}<br/>
              📞 {contact.phone}<br/>
              ✉️ {contact.email}
            </div>
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'16px', marginBottom:'14px' }}>{footer.quick_links_heading || 'Quick Links'}</h4>
            {quickLinks(header).map(([label, to]) => (
              <div key={to} style={{ marginBottom:'10px' }}>
                <Link to={to} style={{ color:'#A0856A', textDecoration:'none', fontSize:'14px' }}>{label}</Link>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'18px', textAlign:'center', color:'#A0856A', fontSize:'12px' }}>
          © {new Date().getFullYear()} {brand.name} {brand.tagline}. {footer.copyright_text}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F7 Dark gold — heavy black background, gold borders
// =====================================================================
function FooterDarkGold({ brand, footer, contact, header }) {
  return (
    <footer style={{ background:'#0B0705', color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px', borderTop:`2px solid ${brand.accent_color}` }}>
      <FooterResponsiveStyles />
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'60px 20px 30px' }}>
        <div className="tapas-foot-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'40px', marginBottom:'32px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <span style={{ fontSize:'32px', color:brand.accent_color }}>{header.logo_emoji || '📚'}</span>
              <div>
                <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'20px', fontWeight:'700', color:brand.accent_color }}>{brand.name}</div>
                <div style={{ color:brand.sand_color, fontSize:'11px', letterSpacing:'3px' }}>{brand.tagline}</div>
              </div>
            </div>
            <p style={{ color:'#8A7A5E', fontSize:'13px', lineHeight:'1.6' }}>{footer.tagline}</p>
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontSize:'13px', marginBottom:'14px', textTransform:'uppercase', letterSpacing:'2px' }}>Navigate</h4>
            {quickLinks(header).map(([label, to]) => (
              <div key={to} style={{ marginBottom:'10px' }}>
                <Link to={to} style={{ color:'#8A7A5E', textDecoration:'none', fontSize:'13px' }}>{label}</Link>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontSize:'13px', marginBottom:'14px', textTransform:'uppercase', letterSpacing:'2px' }}>Hours</h4>
            <div style={{ color:'#8A7A5E', fontSize:'13px', lineHeight:'1.9' }}>
              Mon–Fri {contact.hours_weekdays}<br/>
              Sat {contact.hours_saturday}<br/>
              Sun {contact.hours_sunday}
            </div>
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontSize:'13px', marginBottom:'14px', textTransform:'uppercase', letterSpacing:'2px' }}>Contact</h4>
            <div style={{ color:'#8A7A5E', fontSize:'13px', lineHeight:'1.9' }}>
              {contact.address}<br/>
              {contact.phone}<br/>
              {contact.email}
            </div>
          </div>
        </div>
        <div style={{ borderTop:`1px solid ${brand.accent_color}22`, paddingTop:'20px', textAlign:'center', color:'#8A7A5E', fontSize:'12px', letterSpacing:'1px' }}>
          © {new Date().getFullYear()} {brand.name}. {footer.copyright_text}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F8 Three-column — brand / links / hours+contact
// =====================================================================
function FooterThreeColumn({ brand, footer, contact, header }) {
  return (
    <footer style={{ background:brand.primary_color_dark, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <FooterResponsiveStyles />
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'50px 20px 30px' }}>
        <div className="tapas-foot-grid" style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1.3fr', gap:'48px', marginBottom:'32px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
              <span style={{ fontSize:'28px' }}>{header.logo_emoji || '📚'}</span>
              <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'20px', fontWeight:'700' }}>{brand.name}</div>
            </div>
            <p style={{ color:'#A0856A', fontSize:'13px', lineHeight:'1.6' }}>{footer.tagline}</p>
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'15px', marginBottom:'14px' }}>{footer.quick_links_heading || 'Quick Links'}</h4>
            {quickLinks(header).map(([label, to]) => (
              <div key={to} style={{ marginBottom:'8px' }}><Link to={to} style={{ color:'#A0856A', textDecoration:'none', fontSize:'13px' }}>{label}</Link></div>
            ))}
          </div>
          <div>
            <h4 style={{ color:brand.accent_color, fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'15px', marginBottom:'14px' }}>Visit & Contact</h4>
            <div style={{ color:'#A0856A', fontSize:'13px', lineHeight:'1.9', marginBottom:'10px' }}>
              📍 {contact.address}<br/>
              📞 {contact.phone}<br/>
              ✉️ {contact.email}
            </div>
            <div style={{ color:'#8A7A5E', fontSize:'12px', lineHeight:'1.6', paddingTop:'10px', borderTop:`1px solid ${brand.sand_color}22` }}>
              Mon–Fri {contact.hours_weekdays}<br/>
              Sat {contact.hours_saturday} · Sun {contact.hours_sunday}
            </div>
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'18px', textAlign:'center', color:'#A0856A', fontSize:'12px' }}>
          © {new Date().getFullYear()} {brand.name}. {footer.copyright_text}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F9 Social-first — big row of contact/action pills at the top
// =====================================================================
function FooterSocialFirst({ brand, footer, contact, header }) {
  return (
    <footer style={{ background:brand.primary_color_dark, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <FooterResponsiveStyles />
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'54px 20px 30px', textAlign:'center' }}>
        <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'26px', color:brand.sand_color, marginBottom:'8px' }}>{brand.name}</div>
        <div style={{ color:brand.accent_color, fontSize:'11px', letterSpacing:'3px', marginBottom:'30px' }}>{brand.tagline}</div>

        {/* Action pills */}
        <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginBottom:'36px' }}>
          {[
            { icon:'📞', label:contact.phone, href:`tel:${contact.phone?.replace(/\s/g, '')}` },
            { icon:'✉️', label:contact.email, href:`mailto:${contact.email}` },
            { icon:'📍', label:'Open in Maps', href:`https://maps.google.com/?q=${encodeURIComponent(contact.address || '')}`, target:'_blank' },
          ].map(b => (
            <a key={b.label} href={b.href} target={b.target} rel={b.target ? 'noreferrer' : undefined} style={{
              display:'inline-flex', alignItems:'center', gap:'10px',
              padding:'12px 22px', borderRadius:'50px',
              border:`1px solid ${brand.sand_color}33`, background:`${brand.accent_color}11`,
              color:brand.sand_color, textDecoration:'none', fontSize:'13px', fontWeight:'600',
            }}>{b.icon} {b.label}</a>
          ))}
        </div>

        <div style={{ display:'flex', gap:'24px', justifyContent:'center', flexWrap:'wrap', marginBottom:'24px' }}>
          {quickLinks(header).map(([label, to]) => (
            <Link key={to} to={to} style={{ color:'#A0856A', textDecoration:'none', fontSize:'13px' }}>{label}</Link>
          ))}
        </div>

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'18px', color:'#8A7A5E', fontSize:'12px' }}>
          © {new Date().getFullYear()} {brand.name}. {footer.copyright_text}
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// F10 Map embed
// =====================================================================
function FooterMapEmbed({ brand, footer, contact, header }) {
  const mapQ = encodeURIComponent(contact.address || 'Nagpur, India');
  return (
    <footer style={{ background:brand.primary_color_dark, color:brand.sand_color, fontFamily:'var(--tapas-body-font, Lato), sans-serif', marginTop:'60px' }}>
      <FooterResponsiveStyles />
      <div className="tapas-foot-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', maxWidth:'1300px', margin:'0 auto' }}>
        <iframe
          title="Tapas Reading Cafe location"
          src={`https://www.google.com/maps?q=${mapQ}&output=embed`}
          style={{ width:'100%', minHeight:'320px', border:'none', filter:'grayscale(0.4) contrast(0.95) brightness(0.85)' }}
          loading="lazy"
        />
        <div style={{ padding:'50px 40px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
            <span style={{ fontSize:'28px' }}>{header.logo_emoji || '📚'}</span>
            <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'22px', fontWeight:'700' }}>{brand.name}</div>
          </div>
          <p style={{ color:'#A0856A', fontSize:'14px', lineHeight:'1.6', marginBottom:'24px' }}>{footer.tagline}</p>

          <div style={{ color:'#A0856A', fontSize:'13px', lineHeight:'1.9', marginBottom:'24px' }}>
            📍 {contact.address}<br/>
            📞 {contact.phone}<br/>
            ✉️ {contact.email}<br/>
            🕐 Mon–Fri {contact.hours_weekdays}
          </div>

          <div style={{ display:'flex', gap:'18px', flexWrap:'wrap', marginBottom:'18px' }}>
            {quickLinks(header).slice(0, 4).map(([label, to]) => (
              <Link key={to} to={to} style={{ color:brand.accent_color, textDecoration:'none', fontSize:'13px', fontWeight:'600' }}>{label} →</Link>
            ))}
          </div>

          <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'14px', color:'#8A7A5E', fontSize:'11px' }}>
            © {new Date().getFullYear()} {brand.name}. {footer.copyright_text}
          </div>
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// Registry + default
// =====================================================================
const TEMPLATES = {
  classic:          FooterClassic,
  minimal:          FooterMinimal,
  big_visit:        FooterBigVisit,
  newsletter_first: FooterNewsletterFirst,
  centered:         FooterCentered,
  two_column:       FooterTwoColumn,
  dark_gold:        FooterDarkGold,
  three_column:     FooterThreeColumn,
  social_first:     FooterSocialFirst,
  map_embed:        FooterMapEmbed,
};

export const FOOTER_TEMPLATE_OPTIONS = [
  { value: 'classic',          label: '1. Classic (4 columns)' },
  { value: 'minimal',          label: '2. Minimal (single row)' },
  { value: 'big_visit',        label: '3. Big visit (address focus)' },
  { value: 'newsletter_first', label: '4. Newsletter first (subscribe strip)' },
  { value: 'centered',         label: '5. Centered column' },
  { value: 'two_column',       label: '6. Two-column (brand + links)' },
  { value: 'dark_gold',        label: '7. Dark + gold accents' },
  { value: 'three_column',     label: '8. Three-column compact' },
  { value: 'social_first',     label: '9. Social / contact pills top' },
  { value: 'map_embed',        label: '10. Map embed (Google Maps)' },
];

export default function FooterTemplate() {
  const state = useFooterState();
  const template = state.footer.template || 'classic';
  const Component = TEMPLATES[template] || FooterClassic;
  const ss = state.sectionStyles || {};
  // Section-level CSS overrides applied to the whole footer block. This
  // layers on top of the inline styles each template uses, using high
  // specificity + !important so it always wins.
  const cssOverrides = `
    .tapas-footer-root { text-align: ${ss.footer_text_align || 'left'} !important; }
    ${ss.footer_text_align === 'center' ? '.tapas-footer-root .tapas-foot-grid > div { text-align: center; }' : ''}
    ${ss.footer_link_color ? `.tapas-footer-root a { color: ${ss.footer_link_color} !important; }` : ''}
  `;
  return (
    <div className="tapas-footer-root">
      <style>{cssOverrides}</style>
      <Component {...state} />
    </div>
  );
}
