import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../context/SiteContent';
import PageRenderer from '../blocks/PageRenderer';
import { findPageByPath, NotFound } from '../utils/findPage';

// =====================================================================
// Offers / Memberships — all text now editable from the dashboard.
// Plan tiers, features, headlines — everything reads from SiteContent.
// Modern Heritage design system.
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
    },
    {
      id: 'silver',
      tier:    plans.silver_tier,
      price:   plans.silver_price,
      period:  plans.silver_period,
      tagline: plans.silver_tagline,
      features: splitFeatures(plans.silver_features),
      popular: true,
    },
    {
      id: 'gold',
      tier:    plans.gold_tier,
      price:   plans.gold_price,
      period:  plans.gold_period,
      tagline: plans.gold_tagline,
      features: splitFeatures(plans.gold_features),
    },
  ];
}

export default function Offers() {
  const content = useSiteContent();
  const matchKey = findPageByPath(content?.pages, '/offers');
  if (matchKey) {
    const blocks = content.pages[matchKey].blocks;
    if (Array.isArray(blocks) && blocks.length > 0) {
      return <PageRenderer pageKey={matchKey} />;
    }
    if (matchKey === 'offers') return <LegacyOffers />;
    return null;
  }
  return <NotFound path="/offers" />;
}

function LegacyOffers() {
  const content = useSiteContent();

  const offers = content.offers;
  const plans = content.plans || {};
  const visibility = content.visibility || {};
  const styles = content.styles || {};
  const sectionStyles = content.section_styles || {};
  const PLANS = buildPlans(plans);

  const bgOverlay = 'linear-gradient(135deg, rgba(38,23,12,0.92) 0%, rgba(61,43,31,0.85) 100%)';
  const heroBg = sectionStyles.offers_hero_bg_image
    ? `${bgOverlay}, url("${sectionStyles.offers_hero_bg_image}") center/cover`
    : (sectionStyles.offers_hero_bg_color || 'transparent');

  return (
    <div style={{ fontFamily:'var(--font-body)', background:'var(--bg)', color:'var(--text)' }}>

      {/* Editorial hero */}
      <section id="section-offers-hero" data-editable-section="offers" style={{
        maxWidth: sectionStyles.offers_hero_bg_image || sectionStyles.offers_hero_bg_color ? '100%' : '780px',
        margin:'0 auto',
        padding:`${sectionStyles.offers_hero_padding_top ?? 80}px 20px ${sectionStyles.offers_hero_padding_bottom ?? 40}px`,
        textAlign:'center',
        background: heroBg,
        color: (sectionStyles.offers_hero_bg_image || sectionStyles.offers_hero_bg_color) ? '#fbfbe2' : undefined,
      }}>
      <div style={{ maxWidth:'780px', margin:'0 auto' }}>
        <div data-editable="offers.hero_eyebrow" style={{ fontSize:'11px', fontWeight:'700', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'3px', marginBottom:'16px', fontFamily:'var(--font-body)' }}>
          {offers.hero_eyebrow}
        </div>
        <h1 style={{
          fontFamily:'var(--font-display)',
          fontSize: `clamp(32px, 6vw, ${styles.offers_hero_headline_size || '64px'})`,
          fontWeight:'600',
          color: (sectionStyles.offers_hero_bg_image || sectionStyles.offers_hero_bg_color) ? '#fbfbe2' : 'var(--text)',
          lineHeight:'1.05', marginBottom:'20px',
          textAlign: styles.offers_hero_headline_align || 'center',
        }}>
          <span data-editable="offers.hero_headline_line1">{offers.hero_headline_line1}</span><br />
          <span data-editable="offers.hero_headline_line2" style={{ color:'var(--accent)', fontStyle:'italic' }}>{offers.hero_headline_line2}</span>
        </h1>
        <p data-editable="offers.hero_description" style={{
          color: (sectionStyles.offers_hero_bg_image || sectionStyles.offers_hero_bg_color) ? 'rgba(251,251,226,0.75)' : 'var(--text-muted)',
          fontSize:'17px', lineHeight:'1.75', maxWidth:'580px', margin:'0 auto', fontFamily:'var(--font-body)'
        }}>
          {offers.hero_description}
        </p>
      </div>
      </section>

      {/* Plans — tonal layering, NO borders */}
      {visibility.offers_plans !== false && (
      <section style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 20px 80px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'24px', alignItems:'stretch' }}>
          {PLANS.map(plan => {
            const isPopular = plan.popular;
            return (
              <div key={plan.id} style={{
                background: isPopular
                  ? 'linear-gradient(135deg, var(--primary), var(--primary-container))'
                  : 'var(--bg-card)',
                color:      isPopular ? '#fbfbe2' : 'var(--text)',
                borderRadius:'var(--radius-2xl, 24px)',
                padding:'40px 32px 36px',
                position:'relative', overflow:'hidden',
                boxShadow:'var(--shadow-ambient, 0 8px 32px rgba(38,23,12,0.06))',
                transform: isPopular ? 'translateY(-8px)' : 'none',
                display:'flex', flexDirection:'column',
              }}>
                {isPopular && (
                  <div className="tps-chip tps-chip-teal" style={{
                    position:'absolute', top:'16px', right:'16px',
                    fontSize:'10px', padding:'4px 12px',
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'2px', color: isPopular ? 'var(--accent)' : 'var(--text-subtle)', marginBottom:'10px', fontFamily:'var(--font-body)' }}>
                  {plan.tier}
                </div>
                <p style={{ fontFamily:'var(--font-display)', fontSize:'17px', fontStyle:'italic', color: isPopular ? 'rgba(251,251,226,0.7)' : 'var(--text-subtle)', marginBottom:'24px' }}>
                  {plan.tagline}
                </p>
                <div style={{ marginBottom:'28px' }}>
                  <span style={{ fontSize:'52px', fontWeight:'600', color: isPopular ? '#fbfbe2' : 'var(--accent)', fontFamily:'var(--font-display)' }}>
                    {plan.price}
                  </span>
                  <span style={{ color: isPopular ? 'rgba(251,251,226,0.6)' : 'var(--text-subtle)', fontSize:'15px', fontFamily:'var(--font-body)' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 32px 0', flex:1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display:'flex', gap:'12px', alignItems:'flex-start', marginBottom:'12px', fontSize:'14px', lineHeight:'1.5' }}>
                      <span style={{ color:'var(--secondary)', fontWeight:'700', flexShrink:0 }}>&#10003;</span>
                      <span style={{ color: isPopular ? 'rgba(251,251,226,0.85)' : 'var(--text-muted)', fontFamily:'var(--font-body)' }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/login?mode=signup" className={isPopular ? 'tps-btn tps-btn-teal tps-btn-block' : 'tps-btn tps-btn-primary tps-btn-block'} style={{ textAlign:'center', textDecoration:'none' }}>
                  Choose {plan.tier}
                </Link>
              </div>
            );
          })}
        </div>

        <p data-editable="offers.plans_footer" style={{ textAlign:'center', color:'var(--text-subtle)', fontSize:'13px', marginTop:'40px', fontStyle:'italic', fontFamily:'var(--font-display)' }}>
          {offers.plans_footer}
        </p>
      </section>
      )}

      {/* Why join — numbered in gold, Newsreader titles */}
      {visibility.offers_why_join !== false && (
      <section id="section-offers-why-join" style={{ background:'var(--bg-section)', padding:'80px 20px' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div data-editable="offers.why_join_eyebrow" style={{ fontSize:'11px', fontWeight:'700', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'3px', marginBottom:'12px', fontFamily:'var(--font-body)' }}>
              {offers.why_join_eyebrow}
            </div>
            <h2 data-editable="offers.why_join_heading" style={{
              fontFamily:'var(--font-display)',
              fontSize:'38px',
              fontWeight:'600',
              color:'var(--text)',
              lineHeight:'1.1'
            }}>
              {offers.why_join_heading}
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'32px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'28px', fontWeight:'600', color:'var(--accent)', lineHeight:1, marginBottom:'10px' }}>
                  0{i}
                </div>
                <h3 data-editable={`offers.why_join_${i}_title`} style={{ fontFamily:'var(--font-display)', fontSize:'18px', color:'var(--text)', marginBottom:'8px', fontWeight:'600' }}>
                  {offers[`why_join_${i}_title`]}
                </h3>
                <p data-editable={`offers.why_join_${i}_body`} style={{ color:'var(--text-muted)', lineHeight:'1.7', fontSize:'14px', margin:0, fontFamily:'var(--font-body)' }}>
                  {offers[`why_join_${i}_body`]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Final CTA — teal button */}
      {visibility.offers_cta !== false && (
      <section id="section-offers-cta" style={{ padding:'80px 20px', textAlign:'center' }}>
        <div style={{ maxWidth:'580px', margin:'0 auto' }}>
          <h2 data-editable="offers.cta_headline" style={{
            fontFamily:'var(--font-display)',
            fontSize:'36px',
            fontWeight:'600',
            color:'var(--text)',
            marginBottom:'16px', lineHeight:'1.15'
          }}>
            {offers.cta_headline}
          </h2>
          <p data-editable="offers.cta_body" style={{ color:'var(--text-subtle)', fontSize:'15px', marginBottom:'32px', lineHeight:'1.6', fontFamily:'var(--font-body)' }}>
            {offers.cta_body}
          </p>
          <Link to="/login?mode=signup" className="tps-btn tps-btn-teal tps-btn-lg" style={{ textDecoration:'none', display:'inline-block' }}>
            Create your account
          </Link>
        </div>
      </section>
      )}
    </div>
  );
}
