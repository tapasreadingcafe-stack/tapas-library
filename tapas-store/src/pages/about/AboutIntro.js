import React from 'react';

const CSS = `
  .about-intro {
    background: #F6F8F7;
    padding: 24px 0 96px;
    font-family: 'Poppins', system-ui, sans-serif;
  }
  .about-intro-wrap {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 64px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: start;
  }
  .about-intro-copy p {
    margin: 0 0 22px;
    font-size: 16px;
    line-height: 1.65;
    color: #1a1a1a;
  }
  .about-intro-copy p:last-child { margin-bottom: 0; }
  .about-intro-image {
    width: 100%;
    aspect-ratio: 4 / 5;
    background: #d9d9d9;
    border-radius: 4px;
  }
  @media (max-width: 1023px) {
    .about-intro { padding: 48px 0 72px; }
    .about-intro-wrap { padding: 0 40px; gap: 56px; }
  }
  @media (max-width: 767px) {
    .about-intro { padding: 32px 0 56px; }
    .about-intro-wrap {
      grid-template-columns: 1fr;
      gap: 32px;
      padding: 0 20px;
    }
    .about-intro-copy p { font-size: 15px; }
  }
`;

export default function AboutIntro() {
  return (
    <section className="about-intro">
      <style>{CSS}</style>
      <div className="about-intro-wrap">
        <div className="about-intro-copy">
          <p>We are more than just a library café. We are a space where kids and parents come together to read, create, and explore.</p>
          <p>In today's fast-paced, screen-filled world, we wanted to build something different — a place where families can slow down, spend time together, and enjoy simple, meaningful moments.</p>
          <p>From toddlers discovering their first picture books to teens finding their next favorite series, our library is thoughtfully designed for children and young adults aged 1 to 18. Every corner is created to make reading easy, enjoyable, and a part of everyday life.</p>
          <p>But we go beyond books. We offer a range of hands-on activities that encourage creativity and learning — storytelling sessions, music, pottery, painting, craft-making, and even nature-based experiences like planting and gardening. It's a space where children can explore their interests, express themselves, and learn by doing.</p>
          <p>For parents, it's a chance to be part of the journey — to read together, create together, and simply spend quality time with their children.</p>
          <p>Whether it's turning pages, making something new, or sharing a quiet moment over a cup of coffee, this is a place to connect, unwind, and grow — together.</p>
        </div>
        <div className="about-intro-image" role="img" aria-label="About us image placeholder" />
      </div>
    </section>
  );
}
