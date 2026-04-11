import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../context/SiteContent';

// =====================================================================
// Offers / Memberships — editorial treatment, Powell's-style.
// Dropped the fabricated "winter reading fest", "refer a friend" etc.
// Focus on real membership tiers and what makes each one worth it.
// Edit the PLANS array below when you launch new offers.
// =====================================================================

const PLANS = [
  {
    id: 'basic',
    tier: 'Basic',
    price: '₹300',
    period: '/month',
    tagline: 'For the occasional reader.',
    features: [
      '5 books borrowed at a time',
      '30-day borrowing period',
      'Access to the full collection',
      'Standard reservations',
    ],
    accent: '#8B6914',
  },
  {
    id: 'silver',
    tier: 'Silver',
    price: '₹500',
    period: '/month',
    tagline: 'Our most popular plan.',
    features: [
      '10 books borrowed at a time',
      '45-day borrowing period',
      'Priority reservations',
      '10% off every book purchase',
      'Early access to new arrivals',
      'Monthly reading newsletter',
    ],
    accent: '#2C1810',
    popular: true,
  },
  {
    id: 'gold',
    tier: 'Gold',
    price: '₹800',
    period: '/month',
    tagline: 'For the voracious reader.',
    features: [
      'Unlimited books at a time',
      '60-day borrowing period',
      '20% off every book purchase',
      'Free home delivery in Nagpur',
      '2 guest passes per month',
      'Members-only events',
    ],
    accent: '#D4A853',
  },
];

export default function Offers() {
  const content = useSiteContent();
  const brand = content.brand;
  const offers = content.offers;
  return (
    <div style={{ fontFamily:'var(--tapas-body-font, Lato), sans-serif', background:brand.cream_color }}>

      {/* Editorial hero */}
      <section style={{
        maxWidth:'780px', margin:'0 auto',
        padding:'80px 20px 40px', textAlign:'center',
      }}>
        <div style={{ fontSize:'11px', fontWeight:'800', color:brand.accent_color, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'16px' }}>
          {offers.hero_eyebrow}
        </div>
        <h1 style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'clamp(40px, 6vw, 64px)', fontWeight:'800', color:brand.primary_color, lineHeight:'1.05', marginBottom:'20px' }}>
          {offers.hero_headline_line1}<br />
          <span style={{ color:brand.accent_color, fontStyle:'italic' }}>{offers.hero_headline_line2}</span>
        </h1>
        <p style={{ color:'#8B6914', fontSize:'17px', lineHeight:'1.75', maxWidth:'580px', margin:'0 auto' }}>
          {offers.hero_description}
        </p>
      </section>

      {/* Plans */}
      <section style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 20px 80px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'24px', alignItems:'stretch' }}>
          {PLANS.map(plan => {
            const isPopular = plan.popular;
            const isGold = plan.id === 'gold';
            return (
              <div key={plan.id} style={{
                background: isPopular ? 'linear-gradient(135deg, #2C1810, #4A2C17)' : 'white',
                color:      isPopular ? '#F5DEB3' : '#2C1810',
                borderRadius:'12px',
                padding:'40px 32px 36px',
                position:'relative', overflow:'hidden',
                boxShadow: isPopular ? '0 20px 60px rgba(44,24,16,0.35)' : '0 6px 20px rgba(44,24,16,0.08)',
                transform: isPopular ? 'translateY(-8px)' : 'none',
                display:'flex', flexDirection:'column',
              }}>
                {isPopular && (
                  <div style={{
                    position:'absolute', top:'16px', right:'16px',
                    background:'#D4A853', color:'#2C1810',
                    fontSize:'10px', fontWeight:'800', padding:'4px 10px',
                    borderRadius:'20px', letterSpacing:'1.5px',
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize:'11px', fontWeight:'800', textTransform:'uppercase', letterSpacing:'2px', color: isPopular ? '#D4A853' : plan.accent, marginBottom:'10px' }}>
                  {plan.tier}
                </div>
                <p style={{ fontFamily:'"Playfair Display", serif', fontSize:'17px', fontStyle:'italic', color: isPopular ? 'rgba(245,222,179,0.75)' : '#8B6914', marginBottom:'24px' }}>
                  {plan.tagline}
                </p>
                <div style={{ marginBottom:'28px' }}>
                  <span style={{ fontSize:'52px', fontWeight:'800', color: isPopular ? '#F5DEB3' : '#2C1810', fontFamily:'"Playfair Display", serif' }}>
                    {plan.price}
                  </span>
                  <span style={{ color: isPopular ? 'rgba(245,222,179,0.7)' : '#8B6914', fontSize:'15px' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 32px 0', flex:1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display:'flex', gap:'12px', alignItems:'flex-start', marginBottom:'12px', fontSize:'14px', lineHeight:'1.5' }}>
                      <span style={{ color: isPopular ? '#D4A853' : plan.accent, fontWeight:'700', flexShrink:0 }}>✓</span>
                      <span style={{ color: isPopular ? 'rgba(245,222,179,0.9)' : '#5C3A1E' }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/login?mode=signup" style={{
                  display:'block', textAlign:'center', padding:'14px',
                  background: isPopular
                    ? 'linear-gradient(135deg, #D4A853, #C49040)'
                    : (isGold ? 'linear-gradient(135deg, #D4A853, #C49040)' : '#2C1810'),
                  color: isPopular ? '#2C1810' : (isGold ? '#2C1810' : '#F5DEB3'),
                  borderRadius:'50px', textDecoration:'none', fontWeight:'700', fontSize:'13px',
                  letterSpacing:'1px', textTransform:'uppercase',
                }}>
                  Choose {plan.tier} →
                </Link>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign:'center', color:'#8B6914', fontSize:'13px', marginTop:'40px', fontStyle:'italic' }}>
          All plans billed monthly. Cancel anytime. Pay cash, UPI, or card at the cafe.
        </p>
      </section>

      {/* Why join block */}
      <section style={{ background:'#FFF8ED', padding:'80px 20px', borderTop:'1px solid rgba(212,168,83,0.2)', borderBottom:'1px solid rgba(212,168,83,0.2)' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div style={{ fontSize:'11px', fontWeight:'800', color:'#D4A853', textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
              Why join
            </div>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'38px', fontWeight:'800', color:'#2C1810', lineHeight:'1.1' }}>
              What a membership actually buys you
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'32px' }}>
            {[
              { n:'01', t:'A curated catalog', b:'Our team handpicks every title. You skip the noise and find your next read faster.' },
              { n:'02', t:'A space to read', b:'Members can spend as long as they want in the cafe reading area, with filter coffee at member rates.' },
              { n:'03', t:'Real discounts', b:'Silver and Gold members get 10–20% off anything they buy, not just during sales.' },
              { n:'04', t:'Priority on new arrivals', b:'Flag books you want and members get reserved copies before walk-ins.' },
            ].map(item => (
              <div key={item.n}>
                <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', fontWeight:'800', color:'#D4A853', lineHeight:1, marginBottom:'10px' }}>
                  {item.n}
                </div>
                <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'18px', color:'#2C1810', marginBottom:'8px', fontWeight:'700' }}>
                  {item.t}
                </h3>
                <p style={{ color:'#5C3A1E', lineHeight:'1.7', fontSize:'14px', margin:0 }}>{item.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding:'80px 20px', textAlign:'center' }}>
        <div style={{ maxWidth:'580px', margin:'0 auto' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'800', color:'#2C1810', marginBottom:'16px', lineHeight:'1.15' }}>
            Ready to join?
          </h2>
          <p style={{ color:'#8B6914', fontSize:'15px', marginBottom:'32px', lineHeight:'1.6' }}>
            Sign up online, then drop by the cafe whenever you're ready to start borrowing.
          </p>
          <Link to="/login?mode=signup" style={{
            display:'inline-block',
            padding:'16px 40px', borderRadius:'50px',
            background:'linear-gradient(135deg, #2C1810, #4A2C17)',
            color:'#F5DEB3', textDecoration:'none',
            fontWeight:'700', fontSize:'14px', letterSpacing:'1px', textTransform:'uppercase',
            boxShadow:'0 8px 25px rgba(44,24,16,0.25)',
          }}>
            Create your account →
          </Link>
        </div>
      </section>
    </div>
  );
}
