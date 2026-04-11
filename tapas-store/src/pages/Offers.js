import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../context/SiteContent';

// =====================================================================
// Offers / Memberships — all text now editable from the dashboard.
// Plan tiers, features, headlines — everything reads from SiteContent.
// =====================================================================

function splitFeatures(text) {
  return (text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function buildPlans(plans) {
  return [
    {
      id: 'basic',
      tier:    plans.basic_tier,
      price:   plans.basic_price,
      period:  plans.basic_period,
      tagline: plans.basic_tagline,
      features: splitFeatures(plans.basic_features),
      accent: '#8B6914',
    },
    {
      id: 'silver',
      tier:    plans.silver_tier,
      price:   plans.silver_price,
      period:  plans.silver_period,
      tagline: plans.silver_tagline,
      features: splitFeatures(plans.silver_features),
      accent: '#2C1810',
      popular: true,
    },
    {
      id: 'gold',
      tier:    plans.gold_tier,
      price:   plans.gold_price,
      period:  plans.gold_period,
      tagline: plans.gold_tagline,
      features: splitFeatures(plans.gold_features),
      accent: '#D4A853',
    },
  ];
}

export default function Offers() {
  const content = useSiteContent();
  const brand = content.brand;
  const offers = content.offers;
  const plans = content.plans || {};
  const visibility = content.visibility || {};
  const styles = content.styles || {};
  const sectionStyles = content.section_styles || {};
  const PLANS = buildPlans(plans);

  const bgOverlay = 'linear-gradient(135deg, rgba(44,24,16,0.85) 0%, rgba(74,44,23,0.75) 100%)';
  const heroBg = sectionStyles.offers_hero_bg_image
    ? `${bgOverlay}, url("${sectionStyles.offers_hero_bg_image}") center/cover`
    : (sectionStyles.offers_hero_bg_color || 'transparent');

  return (
    <div style={{ fontFamily:'var(--tapas-body-font, Lato), sans-serif', background:brand.cream_color }}>

      {/* Editorial hero */}
      <section id="section-offers-hero" data-editable-section="offers" style={{
        maxWidth: sectionStyles.offers_hero_bg_image || sectionStyles.offers_hero_bg_color ? '100%' : '780px',
        margin:'0 auto',
        padding:`${sectionStyles.offers_hero_padding_top ?? 80}px 20px ${sectionStyles.offers_hero_padding_bottom ?? 40}px`,
        textAlign:'center',
        background: heroBg,
        color: (sectionStyles.offers_hero_bg_image || sectionStyles.offers_hero_bg_color) ? brand.sand_color : undefined,
      }}>
      <div style={{ maxWidth:'780px', margin:'0 auto' }}>
        <div data-editable="offers.hero_eyebrow" style={{ fontSize:'11px', fontWeight:'800', color:brand.accent_color, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'16px' }}>
          {offers.hero_eyebrow}
        </div>
        <h1 style={{
          fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif',
          fontSize: `clamp(32px, 6vw, ${styles.offers_hero_headline_size || 'var(--tapas-h-xxl-size, 64px)'})`,
          fontWeight:'var(--tapas-h-weight, 800)',
          color: (sectionStyles.offers_hero_bg_image || sectionStyles.offers_hero_bg_color) ? brand.sand_color : brand.primary_color,
          lineHeight:'1.05', marginBottom:'20px',
          textAlign: styles.offers_hero_headline_align || 'center',
        }}>
          <span data-editable="offers.hero_headline_line1">{offers.hero_headline_line1}</span><br />
          <span data-editable="offers.hero_headline_line2" style={{ color:brand.accent_color, fontStyle:'italic' }}>{offers.hero_headline_line2}</span>
        </h1>
        <p data-editable="offers.hero_description" style={{
          color: (sectionStyles.offers_hero_bg_image || sectionStyles.offers_hero_bg_color) ? 'rgba(245,222,179,0.85)' : '#8B6914',
          fontSize:'17px', lineHeight:'1.75', maxWidth:'580px', margin:'0 auto'
        }}>
          {offers.hero_description}
        </p>
      </div>
      </section>

      {/* Plans */}
      {visibility.offers_plans !== false && (
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
                  display:'block', textAlign:'center',
                  padding:'var(--tapas-btn-padding, 14px)',
                  background: isPopular
                    ? `linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})`
                    : (isGold ? `linear-gradient(135deg, ${brand.accent_color}, ${brand.accent_color_dark})` : brand.primary_color),
                  color: isPopular ? brand.primary_color : (isGold ? brand.primary_color : brand.sand_color),
                  borderRadius:'var(--tapas-btn-radius, 50px)',
                  textDecoration:'none',
                  fontWeight:'var(--tapas-btn-font-weight, 700)',
                  fontSize:'var(--tapas-btn-font-size, 13px)',
                  letterSpacing:'var(--tapas-btn-letter-spacing, 1px)',
                  textTransform:'var(--tapas-btn-text-transform, uppercase)',
                }}>
                  Choose {plan.tier} →
                </Link>
              </div>
            );
          })}
        </div>

        <p data-editable="offers.plans_footer" style={{ textAlign:'center', color:'#8B6914', fontSize:'13px', marginTop:'40px', fontStyle:'italic' }}>
          {offers.plans_footer}
        </p>
      </section>
      )}

      {/* Why join block */}
      {visibility.offers_why_join !== false && (
      <section id="section-offers-why-join" style={{ background:'#FFF8ED', padding:'80px 20px', borderTop:'1px solid rgba(212,168,83,0.2)', borderBottom:'1px solid rgba(212,168,83,0.2)' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div data-editable="offers.why_join_eyebrow" style={{ fontSize:'11px', fontWeight:'800', color:brand.accent_color, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>
              {offers.why_join_eyebrow}
            </div>
            <h2 data-editable="offers.why_join_heading" style={{
              fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif',
              fontSize:'var(--tapas-h-xl-size, 38px)',
              fontWeight:'var(--tapas-h-weight, 800)',
              color:'var(--tapas-h-color, #2C1810)',
              lineHeight:'1.1'
            }}>
              {offers.why_join_heading}
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'32px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <div style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'28px', fontWeight:'800', color:brand.accent_color, lineHeight:1, marginBottom:'10px' }}>
                  0{i}
                </div>
                <h3 data-editable={`offers.why_join_${i}_title`} style={{ fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif', fontSize:'18px', color:brand.primary_color, marginBottom:'8px', fontWeight:'700' }}>
                  {offers[`why_join_${i}_title`]}
                </h3>
                <p data-editable={`offers.why_join_${i}_body`} style={{ color:'#5C3A1E', lineHeight:'1.7', fontSize:'14px', margin:0 }}>
                  {offers[`why_join_${i}_body`]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Final CTA */}
      {visibility.offers_cta !== false && (
      <section id="section-offers-cta" style={{ padding:'80px 20px', textAlign:'center' }}>
        <div style={{ maxWidth:'580px', margin:'0 auto' }}>
          <h2 data-editable="offers.cta_headline" style={{
            fontFamily:'var(--tapas-heading-font, "Playfair Display"), serif',
            fontSize:'var(--tapas-h-l-size, 36px)',
            fontWeight:'var(--tapas-h-weight, 800)',
            color:'var(--tapas-h-color, #2C1810)',
            marginBottom:'16px', lineHeight:'1.15'
          }}>
            {offers.cta_headline}
          </h2>
          <p data-editable="offers.cta_body" style={{ color:'#8B6914', fontSize:'15px', marginBottom:'32px', lineHeight:'1.6' }}>
            {offers.cta_body}
          </p>
          <Link to="/login?mode=signup" style={{
            display:'inline-block',
            padding:'var(--tapas-btn-padding, 16px 40px)',
            borderRadius:'var(--tapas-btn-radius, 50px)',
            background:`linear-gradient(135deg, ${brand.primary_color}, ${brand.primary_color_light})`,
            color:brand.sand_color, textDecoration:'none',
            fontWeight:'var(--tapas-btn-font-weight, 700)',
            fontSize:'var(--tapas-btn-font-size, 14px)',
            letterSpacing:'var(--tapas-btn-letter-spacing, 1px)',
            textTransform:'var(--tapas-btn-text-transform, uppercase)',
            boxShadow:'0 8px 25px rgba(44,24,16,0.25)',
          }}>
            Create your account →
          </Link>
        </div>
      </section>
      )}
    </div>
  );
}
