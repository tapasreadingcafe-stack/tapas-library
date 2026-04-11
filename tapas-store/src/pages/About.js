import React, { useState } from 'react';

export default function About() {
  const [formData, setFormData] = useState({ name:'', email:'', phone:'', message:'' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production, integrate with email service (e.g. EmailJS, Formspree, Supabase edge function)
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setFormData({ name:'', email:'', phone:'', message:'' });
  };

  return (
    <div style={{ fontFamily:'Lato, sans-serif' }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg, #2C1810, #4A2C17)', padding:'70px 20px', textAlign:'center', color:'white' }}>
        <div style={{ maxWidth:'700px', margin:'0 auto' }}>
          <div style={{ fontSize:'56px', marginBottom:'16px' }}>📚</div>
          <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'52px', fontWeight:'800', color:'#F5DEB3', marginBottom:'16px' }}>
            About Tapas Library
          </h1>
          <p style={{ color:'rgba(245,222,179,0.8)', fontSize:'18px', lineHeight:'1.7' }}>
            A community space built on the love of books, learning, and bringing people together through stories.
          </p>
        </div>
      </div>

      {/* Story */}
      <section style={{ maxWidth:'1100px', margin:'0 auto', padding:'70px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'60px', alignItems:'center' }}>
          <div>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'38px', fontWeight:'700', color:'#2C1810', marginBottom:'20px' }}>
              Our Story
            </h2>
            <p style={{ color:'#5C3A1E', lineHeight:'1.8', fontSize:'16px', marginBottom:'16px' }}>
              Tapas Library was founded over a decade ago with a simple mission: to make books accessible to everyone in the community, regardless of their budget or background.
            </p>
            <p style={{ color:'#5C3A1E', lineHeight:'1.8', fontSize:'16px', marginBottom:'16px' }}>
              What started as a small room with 200 books has grown into a beloved neighbourhood institution with over 5,000 titles, 2,000 active members, and a thriving community of readers of all ages.
            </p>
            <p style={{ color:'#5C3A1E', lineHeight:'1.8', fontSize:'16px' }}>
              We believe in the transformative power of reading — and we're committed to fostering a lifelong love of books in every member of our community.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            {[
              { num:'5,000+', label:'Books', icon:'📚' },
              { num:'2,000+', label:'Members', icon:'👥' },
              { num:'10+', label:'Years', icon:'📅' },
              { num:'15+', label:'Genres', icon:'🎭' },
            ].map(s => (
              <div key={s.label} style={{ background:'linear-gradient(135deg, #FFF8ED, #FAEBD7)', borderRadius:'16px', padding:'24px', textAlign:'center', border:'2px solid rgba(212,168,83,0.2)' }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>{s.icon}</div>
                <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', fontWeight:'800', color:'#D4A853' }}>{s.num}</div>
                <div style={{ color:'#8B6914', fontSize:'14px', fontWeight:'600' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section style={{ background:'#FFF8ED', padding:'60px 20px' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', textAlign:'center', marginBottom:'40px' }}>
            Our Mission & Values
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'24px' }}>
            {[
              { icon:'🌍', title:'Accessibility', desc:'We believe great books should be available to everyone. Our membership fees are kept affordable to ensure no one is priced out of reading.' },
              { icon:'🤝', title:'Community', desc:'We\'re more than a library — we\'re a gathering place for book clubs, readings, and conversations that bring people together.' },
              { icon:'🌱', title:'Growth', desc:'We continuously expand our collection, listening to what our members want and staying ahead of new releases.' },
              { icon:'💡', title:'Learning', desc:'From children\'s story time to adult reading workshops, we support learning at every age and stage of life.' },
            ].map(v => (
              <div key={v.title} style={{ background:'white', borderRadius:'16px', padding:'28px', boxShadow:'0 4px 15px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:'40px', marginBottom:'16px' }}>{v.icon}</div>
                <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', color:'#2C1810', marginBottom:'12px' }}>{v.title}</h3>
                <p style={{ color:'#5C3A1E', lineHeight:'1.7', fontSize:'14px' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Opening Hours */}
      <section style={{ maxWidth:'1100px', margin:'0 auto', padding:'60px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'48px' }}>
          <div>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'28px' }}>
              🕐 Opening Hours
            </h2>
            <div style={{ background:'white', borderRadius:'16px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.07)' }}>
              {[
                { day:'Monday', time:'9:00 AM – 8:00 PM', open:true },
                { day:'Tuesday', time:'9:00 AM – 8:00 PM', open:true },
                { day:'Wednesday', time:'9:00 AM – 8:00 PM', open:true },
                { day:'Thursday', time:'9:00 AM – 8:00 PM', open:true },
                { day:'Friday', time:'9:00 AM – 8:00 PM', open:true },
                { day:'Saturday', time:'9:00 AM – 6:00 PM', open:true },
                { day:'Sunday', time:'10:00 AM – 4:00 PM', open:true },
              ].map((row, idx) => (
                <div key={row.day} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', background: idx % 2 === 0 ? '#FFF8ED' : 'white', borderBottom:'1px solid #F5DEB3' }}>
                  <span style={{ fontWeight:'600', color:'#2C1810' }}>{row.day}</span>
                  <span style={{ color:'#8B6914', fontSize:'14px' }}>{row.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'28px' }}>
              📍 Find Us
            </h2>
            <div style={{ background:'white', borderRadius:'16px', padding:'28px', boxShadow:'0 4px 15px rgba(0,0,0,0.07)', marginBottom:'20px' }}>
              {[
                { icon:'📍', label:'Address', value:'123 Library Lane, Booktown, Bengaluru – 560001' },
                { icon:'📞', label:'Phone', value:'+91 98765 43210' },
                { icon:'✉️', label:'Email', value:'hello@tapaslibrary.in' },
                { icon:'🌐', label:'Website', value:'www.tapaslibrary.in' },
              ].map(c => (
                <div key={c.label} style={{ display:'flex', gap:'14px', marginBottom:'20px', alignItems:'flex-start' }}>
                  <div style={{ fontSize:'24px', flexShrink:0 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>{c.label}</div>
                    <div style={{ color:'#2C1810', fontSize:'15px', fontWeight:'600' }}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Map Placeholder */}
            <div style={{ background:'linear-gradient(135deg, #F5DEB3, #D4A853)', borderRadius:'16px', height:'200px', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'8px' }}>
              <span style={{ fontSize:'40px' }}>🗺️</span>
              <span style={{ color:'#5C3A1E', fontWeight:'600' }}>123 Library Lane, Bengaluru</span>
              <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" style={{ color:'#2C1810', fontSize:'13px', fontWeight:'700', textDecoration:'none', border:'2px solid #2C1810', padding:'6px 16px', borderRadius:'20px', marginTop:'4px' }}>
                Open in Maps →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section style={{ background:'linear-gradient(135deg, #2C1810, #4A2C17)', padding:'60px 20px', color:'white' }}>
        <div style={{ maxWidth:'680px', margin:'0 auto' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#F5DEB3', textAlign:'center', marginBottom:'8px' }}>
            ✉️ Get In Touch
          </h2>
          <p style={{ color:'rgba(245,222,179,0.8)', textAlign:'center', marginBottom:'36px', fontSize:'16px' }}>
            Have a question, suggestion, or just want to say hello? We'd love to hear from you!
          </p>

          {sent && (
            <div style={{ background:'rgba(72,187,120,0.2)', border:'1px solid #48BB78', borderRadius:'12px', padding:'16px', textAlign:'center', marginBottom:'24px', color:'#48BB78', fontWeight:'600', fontSize:'16px' }}>
              ✅ Message sent! We'll get back to you within 24 hours.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <input
                placeholder="Your Name"
                required
                value={formData.name}
                onChange={e => setFormData(f => ({...f, name:e.target.value}))}
                style={{ padding:'14px 16px', borderRadius:'8px', border:'none', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif' }}
              />
              <input
                placeholder="Email Address"
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData(f => ({...f, email:e.target.value}))}
                style={{ padding:'14px 16px', borderRadius:'8px', border:'none', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif' }}
              />
            </div>
            <input
              placeholder="Phone Number (optional)"
              value={formData.phone}
              onChange={e => setFormData(f => ({...f, phone:e.target.value}))}
              style={{ padding:'14px 16px', borderRadius:'8px', border:'none', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif' }}
            />
            <textarea
              placeholder="Your message..."
              required
              rows={5}
              value={formData.message}
              onChange={e => setFormData(f => ({...f, message:e.target.value}))}
              style={{ padding:'14px 16px', borderRadius:'8px', border:'none', fontSize:'15px', outline:'none', resize:'vertical', fontFamily:'Lato, sans-serif' }}
            />
            <button type="submit" style={{
              padding:'16px', background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
              border:'none', borderRadius:'8px', fontWeight:'700', fontSize:'16px', cursor:'pointer', fontFamily:'Lato, sans-serif'
            }}>
              📨 Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Team */}
      <section style={{ maxWidth:'1100px', margin:'0 auto', padding:'60px 20px' }}>
        <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', textAlign:'center', marginBottom:'40px' }}>
          Meet Our Team
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'24px' }}>
          {[
            { name:'Lakshmi R.', role:'Head Librarian', icon:'👩‍💼', desc:'15 years of passion for books and community.' },
            { name:'Rajan P.', role:'Collections Manager', icon:'👨‍💻', desc:'Curating the perfect selection for all ages.' },
            { name:'Meera S.', role:'Children\'s Programs', icon:'👩‍🏫', desc:'Making reading magical for young minds.' },
            { name:'Arjun K.', role:'Member Relations', icon:'👨‍💼', desc:'Here to help with anything you need.' },
          ].map(tm => (
            <div key={tm.name} style={{ background:'white', borderRadius:'16px', padding:'28px', textAlign:'center', boxShadow:'0 4px 15px rgba(0,0,0,0.07)' }}>
              <div style={{ width:'70px', height:'70px', borderRadius:'50%', background:'linear-gradient(135deg, #D4A853, #C49040)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', margin:'0 auto 16px' }}>
                {tm.icon}
              </div>
              <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'18px', color:'#2C1810', marginBottom:'4px' }}>{tm.name}</h3>
              <div style={{ color:'#D4A853', fontSize:'13px', fontWeight:'600', marginBottom:'10px' }}>{tm.role}</div>
              <p style={{ color:'#8B6914', fontSize:'13px', lineHeight:'1.5' }}>{tm.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
