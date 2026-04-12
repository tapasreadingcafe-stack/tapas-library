import React, { useState, useMemo } from 'react';

// =====================================================================
// Marketing — features we can BUILD into the Tapas dashboard
// ---------------------------------------------------------------------
// This page is a planning catalog of marketing features that live
// inside this app (no third-party SaaS). Every card is a concrete
// thing we could build, with a short idea of what it does and how
// it works. Pick one and I'll scaffold it.
// =====================================================================

const CATEGORIES = [
  { key: 'all',        label: 'All features',    icon: '✨' },
  { key: 'growth',     label: 'Grow members',    icon: '🌱' },
  { key: 'campaigns',  label: 'Campaigns',       icon: '📣' },
  { key: 'offers',     label: 'Offers & loyalty',icon: '🎁' },
  { key: 'engagement', label: 'Engagement',      icon: '💬' },
  { key: 'automation', label: 'Automations',     icon: '⚡' },
  { key: 'content',    label: 'Content & pages', icon: '🖼️' },
  { key: 'analytics',  label: 'Analytics',       icon: '📊' },
];

// effort: 'Quick win' (1–2 days) · 'Medium build' (3–5 days) · 'Big bet' (1–2 weeks)
const FEATURES = [

  // ── Grow members ────────────────────────────────────────────────
  {
    category: 'growth',
    emoji: '🎟️',
    name: 'Referral program',
    effort: 'Medium build',
    idea: 'Every member gets a unique link. When a friend signs up through it, both get a free-book credit or coffee. Track the graph inside the dashboard so you see who your top advocates are.',
  },
  {
    category: 'growth',
    emoji: '🎂',
    name: 'Birthday offers',
    effort: 'Quick win',
    idea: 'Automatic email + in-store voucher on a member\'s birthday. Configurable discount and a one-click resend.',
  },
  {
    category: 'growth',
    emoji: '👋',
    name: 'Welcome journey',
    effort: 'Medium build',
    idea: 'Day 0: welcome email with the cafe story. Day 3: "tell us what you love to read" quiz. Day 7: first-visit coffee on us. Day 14: recommended books based on quiz.',
  },
  {
    category: 'growth',
    emoji: '🧲',
    name: 'Exit-intent signup',
    effort: 'Quick win',
    idea: 'When a first-time visitor is about to leave the website, show a polite popup: "Get our weekly reading list — 5 books, every Friday." Captures email into a mailing list table.',
  },
  {
    category: 'growth',
    emoji: '📨',
    name: 'Waitlist for sold-out books',
    effort: 'Quick win',
    idea: 'When a book is out of stock, show a "Notify me" button. Auto-emails the member as soon as staff mark the book back in stock.',
  },
  {
    category: 'growth',
    emoji: '❤️',
    name: 'Wishlist back-in-stock alerts',
    effort: 'Quick win',
    idea: 'Customers already wishlist books. Send them a single-click email the moment a wishlisted book becomes available. Pure upside.',
  },

  // ── Campaigns ──────────────────────────────────────────────────
  {
    category: 'campaigns',
    emoji: '✉️',
    name: 'In-house newsletter editor',
    effort: 'Medium build',
    idea: 'Draft, preview, and send emails to segmented member lists from the dashboard. Use Resend or SMTP under the hood. Templates for book recommendations, event invites, and monthly updates.',
  },
  {
    category: 'campaigns',
    emoji: '📲',
    name: 'WhatsApp broadcasts',
    effort: 'Medium build',
    idea: 'Using WhatsApp Business API, send templated broadcasts to members who opt in — order-ready pings, event reminders, monthly book drops. India\'s #1 channel for repeat visits.',
  },
  {
    category: 'campaigns',
    emoji: '💬',
    name: 'SMS alerts',
    effort: 'Quick win',
    idea: 'Triggered texts: order ready for pickup, reservation confirmed, fine reminder, event tomorrow. Uses MSG91 or similar Indian SMS gateway.',
  },
  {
    category: 'campaigns',
    emoji: '⏱️',
    name: 'Flash sale scheduler',
    effort: 'Medium build',
    idea: 'Schedule a 24-hour sale: "20% off fiction this Saturday." The store automatically applies the discount during the window and a banner appears on the homepage. Auto-expires.',
  },
  {
    category: 'campaigns',
    emoji: '🎯',
    name: 'Targeted member segments',
    effort: 'Medium build',
    idea: 'Save filter combinations as segments — e.g. "Silver members who borrowed fiction in the last 30 days" — then use them as the To: field for any campaign.',
  },
  {
    category: 'campaigns',
    emoji: '🔔',
    name: 'Browser push notifications',
    effort: 'Big bet',
    idea: 'Opt-in web push from tapasreadingcafe.com. Send "new arrival" and "event starting in 1hr" nudges even when the browser tab is closed.',
  },

  // ── Offers & loyalty ───────────────────────────────────────────
  {
    category: 'offers',
    emoji: '🏷️',
    name: 'Promo codes & coupons',
    effort: 'Quick win',
    idea: 'Create codes (FICTION20, BOOKCLUB10) with usage limits, expiry dates, and per-member caps. Track redemption from the dashboard.',
  },
  {
    category: 'offers',
    emoji: '⭐',
    name: 'Loyalty points',
    effort: 'Medium build',
    idea: 'Earn 1 point per ₹10 spent + bonus points for reviews, referrals, and birthdays. Redeem at checkout as rupee-off or free items. A full tier ladder (Silver → Gold → Platinum).',
  },
  {
    category: 'offers',
    emoji: '🎁',
    name: 'Gift cards',
    effort: 'Medium build',
    idea: 'Members buy digital gift cards in any amount, email them to a friend. Recipient redeems at checkout. Great for holidays and corporate gifting.',
  },
  {
    category: 'offers',
    emoji: '🏆',
    name: 'Member tier badges',
    effort: 'Quick win',
    idea: 'Show a visible Silver / Gold / Platinum badge next to member names in the dashboard and on their profile page. Unlock perks per tier automatically.',
  },
  {
    category: 'offers',
    emoji: '🔥',
    name: 'Reading streak rewards',
    effort: 'Medium build',
    idea: 'Members earn badges for consecutive months of borrowing or reading. 3-month streak → free coffee, 6-month → signed bookplate, 12-month → custom reading list from staff.',
  },
  {
    category: 'offers',
    emoji: '🧾',
    name: 'Staff-issued vouchers',
    effort: 'Quick win',
    idea: 'Let staff issue one-off vouchers from a member\'s profile — "cafe visit, coffee on the house" — with a reason. Logged to the accounts page.',
  },

  // ── Engagement ─────────────────────────────────────────────────
  {
    category: 'engagement',
    emoji: '⭐',
    name: 'Review collection flow',
    effort: 'Quick win',
    idea: 'Post-purchase or post-return, auto-email a one-click "rate this book" link. Reviews land on the book\'s page and on the member\'s profile.',
  },
  {
    category: 'engagement',
    emoji: '📖',
    name: 'Book club sign-ups',
    effort: 'Quick win',
    idea: 'Create a book club event with a capacity limit, a reading pick, and a date. Members RSVP from the store. Staff see the attendee list in the dashboard.',
  },
  {
    category: 'engagement',
    emoji: '🧠',
    name: 'Reader quiz → recommendations',
    effort: 'Medium build',
    idea: '5-question quiz on the website ("What was the last book you loved?"). Results suggest 3 books from your catalog and optionally ask for an email to send the list.',
  },
  {
    category: 'engagement',
    emoji: '👥',
    name: 'Community wall',
    effort: 'Big bet',
    idea: 'A simple public feed where members post what they\'re reading, with photos. Staff moderate. Comments from other members. Becomes your best organic marketing.',
  },
  {
    category: 'engagement',
    emoji: '💌',
    name: 'Post-visit feedback (NPS)',
    effort: 'Quick win',
    idea: 'After a cafe visit, auto-email a one-click "How likely are you to recommend us?" rating. Collect comments. Show rolling NPS score on the dashboard.',
  },
  {
    category: 'engagement',
    emoji: '🏅',
    name: 'Reading challenges',
    effort: 'Medium build',
    idea: 'Monthly themes like "Read 3 books by Indian authors in April." Members opt in, progress is tracked, winners get a badge + a reward.',
  },

  // ── Automations ────────────────────────────────────────────────
  {
    category: 'automation',
    emoji: '🛒',
    name: 'Abandoned cart recovery',
    effort: 'Quick win',
    idea: 'When a logged-in customer adds books to cart but doesn\'t check out within 24 hrs, auto-email a gentle reminder with the book cover and a "complete your order" link.',
  },
  {
    category: 'automation',
    emoji: '📚',
    name: 'Low-stock marketing push',
    effort: 'Quick win',
    idea: 'When a popular book drops below 2 copies, trigger an automatic "last copies!" post draft to social + email. Staff reviews and sends with one click.',
  },
  {
    category: 'automation',
    emoji: '📅',
    name: 'Event reminder sequence',
    effort: 'Quick win',
    idea: 'After someone RSVPs to an event: confirmation email → reminder 24h before → thank-you email next day asking for a photo or review.',
  },
  {
    category: 'automation',
    emoji: '⭐',
    name: 'Google review auto-request',
    effort: 'Quick win',
    idea: 'Two days after a cafe visit, send a short SMS/email with a direct link to your Google Business Profile review page. Simple and high ROI for local SEO.',
  },
  {
    category: 'automation',
    emoji: '🕑',
    name: 'Fine reminder automation',
    effort: 'Quick win',
    idea: 'Auto-remind members by WhatsApp or email when a book is due in 2 days, overdue by 1 day, and overdue by 7 days. Stop sending once returned.',
  },
  {
    category: 'automation',
    emoji: '🧾',
    name: 'Win-back campaign',
    effort: 'Medium build',
    idea: 'Members who haven\'t visited in 60+ days get a "we miss you" email with a personal book recommendation and a small comeback offer.',
  },

  // ── Content & pages ────────────────────────────────────────────
  {
    category: 'content',
    emoji: '🏞️',
    name: 'Landing page builder',
    effort: 'Big bet',
    idea: 'Create single-use pages for events, collaborations, or campaigns: /events/monsoon-reads with a hero, a photo gallery, RSVP button, and a map. Reuses the editor you already have.',
  },
  {
    category: 'content',
    emoji: '📰',
    name: 'Blog / Journal',
    effort: 'Medium build',
    idea: 'Staff publish short posts: book reviews, event recaps, author interviews. Pure SEO + gives the newsletter something to link to every week.',
  },
  {
    category: 'content',
    emoji: '🌀',
    name: 'Pop-up banner manager',
    effort: 'Quick win',
    idea: 'Schedule banners and announcement bars ("New arrivals this weekend") from the dashboard with a start/end date. No code changes needed.',
  },
  {
    category: 'content',
    emoji: '🔳',
    name: 'QR code generator',
    effort: 'Quick win',
    idea: 'Generate QR codes for table tents, posters, and receipts that deep-link to specific pages (menu, review form, event RSVP). Track scans.',
  },
  {
    category: 'content',
    emoji: '📸',
    name: 'Instagram grid embed',
    effort: 'Quick win',
    idea: 'Pull your latest 9 Instagram posts into a section of the homepage so the site always feels fresh. Uses the Meta Graph API.',
  },
  {
    category: 'content',
    emoji: '📝',
    name: 'Newsletter template library',
    effort: 'Medium build',
    idea: 'Save reusable email layouts — "Book of the week," "Event invite," "Monthly recap" — so staff can send a good-looking email in 5 minutes.',
  },

  // ── Analytics ──────────────────────────────────────────────────
  {
    category: 'analytics',
    emoji: '📊',
    name: 'Marketing dashboard',
    effort: 'Medium build',
    idea: 'Single page showing new signups, email open rates, campaign revenue, top-converting referrers, and active promos — all in one glance.',
  },
  {
    category: 'analytics',
    emoji: '🧪',
    name: 'A/B testing for store content',
    effort: 'Big bet',
    idea: 'Test two versions of the hero headline or CTA button. System splits traffic 50/50, tracks which converts better, and auto-picks the winner.',
  },
  {
    category: 'analytics',
    emoji: '🔥',
    name: 'Heatmap / click tracking',
    effort: 'Big bet',
    idea: 'See where visitors click, scroll, and drop off on the store. Identify dead zones and popular elements without a third-party like Hotjar.',
  },
  {
    category: 'analytics',
    emoji: '🎯',
    name: 'Campaign attribution',
    effort: 'Medium build',
    idea: 'UTM-tagged links let you see which campaign brought in which sale. Show revenue per email, per social post, per QR code.',
  },
  {
    category: 'analytics',
    emoji: '📅',
    name: 'Content calendar',
    effort: 'Quick win',
    idea: 'A lightweight calendar view that lives alongside the Tasks page — plan Instagram posts, email sends, and events visually across the month.',
  },
];

export default function MarketingTools() {
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return FEATURES.filter(f => {
      if (activeCat !== 'all' && f.category !== activeCat) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.idea.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeCat, search]);

  const effortCounts = useMemo(() => {
    const out = { 'Quick win': 0, 'Medium build': 0, 'Big bet': 0 };
    for (const f of FEATURES) out[f.effort] = (out[f.effort] || 0) + 1;
    return out;
  }, []);

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div style={{ fontSize: '36px' }}>📣</div>
          <div>
            <h1 style={styles.title}>Marketing features we can build</h1>
            <p style={styles.subtitle}>
              In-house ideas for growing Tapas Reading Cafe · Not built yet · Pick one and say the word
            </p>
          </div>
        </div>

        <div style={styles.banner}>
          <span style={{ fontSize: '20px' }}>💡</span>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
              {FEATURES.length} ideas · {effortCounts['Quick win']} quick wins · {effortCounts['Medium build']} medium · {effortCounts['Big bet']} big bets
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', lineHeight: 1.55 }}>
              Everything on this page is a feature we would build directly into this dashboard — no third-party SaaS.
              Tell me which one you want next and I'll scaffold it in a day or two.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            placeholder="Search features…"
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

      <div style={styles.grid}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔎</div>
            No features match "{search}". Try a different search or category.
          </div>
        ) : filtered.map(f => (
          <FeatureCard key={f.name} feature={f} />
        ))}
      </div>

      <div style={styles.footer}>
        Showing {filtered.length} of {FEATURES.length} ideas · Everything here is implementable in-house · Say the word and I'll build it
      </div>
    </div>
  );
}

function FeatureCard({ feature }) {
  const effortColor = {
    'Quick win':    { bg: '#dcfce7', fg: '#166534' },
    'Medium build': { bg: '#dbeafe', fg: '#1e40af' },
    'Big bet':      { bg: '#fef3c7', fg: '#92400e' },
  }[feature.effort] || { bg: '#f1f5f9', fg: '#475569' };

  return (
    <div
      style={styles.card}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(15,23,42,0.08)';
        e.currentTarget.style.borderColor = '#D4A853';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={styles.cardIcon}>{feature.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
            {feature.name}
          </div>
          <span style={{
            display: 'inline-block',
            marginTop: '4px',
            padding: '2px 10px',
            borderRadius: '99px',
            fontSize: '10px',
            fontWeight: 700,
            background: effortColor.bg,
            color: effortColor.fg,
          }}>
            {feature.effort}
          </span>
        </div>
      </div>
      <p style={{
        fontSize: '13px',
        color: '#475569',
        lineHeight: 1.6,
        margin: '0 0 14px 0',
      }}>
        {feature.idea}
      </p>
      <div style={{
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
        🚧 Not built yet
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
    padding: '16px 18px',
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'white',
    border: '1.5px solid #e2e8f0',
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
