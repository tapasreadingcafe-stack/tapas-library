import React from 'react';
import { Link } from 'react-router-dom';

const PLANS = [
  {
    tier: 'Basic',
    price: '₹300',
    period: '/month',
    color: '#8B6914',
    bg: 'white',
    border: '#D4A853',
    features: [
      '5 books borrowed at a time',
      '30-day borrowing period',
      'Standard access to all genres',
      'Email support',
      'Online reservation (1 at a time)',
    ],
  },
  {
    tier: 'Silver',
    price: '₹500',
    period: '/month',
    color: 'white',
    bg: 'linear-gradient(135deg, #2C1810, #5C3A1E)',
    border: 'transparent',
    popular: true,
    features: [
      '10 books borrowed at a time',
      '45-day borrowing period',
      'Priority reservations',
      'Phone & email support',
      '10% off all book purchases',
      'Early access to new arrivals',
      'Monthly reading newsletter',
    ],
  },
  {
    tier: 'Gold',
    price: '₹800',
    period: '/month',
    color: '#2C1810',
    bg: 'linear-gradient(135deg, #D4A853, #C49040)',
    border: 'transparent',
    features: [
      'Unlimited books at a time',
      '60-day borrowing period',
      'Highest priority reservations',
      'Dedicated phone support',
      '20% off all book purchases',
      'Earliest access to new books',
      'Monthly curated box',
      '2 guest passes/month',
      'Free home delivery',
    ],
  },
];

const OFFERS = [
  { icon:'🎉', title:'New Member Welcome', desc:'Get your first month free when you join Silver or Gold membership.', validity:'Valid until Dec 31, 2024', tag:'NEW MEMBER' },
  { icon:'📚', title:'Read 5 Get 1 Free', desc:'Borrow 5 books and get your 6th borrow absolutely free. No catch!', validity:'Ongoing offer', tag:'LOYALTY' },
  { icon:'👨‍👩‍👧‍👦', title:'Family Bundle', desc:'Add up to 4 family members under one account at 40% off individual prices.', validity:'Valid until Jan 31, 2025', tag:'FAMILY' },
  { icon:'🎓', title:'Student Discount', desc:'Students get 30% off any membership with valid college ID.', validity:'Year-round offer', tag:'STUDENT' },
  { icon:'🎄', title:'Winter Reading Fest', desc:'Buy ₹500 worth of books and get a ₹100 voucher for your next visit.', validity:'Dec 1–31, 2024', tag:'SEASONAL' },
  { icon:'🌟', title:'Refer a Friend', desc:'Refer a friend who joins — you both get 1 month free on your membership.', validity:'Ongoing', tag:'REFERRAL' },
];

export default function Offers() {
  return (
    <div style={{ fontFamily:'Lato, sans-serif' }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg, #2C1810, #4A2C17)', padding:'60px 20px', textAlign:'center', color:'white' }}>
        <div style={{ maxWidth:'700px', margin:'0 auto' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px' }}>🎁</div>
          <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'48px', fontWeight:'800', color:'#F5DEB3', marginBottom:'16px' }}>
            Special Offers
          </h1>
          <p style={{ color:'rgba(245,222,179,0.8)', fontSize:'18px', lineHeight:'1.6' }}>
            Incredible deals crafted for book lovers. Save more, read more!
          </p>
        </div>
      </div>

      {/* Current Offers */}
      <section style={{ maxWidth:'1200px', margin:'0 auto', padding:'60px 20px' }}>
        <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', textAlign:'center', marginBottom:'8px' }}>
          Current Promotions
        </h2>
        <p style={{ color:'#8B6914', textAlign:'center', marginBottom:'40px' }}>Limited time offers — grab them before they're gone!</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'24px' }}>
          {OFFERS.map(offer => (
            <div key={offer.title} style={{ background:'white', borderRadius:'16px', padding:'28px', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', position:'relative', overflow:'hidden', transition:'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 35px rgba(0,0,0,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)'; }}
            >
              <div style={{ position:'absolute', top:'16px', right:'16px', background:'#D4A853', color:'#2C1810', fontSize:'10px', fontWeight:'800', padding:'4px 10px', borderRadius:'10px', letterSpacing:'1px' }}>
                {offer.tag}
              </div>
              <div style={{ fontSize:'40px', marginBottom:'16px' }}>{offer.icon}</div>
              <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', fontWeight:'700', color:'#2C1810', marginBottom:'10px' }}>{offer.title}</h3>
              <p style={{ color:'#5C3A1E', lineHeight:'1.6', marginBottom:'16px', fontSize:'15px' }}>{offer.desc}</p>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'#8B6914', fontSize:'13px' }}>
                <span>🗓</span> {offer.validity}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Membership Plans */}
      <section style={{ background:'#FFF8ED', padding:'60px 20px' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', textAlign:'center', marginBottom:'8px' }}>
            Membership Plans
          </h2>
          <p style={{ color:'#8B6914', textAlign:'center', marginBottom:'48px' }}>Choose the plan that fits your reading lifestyle</p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'24px', alignItems:'start' }}>
            {PLANS.map(plan => (
              <div key={plan.tier} style={{
                background: plan.bg, borderRadius:'20px', padding:'36px',
                border: plan.popular ? 'none' : `2px solid ${plan.border}`,
                boxShadow: plan.popular ? '0 16px 50px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.07)',
                transform: plan.popular ? 'scale(1.03)' : 'scale(1)',
                position:'relative', overflow:'hidden'
              }}>
                {plan.popular && (
                  <div style={{ position:'absolute', top:'0', left:'0', right:'0', background:'#D4A853', color:'#2C1810', textAlign:'center', padding:'8px', fontSize:'12px', fontWeight:'800', letterSpacing:'2px' }}>
                    ⭐ MOST POPULAR
                  </div>
                )}
                <div style={{ marginTop: plan.popular ? '24px' : '0' }}>
                  <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', fontWeight:'700', color: plan.color, marginBottom:'8px' }}>
                    {plan.tier}
                  </h3>
                  <div style={{ marginBottom:'24px' }}>
                    <span style={{ fontSize:'44px', fontWeight:'800', color: plan.color, fontFamily:'"Playfair Display", serif' }}>{plan.price}</span>
                    <span style={{ color: plan.color, opacity:0.7, fontSize:'16px' }}>{plan.period}</span>
                  </div>
                  <div style={{ marginBottom:'28px' }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display:'flex', gap:'10px', alignItems:'flex-start', marginBottom:'10px' }}>
                        <span style={{ color:'#D4A853', fontWeight:'700', flexShrink:0 }}>✓</span>
                        <span style={{ color: plan.color, opacity:0.9, fontSize:'14px', lineHeight:'1.4' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/login" style={{
                    display:'block', textAlign:'center', padding:'14px',
                    background: plan.popular ? '#D4A853' : plan.tier === 'Gold' ? '#2C1810' : 'linear-gradient(135deg, #D4A853, #C49040)',
                    color: plan.popular ? '#2C1810' : plan.tier === 'Gold' ? 'white' : '#2C1810',
                    borderRadius:'50px', textDecoration:'none', fontWeight:'700', fontSize:'16px'
                  }}>
                    Get {plan.tier} Plan →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section style={{ maxWidth:'900px', margin:'0 auto', padding:'60px 20px' }}>
        <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'32px', fontWeight:'700', color:'#2C1810', textAlign:'center', marginBottom:'32px' }}>
          Quick Comparison
        </h2>
        <div style={{ background:'white', borderRadius:'16px', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
            <thead>
              <tr style={{ background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'white' }}>
                <th style={{ padding:'16px', textAlign:'left', fontFamily:'"Playfair Display", serif', fontSize:'16px' }}>Feature</th>
                {PLANS.map(p => <th key={p.tier} style={{ padding:'16px', textAlign:'center', fontFamily:'"Playfair Display", serif', fontSize:'16px', color:'#F5DEB3' }}>{p.tier}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Books at a time', '5', '10', 'Unlimited'],
                ['Borrowing period', '30 days', '45 days', '60 days'],
                ['Reservations', '1', '3', 'Unlimited'],
                ['Book discount', '—', '10%', '20%'],
                ['Home delivery', '—', '—', '✓'],
                ['Guest passes', '—', '—', '2/month'],
                ['Priority access', '—', '✓', '✓'],
              ].map(([feature, basic, silver, gold], idx) => (
                <tr key={feature} style={{ background: idx % 2 === 0 ? '#FFF8ED' : 'white' }}>
                  <td style={{ padding:'14px 16px', fontWeight:'600', color:'#2C1810' }}>{feature}</td>
                  <td style={{ padding:'14px 16px', textAlign:'center', color:'#8B6914' }}>{basic}</td>
                  <td style={{ padding:'14px 16px', textAlign:'center', color:'#2C1810', fontWeight:silver !== '—' ? '600' : '400' }}>{silver}</td>
                  <td style={{ padding:'14px 16px', textAlign:'center', color:'#D4A853', fontWeight:gold !== '—' ? '700' : '400' }}>{gold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background:'linear-gradient(135deg, #D4A853, #C49040)', padding:'50px 20px', textAlign:'center' }}>
        <div style={{ maxWidth:'600px', margin:'0 auto' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'32px', fontWeight:'700', color:'#2C1810', marginBottom:'12px' }}>
            Ready to Start Reading?
          </h2>
          <p style={{ color:'#5C3A1E', fontSize:'16px', marginBottom:'28px' }}>Join thousands of happy members at Tapas Library today.</p>
          <Link to="/login" style={{ background:'#2C1810', color:'#F5DEB3', textDecoration:'none', padding:'16px 40px', borderRadius:'50px', fontWeight:'700', fontSize:'18px', display:'inline-block', boxShadow:'0 8px 25px rgba(44,24,16,0.3)' }}>
            Join Now — First Month Free!
          </Link>
        </div>
      </section>
    </div>
  );
}
