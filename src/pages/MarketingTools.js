import React, { useState, useMemo } from 'react';

// =====================================================================
// Marketing tools — CATALOG ONLY (not built).
// A curated list of the most important marketing tools for 2026 that
// will help run and grow Tapas Reading Cafe. Every card is clearly
// marked "Coming soon" — nothing is wired up yet.
// =====================================================================

const CATEGORIES = [
  { key: 'all',        label: 'All tools',        icon: '✨' },
  { key: 'social',     label: 'Social media',     icon: '📱' },
  { key: 'email',      label: 'Email & SMS',      icon: '✉️' },
  { key: 'content',    label: 'Content & AI',     icon: '🪄' },
  { key: 'design',     label: 'Design & video',   icon: '🎨' },
  { key: 'seo',        label: 'SEO & ads',        icon: '🔎' },
  { key: 'analytics',  label: 'Analytics & CRM',  icon: '📊' },
  { key: 'community',  label: 'Community',        icon: '🤝' },
  { key: 'automation', label: 'Automation',       icon: '⚡' },
];

const TOOLS = [
  // Social media -------------------------------------------------------
  {
    category: 'social',
    name: 'Meta Business Suite',
    emoji: '📘',
    tag: 'Free',
    why: 'Manage Facebook + Instagram posts, stories, comments, and inbox in one place. Essential for local bookstores.',
    url: 'https://business.facebook.com',
  },
  {
    category: 'social',
    name: 'Buffer',
    emoji: '🧭',
    tag: 'Freemium',
    why: 'Schedule posts across Instagram, Facebook, LinkedIn, Pinterest, and TikTok. Great for planning monthly book-club content.',
    url: 'https://buffer.com',
  },
  {
    category: 'social',
    name: 'Later',
    emoji: '📅',
    tag: 'Freemium',
    why: 'Visual content calendar with link-in-bio builder. Built for Instagram-first brands.',
    url: 'https://later.com',
  },
  {
    category: 'social',
    name: 'Hootsuite',
    emoji: '🦉',
    tag: 'Paid',
    why: 'All-in-one social management with deep analytics. Worth it once you have paid campaigns running.',
    url: 'https://hootsuite.com',
  },

  // Email & SMS --------------------------------------------------------
  {
    category: 'email',
    name: 'Mailchimp',
    emoji: '🐵',
    tag: 'Freemium',
    why: 'Newsletter campaigns, welcome journeys, and birthday offers for members. Free up to 500 contacts.',
    url: 'https://mailchimp.com',
  },
  {
    category: 'email',
    name: 'Beehiiv',
    emoji: '🐝',
    tag: 'Freemium',
    why: '2026\'s favourite newsletter platform. Perfect for a weekly "what we\'re reading" email — clean editor, built-in referrals.',
    url: 'https://beehiiv.com',
  },
  {
    category: 'email',
    name: 'Resend',
    emoji: '📬',
    tag: 'Freemium',
    why: 'Developer-friendly transactional email — order confirmations, password resets, event reminders. Modern replacement for SendGrid.',
    url: 'https://resend.com',
  },
  {
    category: 'email',
    name: 'MSG91',
    emoji: '💬',
    tag: 'Paid',
    why: 'India-focused SMS + WhatsApp gateway. Send OTP, order-ready pings, and promotional blasts compliant with TRAI.',
    url: 'https://msg91.com',
  },

  // Content & AI -------------------------------------------------------
  {
    category: 'content',
    name: 'ChatGPT',
    emoji: '🤖',
    tag: 'Freemium',
    why: 'Draft captions, newsletters, blog posts, and member responses. Use it as a tireless writing partner.',
    url: 'https://chat.openai.com',
  },
  {
    category: 'content',
    name: 'Claude',
    emoji: '🎓',
    tag: 'Freemium',
    why: 'Long-form writing, research summaries, and brand-voice drafts. Better than ChatGPT for careful editing.',
    url: 'https://claude.ai',
  },
  {
    category: 'content',
    name: 'Notion AI',
    emoji: '🧠',
    tag: 'Paid',
    why: 'Generate marketing briefs, campaign plans, and monthly review docs inside your existing Notion workspace.',
    url: 'https://notion.so',
  },
  {
    category: 'content',
    name: 'Jasper',
    emoji: '✍️',
    tag: 'Paid',
    why: 'AI content for teams with saved brand voices. Good when multiple staff write social posts.',
    url: 'https://jasper.ai',
  },

  // Design & video -----------------------------------------------------
  {
    category: 'design',
    name: 'Canva',
    emoji: '🎨',
    tag: 'Freemium',
    why: 'The standard for every small business. Instagram posts, event posters, menu boards, business cards — all in one.',
    url: 'https://canva.com',
  },
  {
    category: 'design',
    name: 'Figma',
    emoji: '🪄',
    tag: 'Freemium',
    why: 'Professional design for your website, menus, and brand kit. Free for small teams.',
    url: 'https://figma.com',
  },
  {
    category: 'design',
    name: 'CapCut',
    emoji: '🎬',
    tag: 'Free',
    why: 'Instagram Reels and YouTube Shorts editor with templates. Critical for video-first marketing in 2026.',
    url: 'https://capcut.com',
  },
  {
    category: 'design',
    name: 'Runway',
    emoji: '🎞️',
    tag: 'Paid',
    why: 'AI video generation and editing. Create unique social clips without a camera — 2026\'s fastest-growing creative tool.',
    url: 'https://runwayml.com',
  },
  {
    category: 'design',
    name: 'Midjourney',
    emoji: '🖼️',
    tag: 'Paid',
    why: 'AI image generation for book-inspired posters, mood boards, and campaign art when you can\'t find the right stock photo.',
    url: 'https://midjourney.com',
  },

  // SEO & ads ----------------------------------------------------------
  {
    category: 'seo',
    name: 'Google Business Profile',
    emoji: '📍',
    tag: 'Free',
    why: 'Show up on Google Maps and local search. The single most important free marketing asset for a physical cafe.',
    url: 'https://business.google.com',
  },
  {
    category: 'seo',
    name: 'Google Ads',
    emoji: '💰',
    tag: 'Paid',
    why: 'Run search, display, and YouTube ads targeted to Nagpur readers. Start with ₹200/day local campaigns.',
    url: 'https://ads.google.com',
  },
  {
    category: 'seo',
    name: 'Meta Ads Manager',
    emoji: '💸',
    tag: 'Paid',
    why: 'Facebook + Instagram paid campaigns with detailed audience targeting. Best ROI for event promotion.',
    url: 'https://adsmanager.facebook.com',
  },
  {
    category: 'seo',
    name: 'Ahrefs',
    emoji: '🔍',
    tag: 'Paid',
    why: 'SEO research — see what local readers search for, what competitors rank for, and which keywords to target.',
    url: 'https://ahrefs.com',
  },
  {
    category: 'seo',
    name: 'Ubersuggest',
    emoji: '🔭',
    tag: 'Freemium',
    why: 'Budget-friendly SEO audit tool. Good starter for finding content ideas and tracking rankings.',
    url: 'https://neilpatel.com/ubersuggest',
  },

  // Analytics & CRM ----------------------------------------------------
  {
    category: 'analytics',
    name: 'Google Analytics 4',
    emoji: '📈',
    tag: 'Free',
    why: 'Track who visits tapasreadingcafe.com, which pages they read, and where they drop off.',
    url: 'https://analytics.google.com',
  },
  {
    category: 'analytics',
    name: 'Plausible',
    emoji: '🧮',
    tag: 'Paid',
    why: 'Privacy-first alternative to GA4. Lightweight, GDPR-friendly, no cookie banners needed.',
    url: 'https://plausible.io',
  },
  {
    category: 'analytics',
    name: 'HubSpot CRM',
    emoji: '🧰',
    tag: 'Freemium',
    why: 'Free CRM for managing member relationships, event attendees, and corporate enquiries.',
    url: 'https://hubspot.com',
  },
  {
    category: 'analytics',
    name: 'Segment',
    emoji: '🔗',
    tag: 'Freemium',
    why: 'One pipe to send data from your store → analytics, email, and ads platforms. Saves weeks of integration.',
    url: 'https://segment.com',
  },

  // Community ----------------------------------------------------------
  {
    category: 'community',
    name: 'Discord',
    emoji: '💬',
    tag: 'Free',
    why: '2026\'s community home for readers and fans. Host your book club, share monthly reads, and run AMAs.',
    url: 'https://discord.com',
  },
  {
    category: 'community',
    name: 'WhatsApp Business',
    emoji: '📢',
    tag: 'Free',
    why: 'Broadcast lists, auto-replies, and catalog — India\'s #1 messaging channel for small businesses.',
    url: 'https://business.whatsapp.com',
  },
  {
    category: 'community',
    name: 'Geneva',
    emoji: '🏛️',
    tag: 'Free',
    why: 'Modern alternative to WhatsApp groups. Topic channels, events, and member directories in one place.',
    url: 'https://geneva.com',
  },
  {
    category: 'community',
    name: 'Eventbrite',
    emoji: '🎟️',
    tag: 'Freemium',
    why: 'Publish, sell tickets to, and check in attendees for book launches, workshops, and open-mic nights.',
    url: 'https://eventbrite.com',
  },

  // Automation ---------------------------------------------------------
  {
    category: 'automation',
    name: 'Zapier',
    emoji: '⚡',
    tag: 'Freemium',
    why: 'Connect any two apps without code. "When someone signs up → add to Mailchimp → post in Slack."',
    url: 'https://zapier.com',
  },
  {
    category: 'automation',
    name: 'Make',
    emoji: '🧩',
    tag: 'Freemium',
    why: 'Visual workflow automation, more powerful than Zapier for multi-step marketing journeys.',
    url: 'https://make.com',
  },
  {
    category: 'automation',
    name: 'n8n',
    emoji: '🛠️',
    tag: 'Free',
    why: 'Self-hosted, open-source automation. Best for teams who want full control and no per-task fees.',
    url: 'https://n8n.io',
  },
  {
    category: 'automation',
    name: 'Linear',
    emoji: '📋',
    tag: 'Freemium',
    why: 'Project management for marketing campaigns. Track content deadlines, launch checklists, and ad creatives in one board.',
    url: 'https://linear.app',
  },
];

export default function MarketingTools() {
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return TOOLS.filter(t => {
      if (activeCat !== 'all' && t.category !== activeCat) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return t.name.toLowerCase().includes(q) || t.why.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeCat, search]);

  return (
    <div style={styles.root}>
      {/* Hero header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div style={{ fontSize: '36px' }}>📣</div>
          <div>
            <h1 style={styles.title}>Marketing Tools</h1>
            <p style={styles.subtitle}>
              Curated list of the most important marketing tools for 2026 · Not built yet · For planning only
            </p>
          </div>
        </div>

        <div style={styles.banner}>
          <span style={{ fontSize: '18px' }}>🚧</span>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>Coming soon</div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
              This page is a reference catalog only. None of these integrations are wired up yet —
              we'll pick the ones you want and build them out one by one.
            </div>
          </div>
        </div>

        {/* Search + chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            placeholder="Search tools…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.search}
            onFocus={e => e.target.style.borderColor = '#D4A853'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CATEGORIES.map(c => {
              const active = c.key === activeCat;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(c.key)}
                  style={{
                    ...styles.chip,
                    background: active ? '#0f172a' : '#ffffff',
                    color: active ? '#f8fafc' : '#475569',
                    borderColor: active ? '#0f172a' : '#e2e8f0',
                  }}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Tool grid */}
      <div style={styles.grid}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔎</div>
            No tools match "{search}". Try a different search or category.
          </div>
        ) : filtered.map(t => (
          <ToolCard key={t.name} tool={t} />
        ))}
      </div>

      <div style={styles.footer}>
        Showing {filtered.length} of {TOOLS.length} tools ·
        Pick one to integrate and tell me which it is — I'll wire it into the dashboard next.
      </div>
    </div>
  );
}

function ToolCard({ tool }) {
  const tagColor = {
    'Free':     { bg: '#dcfce7', fg: '#166534' },
    'Freemium': { bg: '#dbeafe', fg: '#1e40af' },
    'Paid':     { bg: '#fef3c7', fg: '#92400e' },
  }[tool.tag] || { bg: '#f1f5f9', fg: '#475569' };

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div style={styles.cardIcon}>{tool.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{tool.name}</div>
            <span style={{
              padding: '2px 10px',
              borderRadius: '99px',
              fontSize: '10px',
              fontWeight: 700,
              background: tagColor.bg,
              color: tagColor.fg,
            }}>
              {tool.tag}
            </span>
          </div>
        </div>
      </div>
      <p style={{
        fontSize: '13px',
        color: '#475569',
        lineHeight: 1.6,
        margin: '0 0 16px 0',
      }}>
        {tool.why}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '99px',
          background: '#fef3c7',
          color: '#92400e',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
        }}>
          🚧 Coming soon
        </span>
        {tool.url && (
          <a
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
          >
            Visit site ↗
          </a>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    padding: '28px 32px 60px',
    background: '#f8fafc',
    minHeight: 'calc(100vh - 60px)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 28px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#64748b',
  },
  banner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 18px',
    borderRadius: '12px',
    background: '#fef3c7',
    border: '1px solid #fde68a',
    marginBottom: '22px',
  },
  search: {
    width: '100%',
    maxWidth: '420px',
    padding: '11px 16px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    background: 'white',
    color: '#0f172a',
    transition: 'border-color 150ms',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '99px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1.5px solid',
    transition: 'all 150ms',
  },
  grid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '20px',
    transition: 'transform 200ms, box-shadow 200ms, border-color 200ms',
    cursor: 'default',
  },
  cardIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
  },
  footer: {
    maxWidth: '1200px',
    margin: '32px auto 0',
    padding: '16px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '12px',
    fontStyle: 'italic',
  },
};
