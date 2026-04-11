import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// =====================================================================
// About — editorial story + visit info + contact.
// Dropped the fabricated "meet the team" and fake stats from the old
// version — replace with real content when ready.
// =====================================================================

const HOURS = [
  { day:'Monday',    time:'9:00 AM – 8:00 PM' },
  { day:'Tuesday',   time:'9:00 AM – 8:00 PM' },
  { day:'Wednesday', time:'9:00 AM – 8:00 PM' },
  { day:'Thursday',  time:'9:00 AM – 8:00 PM' },
  { day:'Friday',    time:'9:00 AM – 8:00 PM' },
  { day:'Saturday',  time:'9:00 AM – 6:00 PM' },
  { day:'Sunday',    time:'10:00 AM – 4:00 PM' },
];

const VALUES = [
  { title:'Curated, not endless',   body:'We don\'t stock everything — we stock books our team has actually read and wants to recommend. That means less noise, better discoveries.' },
  { title:'Borrow or own',           body:'Every book on our shelves can either come home with you or be borrowed as a member. Reading shouldn\'t depend on your budget.' },
  { title:'A place to stay a while', body:'The café is part of the bookstore, not an afterthought. Come for a coffee, stay for a book, leave with both.' },
  { title:'Built on word of mouth',  body:'We opened because our neighbourhood asked for it. The best recommendations still come from members talking to members.' },
];

export default function About() {
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
    <div style={{ fontFamily:'Lato, sans-serif', background:'#FDF8F0' }}>

      {/* Editorial hero */}
      <section style={{ background:'linear-gradient(135deg, #2C1810 0%, #4A2C17 100%)', color:'#F5DEB3', padding:'100px 20px 120px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:'-100px', top:'-60px', width:'380px', height:'380px', borderRadius:'50%', background:'rgba(212,168,83,0.06)', border:'1px solid rgba(212,168,83,0.12)' }} />
        <div style={{ maxWidth:'780px', margin:'0 auto', position:'relative', zIndex:1, textAlign:'center' }}>
          <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'16px' }}>
            Our story
          </div>
          <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'clamp(40px, 6vw, 64px)', fontWeight:'800', color:'#F5DEB3', lineHeight:'1.1', marginBottom:'24px' }}>
            A room full of books<br />
            <span style={{ color:'#D4A853', fontStyle:'italic' }}>and a pot of coffee.</span>
          </h1>
          <p style={{ color:'rgba(245,222,179,0.82)', fontSize:'18px', lineHeight:'1.8', maxWidth:'600px', margin:'0 auto' }}>
            Tapas Reading Cafe started the way most good things do — a few
            shelves, a kettle, and people who wanted somewhere quiet to read.
          </p>
        </div>
      </section>

      {/* Story body */}
      <section style={{ maxWidth:'720px', margin:'-60px auto 0', background:'white', borderRadius:'8px', padding:'56px 48px', boxShadow:'0 20px 60px rgba(44,24,16,0.1)', position:'relative', zIndex:2 }}>
        <p style={{ color:'#5C3A1E', fontSize:'18px', lineHeight:'1.9', marginBottom:'20px', fontFamily:'"Playfair Display", serif', fontStyle:'italic' }}>
          "We wanted a reading room that didn't feel like a library rulebook."
        </p>
        <p style={{ color:'#5C3A1E', fontSize:'16px', lineHeight:'1.85', marginBottom:'20px' }}>
          Before Tapas, the nearest bookstore in our part of the neighbourhood
          was a forty-minute bus ride away, and the library closed too early for
          anyone who worked. So we opened a small space with a couple hundred
          books, a single espresso machine, and a long table for anyone who
          wanted to linger.
        </p>
        <p style={{ color:'#5C3A1E', fontSize:'16px', lineHeight:'1.85', marginBottom:'20px' }}>
          The collection grew the way friendships do — one recommendation at
          a time. A member brought in a Booker winner they'd loved; we ordered
          two more. A regular asked for picture books for their daughter;
          we started a kids' shelf. Ten years later, most of what you'll find
          on our shelves arrived because someone, somewhere, asked for it.
        </p>
        <p style={{ color:'#5C3A1E', fontSize:'16px', lineHeight:'1.85' }}>
          We're still that room with a kettle. Just a lot more books.
        </p>
      </section>

      {/* Values */}
      <section style={{ maxWidth:'1100px', margin:'0 auto', padding:'100px 20px 60px' }}>
        <div style={{ textAlign:'center', marginBottom:'56px' }}>
          <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
            What we believe
          </div>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'40px', fontWeight:'800', color:'#2C1810', lineHeight:'1.1' }}>
            Four things we care about
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'32px' }}>
          {VALUES.map((v, i) => (
            <div key={v.title} style={{ display:'flex', gap:'20px' }}>
              <div style={{ flexShrink:0, fontFamily:'"Playfair Display", serif', fontSize:'42px', fontWeight:'800', color:'#D4A853', lineHeight:1 }}>
                0{i + 1}
              </div>
              <div>
                <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', color:'#2C1810', marginBottom:'10px', fontWeight:'700' }}>
                  {v.title}
                </h3>
                <p style={{ color:'#5C3A1E', lineHeight:'1.75', fontSize:'15px', margin:0 }}>{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visit us — hours + contact */}
      <section style={{ background:'#FFF8ED', padding:'80px 20px', borderTop:'1px solid rgba(212,168,83,0.2)', borderBottom:'1px solid rgba(212,168,83,0.2)' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
              Come say hello
            </div>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'40px', fontWeight:'800', color:'#2C1810', lineHeight:'1.1' }}>
              Visit us
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px' }} className="visit-grid">
            {/* Hours */}
            <div style={{ background:'white', borderRadius:'8px', padding:'32px', boxShadow:'0 4px 20px rgba(44,24,16,0.06)' }}>
              <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', color:'#2C1810', marginBottom:'20px', fontWeight:'700' }}>
                🕐 Opening hours
              </h3>
              <div>
                {HOURS.map((row, idx) => (
                  <div key={row.day} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'12px 0',
                    borderBottom: idx === HOURS.length - 1 ? 'none' : '1px solid #F5DEB3',
                  }}>
                    <span style={{ fontFamily:'"Playfair Display", serif', color:'#2C1810', fontSize:'15px', fontWeight:'600' }}>{row.day}</span>
                    <span style={{ color:'#8B6914', fontSize:'14px' }}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Find us */}
            <div style={{ background:'white', borderRadius:'8px', padding:'32px', boxShadow:'0 4px 20px rgba(44,24,16,0.06)' }}>
              <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', color:'#2C1810', marginBottom:'20px', fontWeight:'700' }}>
                📍 Find us
              </h3>
              {[
                { label:'Address', value:'Tapas Reading Cafe, Nagpur, Maharashtra' },
                { label:'Phone',   value:'+91 98765 43210' },
                { label:'Email',   value:'tapasreadingcafe@gmail.com' },
              ].map(c => (
                <div key={c.label} style={{ marginBottom:'18px' }}>
                  <div style={{ fontSize:'10px', fontWeight:'800', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'4px' }}>
                    {c.label}
                  </div>
                  <div style={{ color:'#2C1810', fontSize:'15px', fontWeight:'600' }}>{c.value}</div>
                </div>
              ))}
              <Link to="/login?mode=signup" style={{
                display:'inline-block', marginTop:'8px',
                padding:'12px 24px', borderRadius:'50px',
                background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
                textDecoration:'none', fontWeight:'700', fontSize:'13px',
                letterSpacing:'0.5px', textTransform:'uppercase',
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

      {/* Contact form */}
      <section style={{ maxWidth:'680px', margin:'0 auto', padding:'80px 20px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
            Get in touch
          </div>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'800', color:'#2C1810', lineHeight:'1.1', marginBottom:'12px' }}>
            Have a question?
          </h2>
          <p style={{ color:'#8B6914', fontSize:'15px', lineHeight:'1.6' }}>
            Looking for a book we don't have, want to host a reading, or just
            say hi? Drop us a line and we'll get back to you.
          </p>
        </div>

        {sent && (
          <div style={{ background:'rgba(72,187,120,0.12)', border:'1px solid #48BB78', borderRadius:'8px', padding:'16px', textAlign:'center', marginBottom:'24px', color:'#276749', fontWeight:'700', fontSize:'14px' }}>
            ✅ Thank you — we got your message and will reply soon.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
            <input
              placeholder="Your name" required
              value={formData.name}
              onChange={e => setFormData(f => ({...f, name:e.target.value}))}
              style={{ padding:'14px 18px', border:'1px solid rgba(212,168,83,0.4)', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', background:'white' }}
            />
            <input
              placeholder="Email" type="email" required
              value={formData.email}
              onChange={e => setFormData(f => ({...f, email:e.target.value}))}
              style={{ padding:'14px 18px', border:'1px solid rgba(212,168,83,0.4)', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', background:'white' }}
            />
          </div>
          <input
            placeholder="Phone (optional)"
            value={formData.phone}
            onChange={e => setFormData(f => ({...f, phone:e.target.value}))}
            style={{ padding:'14px 18px', border:'1px solid rgba(212,168,83,0.4)', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', background:'white' }}
          />
          <textarea
            placeholder="What's on your mind?" required rows={5}
            value={formData.message}
            onChange={e => setFormData(f => ({...f, message:e.target.value}))}
            style={{ padding:'14px 18px', border:'1px solid rgba(212,168,83,0.4)', borderRadius:'8px', fontSize:'15px', outline:'none', resize:'vertical', fontFamily:'Lato, sans-serif', background:'white' }}
          />
          <button type="submit" style={{
            padding:'16px', background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3',
            border:'none', borderRadius:'50px', fontWeight:'700', fontSize:'14px', cursor:'pointer',
            fontFamily:'Lato, sans-serif', letterSpacing:'1px', textTransform:'uppercase',
            boxShadow:'0 6px 20px rgba(44,24,16,0.25)',
          }}>
            Send message
          </button>
        </form>
      </section>
    </div>
  );
}
