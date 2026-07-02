import React from 'react';

const CSS = `
  .contact-hero-image {
    padding: 4px 0 0;
    background: #F6F8F7;
    font-family: 'Poppins', system-ui, sans-serif;
  }
  .contact-hero-image-wrap {
    margin: 0;
  }
  .contact-hero-image-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 4;
    background: #d8d8d0;
    border-radius: 0;
    overflow: hidden;
  }
  .contact-hero-image-frame img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 48%;
    display: block;
  }
  .contact-hero-chips {
    position: absolute;
    top: 24px;
    left: 24px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .contact-hero-chip {
    background: rgba(255,255,255,0.18);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.35);
    color: #fff;
    border-radius: 999px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 500;
  }
  @media (max-width: 639px) {
    .contact-hero-image-frame { aspect-ratio: 16 / 9; border-radius: 0; }
  }
`;

export default function ContactHeroImage() {
  const photoSrc = `${process.env.PUBLIC_URL || ''}/contact-hero.png`;
  return (
    <section className="contact-hero-image" aria-hidden="true">
      <style>{CSS}</style>
      <div className="contact-hero-image-wrap">
        <div className="contact-hero-image-frame">
          <img src={photoSrc} alt="" />
        </div>
      </div>
    </section>
  );
}
