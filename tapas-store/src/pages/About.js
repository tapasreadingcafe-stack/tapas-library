import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../context/SiteContent';

// =====================================================================
// About — editorial story + visit info + contact.
// Text and contact info come from the SiteContent context so staff can
// edit them in the dashboard.
// Modern Heritage design system.
// =====================================================================

export default function About() {
  const content = useSiteContent();
  
  const about = content.about;
  const contact = content.contact;
  const visibility = content.visibility || {};
  const styles = content.styles || {};
  const sectionStyles = content.section_styles || {};

  const bgOverlay = 'linear-gradient(135deg, rgba(38,23,12,0.92) 0%, rgba(61,43,31,0.85) 100%)';
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

      {/* Editorial hero — truffle gradient */}
      <section id="section-about-hero" data-editable-section="about" style={{
        background: resolveBg(
          sectionStyles.about_hero_bg_image,
          sectionStyles.about_hero_bg_color,
          about.hero_bg_image_url,
          'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)'
        ),
        color: '#fbfbe2', position: 'relative', overflow: 'hidden',
        paddingTop:    `${sectionStyles.about_hero_padding_top ?? 100}px`,
        paddingBottom: `${sectionStyles.about_hero_padding_bottom ?? 120}px`,
        paddingLeft: '20px', paddingRight: '20px',
      }}>
        <div style={{ position:'absolute', right:'-100px', top:'-60px', width:'380px', height:'380px', borderRadius:'50%', background:'radial-gradient(circle, rgba(196,144,64,0.08), transparent 70%)' }} />
        <div style={{ maxWidth:'780px', margin:'0 auto', position:'relative', zIndex:1, textAlign:'center' }}>
          <div data-editable="about.hero_eyebrow" style={{ fontSize:'11px', fontWeight:'700', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'3px', marginBottom:'16px', fontFamily:'var(--font-body)' }}>
            {about.hero_eyebrow}
          </div>
          <h1 style={{
            fontFamily:'var(--font-display)',
            fontSize: `clamp(32px, 6vw, ${styles.about_hero_headline_size || '64px'})`,
            fontWeight:'600', color:'#fbfbe2', lineHeight:'1.1', marginBottom:'24px',
            textAlign: styles.about_hero_headline_align || 'center',
          }}>
            <span data-editable="about.hero_headline_line1">{about.hero_headline_line1}</span><br />
            <span data-editable="about.hero_headline_line2" style={{ color:'var(--accent)', fontStyle:'italic' }}>{about.hero_headline_line2}</span>
          </h1>
          <p data-editable="about.hero_subtitle" style={{ color:'rgba(251,251,226,0.75)', fontSize:'18px', lineHeight:'1.8', maxWidth:'600px', margin:'0 auto', fontFamily:'var(--font-body)' }}>
            {about.hero_subtitle}
          </p>
        </div>
      </section>

      {/* Story body — bg-card with ambient shadow */}
      <section id="section-about-story" data-editable-section="about" style={{
        maxWidth:'720px', margin:'-60px auto 0',
        background:'var(--bg-card)',
        borderRadius:'var(--radius-2xl, 24px)',
        padding:'56px 48px',
        boxShadow:'var(--shadow-ambient, 0 8px 32px rgba(38,23,12,0.06))',
        position:'relative', zIndex:2,
      }}>
        <p data-editable="about.story_pull_quote" style={{
          color:'var(--text)', fontSize:'20px', lineHeight:'1.9', marginBottom:'28px',
          fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:'500',
        }}>
          "{about.story_pull_quote}"
        </p>
        <div style={{ width:'48px', height:'2px', background:'var(--accent)', marginBottom:'28px' }} />
        <p data-editable="about.story_body_1" style={{ color:'var(--text-muted)', fontSize:'16px', lineHeight:'1.85', marginBottom:'20px', whiteSpace:'pre-line', fontFamily:'var(--font-body)' }}>
          {about.story_body_1}
        </p>
        <p data-editable="about.story_body_2" style={{ color:'var(--text-muted)', fontSize:'16px', lineHeight:'1.85', marginBottom:'20px', whiteSpace:'pre-line', fontFamily:'var(--font-body)' }}>
          {about.story_body_2}
        </p>
        <p data-editable="about.story_body_3" style={{ color:'var(--text-muted)', fontSize:'16px', lineHeight:'1.85', whiteSpace:'pre-line', fontFamily:'var(--font-body)' }}>
          {about.story_body_3}
        </p>
      </section>

      {/* Values — numbered 01-04 in gold */}
      {visibility.about_values !== false && (
      <section id="section-about-values" style={{ maxWidth:'1100px', margin:'0 auto', padding:'100px 20px 60px' }}>
        <div style={{ textAlign:'center', marginBottom:'56px' }}>
          <div data-editable="about.values_eyebrow" style={{ fontSize:'11px', fontWeight:'700', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'3px', marginBottom:'12px', fontFamily:'var(--font-body)' }}>
            {about.values_eyebrow}
          </div>
          <h2 data-editable="about.values_heading" style={{
            fontFamily:'var(--font-display)',
            fontSize:'40px',
            fontWeight:'600',
            color:'var(--text)',
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
                <div style={{ flexShrink:0, fontFamily:'var(--font-display)', fontSize:'42px', fontWeight:'600', color:'var(--accent)', lineHeight:1, opacity:0.9 }}>
                  0{i}
                </div>
                <div>
                  <h3 data-editable={`about.values_${i}_title`} style={{ fontFamily:'var(--font-display)', fontSize:'20px', color:'var(--text)', marginBottom:'10px', fontWeight:'600' }}>
                    {title}
                  </h3>
                  <p data-editable={`about.values_${i}_body`} style={{ color:'var(--text-muted)', lineHeight:'1.75', fontSize:'15px', margin:0, fontFamily:'var(--font-body)' }}>{body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* Visit us — bg-section background */}
      {visibility.about_visit !== false && (
      <section id="section-about-visit" data-editable-section="contact" style={{ background:'var(--bg-section)', padding:'80px 20px' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'3px', marginBottom:'12px', fontFamily:'var(--font-body)' }}>
              Come say hello
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'40px', fontWeight:'600', color:'var(--text)', lineHeight:'1.1' }}>
              Visit us
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px' }} className="visit-grid">
            {/* Hours */}
            <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-2xl, 24px)', padding:'32px', boxShadow:'var(--shadow-ambient, 0 8px 32px rgba(38,23,12,0.06))' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'600' }}>
                Opening hours
              </h3>
              <div>
                {HOURS.map((row, idx) => (
                  <div key={row.day} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'12px 0',
                    background: idx % 2 === 0 ? 'transparent' : 'var(--bg-inset)',
                    borderRadius: idx % 2 !== 0 ? '8px' : '0',
                    paddingLeft: idx % 2 !== 0 ? '12px' : '0',
                    paddingRight: idx % 2 !== 0 ? '12px' : '0',
                  }}>
                    <span style={{ fontFamily:'var(--font-display)', color:'var(--text)', fontSize:'15px', fontWeight:'500' }}>{row.day}</span>
                    <span style={{ color:'var(--text-subtle)', fontSize:'14px', fontFamily:'var(--font-body)' }}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Find us */}
            <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-2xl, 24px)', padding:'32px', boxShadow:'var(--shadow-ambient, 0 8px 32px rgba(38,23,12,0.06))' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', marginBottom:'20px', fontWeight:'600' }}>
                Find us
              </h3>
              {[
                { label:'Address', value: contact.address },
                { label:'Phone',   value: contact.phone },
                { label:'Email',   value: contact.email },
              ].map(c => (
                <div key={c.label} style={{ marginBottom:'18px' }}>
                  <div style={{ fontSize:'10px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'4px', fontFamily:'var(--font-body)' }}>
                    {c.label}
                  </div>
                  <div style={{ color:'var(--text)', fontSize:'15px', fontWeight:'600', fontFamily:'var(--font-body)' }}>{c.value}</div>
                </div>
              ))}
              <Link to="/login?mode=signup" className="tps-btn tps-btn-teal" style={{ display:'inline-block', marginTop:'8px', textDecoration:'none' }}>
                Become a member
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

      {/* Contact form — tps-input bottom-line + tps-btn-teal */}
      {visibility.about_contact_form !== false && (
      <section style={{ maxWidth:'680px', margin:'0 auto', padding:'80px 20px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'3px', marginBottom:'12px', fontFamily:'var(--font-body)' }}>
            Get in touch
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:'600', color:'var(--text)', lineHeight:'1.1', marginBottom:'12px' }}>
            Have a question?
          </h2>
          <p style={{ color:'var(--text-subtle)', fontSize:'15px', lineHeight:'1.6', fontFamily:'var(--font-body)' }}>
            Looking for a book we don't have, want to host a reading, or just
            say hi? Drop us a line and we'll get back to you.
          </p>
        </div>

        {sent && (
          <div className="tps-chip tps-chip-teal" style={{ display:'block', width:'100%', padding:'16px', textAlign:'center', marginBottom:'24px', fontSize:'14px', fontWeight:'700', borderRadius:'var(--radius-lg, 16px)' }}>
            Thank you -- we got your message and will reply soon.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
            <div>
              <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Your Name</label>
              <input
                placeholder="Jane Doe" required
                value={formData.name}
                onChange={e => setFormData(f => ({...f, name:e.target.value}))}
                className="tps-input"
              />
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Email</label>
              <input
                placeholder="your@email.com" type="email" required
                value={formData.email}
                onChange={e => setFormData(f => ({...f, email:e.target.value}))}
                className="tps-input"
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Phone (optional)</label>
            <input
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={e => setFormData(f => ({...f, phone:e.target.value}))}
              className="tps-input"
            />
          </div>
          <div>
            <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Message</label>
            <textarea
              placeholder="What's on your mind?" required rows={5}
              value={formData.message}
              onChange={e => setFormData(f => ({...f, message:e.target.value}))}
              className="tps-input"
              style={{ resize:'vertical' }}
            />
          </div>
          <button type="submit" className="tps-btn tps-btn-teal tps-btn-lg">
            Send message
          </button>
        </form>
      </section>
      )}
    </div>
  );
}
