import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../context/SiteContent';

// =====================================================================
// About — editorial story + visit info + contact.
// Text and contact info come from the SiteContent context so staff can
// edit them in the dashboard.
// =====================================================================

export default function About() {
  const content = useSiteContent();
  const brand = content.brand;
  const about = content.about;
  const contact = content.contact;
  const visibility = content.visibility || {};
  const styles = content.styles || {};
  const sectionStyles = content.section_styles || {};

  const bgOverlay = 'linear-gradient(135deg, rgba(44,24,16,0.85) 0%, rgba(74,44,23,0.75) 100%)';
  const resolveBg = (imgUrl, solidColor, fallbackImgUrl, defaultBg) => {
    if (imgUrl) return `${bgOverlay}, url("${imgUrl}") center/cover`;
    if (solidColor) return solidColor;
    if (fallbackImgUrl) return `${bgOverlay}, url("${fallbackImgUrl}") center/cover`;
    return defaultBg;
  };

  const HOURS = [
    { day:'Monday',    time: contact.hours_weekdays },
    { day:'Tuesday',   time: contact.hours_weekdays },
    { day:'Wednesday', time: contact.hours_weekdays },
    { day:'Thursday',  time: contact.hours_weekdays },
    { day:'Friday',    time: contact.hours_weekdays },
    { day:'Saturday',  time: contact.hours_saturday },
    { day:'Sunday',    time: contact.hours_sunday },
  ];

  const [formData, setFormData] = useState({ name:'', email:'', phone:'', message:'' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Wire this to a Supabase edge function or Formspree later.
    setSent(true);
    setTimeout(() => setSent(false), 5000);
    setFormData({ name:'', email:'', phone:'', message:'' });
  };

  return (
    <div style={{ fontFamily:'var(--font-body)', background:'var(--bg)', color:'var(--text)' }}>

      {/* Editorial hero */}
      <section id="section-about-hero" data-editable-section="about" style={{
        background: resolveBg(
          sectionStyles.about_hero_bg_image,
          sectionStyles.about_hero_bg_color,
          about.hero_bg_image_url,
          `linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.primary_color_light} 100%)`
        ),
        color: brand.sand_color, position: 'relative', overflow: 'hidden',
        paddingTop:    `${sectionStyles.about_hero_padding_top ?? 100}px`,
        paddingBottom: `${sectionStyles.about_hero_padding_bottom ?? 120}px`,
        paddingLeft: '20px', paddingRight: '20px',
      }}>
        <div style={{ position:'absolute', right:'-100px', top:'-60px', width:'380px', height:'380px', borderRadius:'50%', background:'rgba(212,168,83,0.06)', border:'1px solid rgba(212,168,83,0.12)' }} />
        <div style={{ maxWidth:'780px', margin:'0 auto', position:'relative', zIndex:1, textAlign:'center' }}>
          <div data-editable="about.hero_eyebrow" style={{ fontSize:'11px', fontWeight:'800', color:brand.accent_color, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'16px' }}>
            {about.hero_eyebrow}
          </div>
          <h1 style={{
            fontFamily:'var(--font-heading)',
            fontSize: `clamp(32px, 6vw, ${styles.about_hero_headline_size || 'var(--tapas-h-xxl-size, 64px)'})`,
            fontWeight:'var(--tapas-h-weight, 800)', color:brand.sand_color, lineHeight:'1.1', marginBottom:'24px',
            textAlign: styles.about_hero_headline_align || 'center',
          }}>
            <span data-editable="about.hero_headline_line1">{about.hero_headline_line1}</span><br />
            <span data-editable="about.hero_headline_line2" style={{ color:brand.accent_color, fontStyle:'italic' }}>{about.hero_headline_line2}</span>
          </h1>
          <p data-editable="about.hero_subtitle" style={{ color:'rgba(245,222,179,0.82)', fontSize:'18px', lineHeight:'1.8', maxWidth:'600px', margin:'0 auto' }}>
            {about.hero_subtitle}
          </p>
        </div>
      </section>

      {/* Story body */}
      <section id="section-about-story" data-editable-section="about" style={{ maxWidth:'720px', margin:'-60px auto 0', background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'56px 48px', boxShadow:'var(--shadow-xl)', position:'relative', zIndex:2 }}>
        <p data-editable="about.story_pull_quote" style={{ color:'var(--text-muted)', fontSize:'18px', lineHeight:'1.9', marginBottom:'20px', fontFamily:'var(--font-heading)', fontStyle:'italic' }}>
          "{about.story_pull_quote}"
        </p>
        <p data-editable="about.story_body_1" style={{ color:'var(--text-muted)', fontSize:'16px', lineHeight:'1.85', marginBottom:'20px', whiteSpace:'pre-line' }}>
          {about.story_body_1}
        </p>
        <p data-editable="about.story_body_2" style={{ color:'var(--text-muted)', fontSize:'16px', lineHeight:'1.85', marginBottom:'20px', whiteSpace:'pre-line' }}>
          {about.story_body_2}
        </p>
        <p data-editable="about.story_body_3" style={{ color:'var(--text-muted)', fontSize:'16px', lineHeight:'1.85', whiteSpace:'pre-line' }}>
          {about.story_body_3}
        </p>
      </section>

      {/* Values */}
      {visibility.about_values !== false && (
      <section id="section-about-values" style={{ maxWidth:'1100px', margin:'0 auto', padding:'100px 20px 60px' }}>
        <div style={{ textAlign:'center', marginBottom:'56px' }}>
          <div data-editable="about.values_eyebrow" style={{ fontSize:'11px', fontWeight:'800', color:brand.accent_color, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
            {about.values_eyebrow}
          </div>
          <h2 data-editable="about.values_heading" style={{
            fontFamily:'var(--font-heading)',
            fontSize:'var(--tapas-h-xl-size, 40px)',
            fontWeight:'var(--tapas-h-weight, 800)',
            color:'var(--tapas-h-color, #2C1810)',
            lineHeight:'1.1'
          }}>
            {about.values_heading}
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'32px' }}>
          {[1, 2, 3, 4].map(i => {
            const title = about[`values_${i}_title`];
            const body  = about[`values_${i}_body`];
            return (
              <div key={i} style={{ display:'flex', gap:'20px' }}>
                <div style={{ flexShrink:0, fontFamily:'var(--font-heading)', fontSize:'42px', fontWeight:'800', color:brand.accent_color, lineHeight:1 }}>
                  0{i}
                </div>
                <div>
                  <h3 data-editable={`about.values_${i}_title`} style={{ fontFamily:'var(--font-heading)', fontSize:'20px', color:brand.primary_color, marginBottom:'10px', fontWeight:'700' }}>
                    {title}
                  </h3>
                  <p data-editable={`about.values_${i}_body`} style={{ color:'var(--text-muted)', lineHeight:'1.75', fontSize:'15px', margin:0 }}>{body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* Visit us — hours + contact */}
      {visibility.about_visit !== false && (
      <section id="section-about-visit" data-editable-section="contact" style={{ background:'var(--bg-subtle)', padding:'80px 20px', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
              Come say hello
            </div>
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'40px', fontWeight:'800', color:'var(--text)', lineHeight:'1.1' }}>
              Visit us
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px' }} className="visit-grid">
            {/* Hours */}
            <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'32px', boxShadow:'var(--shadow-sm)' }}>
              <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'700' }}>
                🕐 Opening hours
              </h3>
              <div>
                {HOURS.map((row, idx) => (
                  <div key={row.day} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'12px 0',
                    borderBottom: idx === HOURS.length - 1 ? 'none' : '1px solid #F5DEB3',
                  }}>
                    <span style={{ fontFamily:'var(--font-heading)', color:'var(--text)', fontSize:'15px', fontWeight:'600' }}>{row.day}</span>
                    <span style={{ color:'var(--text-subtle)', fontSize:'14px' }}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Find us */}
            <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'32px', boxShadow:'var(--shadow-sm)' }}>
              <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'700' }}>
                📍 Find us
              </h3>
              {[
                { label:'Address', value: contact.address },
                { label:'Phone',   value: contact.phone },
                { label:'Email',   value: contact.email },
              ].map(c => (
                <div key={c.label} style={{ marginBottom:'18px' }}>
                  <div style={{ fontSize:'10px', fontWeight:'800', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'4px' }}>
                    {c.label}
                  </div>
                  <div style={{ color:'var(--text)', fontSize:'15px', fontWeight:'600' }}>{c.value}</div>
                </div>
              ))}
              <Link to="/login?mode=signup" style={{
                display:'inline-block', marginTop:'8px',
                padding:'var(--tapas-btn-padding, 12px 24px)',
                borderRadius:'var(--tapas-btn-radius, 50px)',
                background:`linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})`, color:brand.primary_color,
                textDecoration:'none',
                fontWeight:'var(--tapas-btn-font-weight, 700)',
                fontSize:'var(--tapas-btn-font-size, 13px)',
                letterSpacing:'var(--tapas-btn-letter-spacing, 0.5px)',
                textTransform:'var(--tapas-btn-text-transform, uppercase)',
              }}>
                Become a member →
              </Link>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 720px) {
            .visit-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>
      )}

      {/* Contact form */}
      {visibility.about_contact_form !== false && (
      <section style={{ maxWidth:'680px', margin:'0 auto', padding:'80px 20px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
            Get in touch
          </div>
          <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'36px', fontWeight:'800', color:'var(--text)', lineHeight:'1.1', marginBottom:'12px' }}>
            Have a question?
          </h2>
          <p style={{ color:'var(--text-subtle)', fontSize:'15px', lineHeight:'1.6' }}>
            Looking for a book we don't have, want to host a reading, or just
            say hi? Drop us a line and we'll get back to you.
          </p>
        </div>

        {sent && (
          <div style={{ background:'rgba(72,187,120,0.12)', border:'1px solid #48BB78', borderRadius:'var(--radius-lg)', padding:'16px', textAlign:'center', marginBottom:'24px', color:'#276749', fontWeight:'700', fontSize:'14px' }}>
            ✅ Thank you — we got your message and will reply soon.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
            <input
              placeholder="Your name" required
              value={formData.name}
              onChange={e => setFormData(f => ({...f, name:e.target.value}))}
              style={{ padding:'14px 18px', border:'1.5px solid var(--border)', borderRadius:'var(--radius-lg)', fontSize:'15px', outline:'none', fontFamily:'var(--font-body)', background:'var(--surface)' }}
            />
            <input
              placeholder="Email" type="email" required
              value={formData.email}
              onChange={e => setFormData(f => ({...f, email:e.target.value}))}
              style={{ padding:'14px 18px', border:'1.5px solid var(--border)', borderRadius:'var(--radius-lg)', fontSize:'15px', outline:'none', fontFamily:'var(--font-body)', background:'var(--surface)' }}
            />
          </div>
          <input
            placeholder="Phone (optional)"
            value={formData.phone}
            onChange={e => setFormData(f => ({...f, phone:e.target.value}))}
            style={{ padding:'14px 18px', border:'1.5px solid var(--border)', borderRadius:'var(--radius-lg)', fontSize:'15px', outline:'none', fontFamily:'var(--font-body)', background:'var(--surface)' }}
          />
          <textarea
            placeholder="What's on your mind?" required rows={5}
            value={formData.message}
            onChange={e => setFormData(f => ({...f, message:e.target.value}))}
            style={{ padding:'14px 18px', border:'1.5px solid var(--border)', borderRadius:'var(--radius-lg)', fontSize:'15px', outline:'none', resize:'vertical', fontFamily:'var(--font-body)', background:'var(--surface)' }}
          />
          <button type="submit" style={{
            padding:'var(--tapas-btn-padding, 16px 32px)',
            background:`linear-gradient(135deg, ${brand.primary_color}, ${brand.primary_color_light})`, color:brand.sand_color,
            border:'none',
            borderRadius:'var(--tapas-btn-radius, 50px)',
            fontWeight:'var(--tapas-btn-font-weight, 700)',
            fontSize:'var(--tapas-btn-font-size, 14px)',
            cursor:'pointer',
            fontFamily:'var(--font-body)',
            letterSpacing:'var(--tapas-btn-letter-spacing, 1px)',
            textTransform:'var(--tapas-btn-text-transform, uppercase)',
            boxShadow:'0 6px 20px rgba(44,24,16,0.25)',
          }}>
            Send message
          </button>
        </form>
      </section>
      )}
    </div>
  );
}
