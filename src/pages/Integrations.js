import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// Integrations — connect external services to power marketing tools
// =====================================================================

const SERVICES = [
  {
    key: 'resend',
    name: 'Resend',
    icon: '✉️',
    category: 'Email',
    description: 'Send newsletters, review requests, birthday offers, and transactional emails.',
    usedBy: ['Newsletter', 'Marketing Hub', 'Automations'],
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 're_xxxxxxxx' },
      { key: 'from_email', label: 'From Email', type: 'text', placeholder: 'hello@tapasreadingcafe.com' },
      { key: 'from_name', label: 'From Name', type: 'text', placeholder: 'Tapas Reading Cafe' },
    ],
    docs: 'https://resend.com/docs',
    free: '3,000 emails/month free',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    icon: '📱',
    category: 'Messaging',
    description: 'Send broadcast messages, order-ready pings, and event reminders via WhatsApp.',
    usedBy: ['Communications'],
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: '1234567890' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'EAAxxxxxxx' },
      { key: 'business_id', label: 'Business Account ID', type: 'text', placeholder: '9876543210' },
    ],
    docs: 'https://developers.facebook.com/docs/whatsapp',
    free: '1,000 free conversations/month',
  },
  {
    key: 'msg91',
    name: 'MSG91',
    icon: '💬',
    category: 'SMS',
    description: 'Send SMS alerts — order ready, fine reminders, event notifications. India-focused.',
    usedBy: ['Communications'],
    fields: [
      { key: 'auth_key', label: 'Auth Key', type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' },
      { key: 'sender_id', label: 'Sender ID (6 chars)', type: 'text', placeholder: 'TAPAS' },
      { key: 'template_id', label: 'DLT Template ID', type: 'text', placeholder: '1234567890' },
    ],
    docs: 'https://msg91.com/help',
    free: 'Pay per SMS (~₹0.15/msg)',
  },
  {
    key: 'razorpay',
    name: 'Razorpay',
    icon: '💳',
    category: 'Payments',
    description: 'Accept online payments for book purchases and memberships.',
    usedBy: ['Store Checkout'],
    fields: [
      { key: 'key_id', label: 'Key ID', type: 'text', placeholder: 'rzp_live_xxxxxxxx' },
      { key: 'key_secret', label: 'Key Secret', type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' },
    ],
    docs: 'https://razorpay.com/docs',
    free: '2% per transaction',
  },
  {
    key: 'instagram',
    name: 'Instagram / Meta',
    icon: '📸',
    category: 'Social',
    description: 'Embed your Instagram feed on the store homepage. Auto-updates with new posts.',
    usedBy: ['Advanced Tools'],
    fields: [
      { key: 'access_token', label: 'Long-lived Access Token', type: 'password', placeholder: 'IGQxxxxxxx' },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text', placeholder: '17841400000000' },
    ],
    docs: 'https://developers.facebook.com/docs/instagram-api',
    free: 'Free with a Business account',
  },
  {
    key: 'google',
    name: 'Google Business',
    icon: '📍',
    category: 'Reviews',
    description: 'Auto-generate review request links for Google Business Profile.',
    usedBy: ['Automations'],
    fields: [
      { key: 'place_id', label: 'Place ID', type: 'text', placeholder: 'ChIJxxxxxxxxxxxxxxxx' },
      { key: 'business_name', label: 'Business Name on Google', type: 'text', placeholder: 'Tapas Reading Cafe Nagpur' },
    ],
    docs: 'https://developers.google.com/maps/documentation/places',
    free: 'Free',
  },
  {
    key: 'push',
    name: 'Web Push (VAPID)',
    icon: '🔔',
    category: 'Notifications',
    description: 'Send browser push notifications for new arrivals, events, and reminders.',
    usedBy: ['Communications'],
    fields: [
      { key: 'public_key', label: 'VAPID Public Key', type: 'text', placeholder: 'BNxxxxxxx' },
      { key: 'private_key', label: 'VAPID Private Key', type: 'password', placeholder: 'xxxxxxx' },
      { key: 'subject', label: 'Subject (email or URL)', type: 'text', placeholder: 'mailto:tapasreadingcafe@gmail.com' },
    ],
    docs: 'https://web.dev/push-notifications-overview',
    free: 'Free (self-hosted)',
  },
  {
    key: 'ga4',
    name: 'Google Analytics 4',
    icon: '📊',
    category: 'Analytics',
    description: 'Track store visitors, page views, and conversions with GA4.',
    usedBy: ['Marketing Dashboard'],
    fields: [
      { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
    ],
    docs: 'https://analytics.google.com',
    free: 'Free',
  },
];

const SETTINGS_KEY = 'integrations';

export default function Integrations() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // which service key is saving
  const [savedAt, setSavedAt] = useState({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();
    if (data?.value) {
      const raw = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      setConfig(raw);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveService = async (serviceKey) => {
    setSaving(serviceKey);
    try {
      await supabase.from('app_settings').upsert({
        key: SETTINGS_KEY,
        value: config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      setSavedAt(prev => ({ ...prev, [serviceKey]: new Date() }));
    } catch (e) {
      alert('Failed to save: ' + (e.message || e));
    } finally {
      setSaving(null);
    }
  };

  const updateField = (serviceKey, fieldKey, value) => {
    setConfig(prev => ({
      ...prev,
      [serviceKey]: { ...(prev[serviceKey] || {}), [fieldKey]: value },
    }));
  };

  const isConnected = (serviceKey) => {
    const svc = config[serviceKey];
    if (!svc) return false;
    const service = SERVICES.find(s => s.key === serviceKey);
    // Connected if the first (most important) field has a value
    return service?.fields[0] && !!svc[service.fields[0].key];
  };

  const disconnect = async (serviceKey) => {
    if (!window.confirm(`Disconnect ${SERVICES.find(s => s.key === serviceKey)?.name}? This will clear all saved keys.`)) return;
    setConfig(prev => {
      const next = { ...prev };
      delete next[serviceKey];
      return next;
    });
    // Save immediately
    const nextConfig = { ...config };
    delete nextConfig[serviceKey];
    await supabase.from('app_settings').upsert({
      key: SETTINGS_KEY,
      value: nextConfig,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    setSavedAt(prev => { const n = { ...prev }; delete n[serviceKey]; return n; });
  };

  const filtered = SERVICES.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const connected = SERVICES.filter(s => isConnected(s.key)).length;

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '36px' }}>🔌</div>
          <div>
            <h1 style={S.title}>Integrations</h1>
            <p style={S.subtitle}>
              Connect external services to power your marketing tools ·
              <span style={{ color: '#166534', fontWeight: 700 }}> {connected}</span> of {SERVICES.length} connected
            </p>
          </div>
        </div>
        <input
          placeholder="Search services…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={S.search}
        />
      </header>

      {/* Connection status bar */}
      <div style={S.statusBar}>
        {SERVICES.map(s => (
          <div key={s.key} title={s.name} style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: isConnected(s.key) ? '#dcfce7' : '#f1f5f9',
            border: `1.5px solid ${isConnected(s.key) ? '#86efac' : '#e2e8f0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>
            {s.icon}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={S.empty}>Loading integrations…</div>
      ) : (
        <div style={S.grid}>
          {filtered.map(service => (
            <ServiceCard
              key={service.key}
              service={service}
              values={config[service.key] || {}}
              connected={isConnected(service.key)}
              saving={saving === service.key}
              savedAt={savedAt[service.key]}
              onUpdate={(fieldKey, value) => updateField(service.key, fieldKey, value)}
              onSave={() => saveService(service.key)}
              onDisconnect={() => disconnect(service.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, values, connected, saving, savedAt, onUpdate, onSave, onDisconnect }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      ...S.card,
      borderColor: connected ? '#86efac' : '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
        <div style={S.iconBox}>{service.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{service.name}</span>
            <span style={{
              padding: '2px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
              background: connected ? '#dcfce7' : '#fef3c7',
              color: connected ? '#166534' : '#92400e',
            }}>
              {connected ? '✓ Connected' : 'Not connected'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{service.category}</div>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 14px' }}>
        {service.description}
      </p>

      {/* Used by badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>USED BY:</span>
        {service.usedBy.map(page => (
          <span key={page} style={{
            padding: '2px 8px', borderRadius: '4px',
            background: '#f1f5f9', fontSize: '10px', fontWeight: 600, color: '#475569',
          }}>{page}</span>
        ))}
      </div>

      {/* Free tier info */}
      <div style={{
        padding: '8px 12px', borderRadius: '8px',
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        fontSize: '12px', color: '#166534', fontWeight: 600,
        marginBottom: '14px',
      }}>
        💚 {service.free}
      </div>

      {/* Connect / configure button */}
      {!expanded ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setExpanded(true)} style={{
            ...S.connectBtn,
            background: connected ? '#f1f5f9' : 'linear-gradient(135deg, #D4A853, #C49040)',
            color: connected ? '#475569' : '#1a0f08',
          }}>
            {connected ? '⚙ Configure' : '🔌 Connect'}
          </button>
          {service.docs && (
            <a href={service.docs} target="_blank" rel="noreferrer" style={S.docsLink}>
              Docs ↗
            </a>
          )}
        </div>
      ) : (
        <div>
          {/* API key fields */}
          {service.fields.map(field => (
            <div key={field.key} style={{ marginBottom: '12px' }}>
              <label style={S.label}>{field.label}</label>
              <input
                type={field.type === 'password' ? 'password' : 'text'}
                value={values[field.key] || ''}
                onChange={e => onUpdate(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={S.input}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={onSave} disabled={saving} style={S.saveBtn}>
              {saving ? '⏳ Saving…' : '✓ Save'}
            </button>
            <button onClick={() => setExpanded(false)} style={S.cancelBtn}>
              Close
            </button>
            {connected && (
              <button onClick={onDisconnect} style={S.disconnectBtn}>
                Disconnect
              </button>
            )}
          </div>

          {savedAt && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#166534' }}>
              ✓ Saved {savedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  root: { padding: '28px 32px 60px', maxWidth: '1100px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#64748b' },
  search: { padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', width: '260px', fontFamily: 'inherit', color: '#0f172a' },
  statusBar: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  card: { background: 'white', border: '1.5px solid', borderRadius: '14px', padding: '22px', transition: 'border-color 200ms' },
  iconBox: { width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 },
  connectBtn: { flex: 1, padding: '10px 18px', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
  docsLink: { padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' },
  label: { display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'ui-monospace, monospace', color: '#0f172a', boxSizing: 'border-box' },
  saveBtn: { padding: '8px 20px', background: 'linear-gradient(135deg, #D4A853, #C49040)', color: '#1a0f08', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
  cancelBtn: { padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#475569', fontFamily: 'inherit' },
  disconnectBtn: { padding: '8px 16px', background: 'transparent', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#dc2626', fontWeight: 600, fontFamily: 'inherit', marginLeft: 'auto' },
  empty: { padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' },
};
