import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { isHintsEnabled, setHintsEnabled } from '../components/HintTooltip';

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON app_settings FOR ALL USING (true) WITH CHECK (true);
INSERT INTO app_settings (key, value) VALUES
  ('library_name', '"Tapas Reading Cafe"'),
  ('fine_rate_per_day', '10'),
  ('default_loan_days', '14'),
  ('max_books_basic', '5'),
  ('max_books_premium', '10'),
  ('library_open_time', '"09:00"'),
  ('library_close_time', '"21:00"'),
  ('cafe_enabled', 'true'),
  ('events_enabled', 'true'),
  ('fine_grace_period_days', '3'),
  ('fine_max_cap', '200'),
  ('fine_rate_student', '5'),
  ('fine_rate_premium', '8'),
  ('fine_rate_family', '5')
ON CONFLICT (key) DO NOTHING;`;

const SETTINGS_CONFIG = [
  { key: 'library_name', label: 'Library / Cafe Name', type: 'text' },
  { key: 'fine_rate_per_day', label: 'Fine Rate Per Day (₹)', type: 'number' },
  { key: 'default_loan_days', label: 'Default Loan Period (Days)', type: 'number' },
  { key: 'max_books_basic', label: 'Max Books (Basic Plan)', type: 'number' },
  { key: 'max_books_premium', label: 'Max Books (Premium Plan)', type: 'number' },
  { key: 'library_open_time', label: 'Opening Time', type: 'time' },
  { key: 'library_close_time', label: 'Closing Time', type: 'time' },
  { key: 'cafe_enabled', label: 'Cafe Module Enabled', type: 'toggle' },
  { key: 'events_enabled', label: 'Events Module Enabled', type: 'toggle' },
  { key: 'fine_grace_period_days', label: 'Fine Grace Period (Days)', type: 'number' },
  { key: 'fine_max_cap', label: 'Max Fine Cap Per Book (₹)', type: 'number' },
  { key: 'fine_rate_student', label: 'Fine Rate - Student (₹/day)', type: 'number' },
  { key: 'fine_rate_premium', label: 'Fine Rate - Premium (₹/day)', type: 'number' },
  { key: 'fine_rate_family', label: 'Fine Rate - Family (₹/day)', type: 'number' },
];

// Quick tour steps
const TOUR_STEPS = [
  { path: '/', title: 'Dashboard', desc: 'Your library overview — metrics, charts, and activity at a glance.' },
  { path: '/books', title: 'Books', desc: 'Manage your entire book catalog — add, edit, search, and track stock.' },
  { path: '/Borrow', title: 'Borrow', desc: 'Check out and return books. Track active borrows and overdue items.' },
  { path: '/cafe/menu', title: 'Cafe POS', desc: 'Take cafe orders — tea, coffee, bakery items with cart and payment.' },
  { path: '/members', title: 'Members', desc: 'Manage members, plans, and subscriptions.' },
  { path: '/events', title: 'Events', desc: 'Create events, manage registrations, and track attendance.' },
  { path: '/pos', title: 'Library POS', desc: 'Process payments for memberships, fines, printing, and services.' },
  { path: '/reports', title: 'Reports', desc: 'Revenue, top books, overdue tracking, and expiring subscriptions.' },
  { path: '/settings/app', title: 'Settings', desc: 'Configure fine rates, loan periods, hours, and app preferences.' },
];

export default function SettingsApp() {
  const toast = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hintsOn, setHintsOn] = useState(isHintsEnabled());
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    const check = async () => {
      const { error } = await supabase.from('app_settings').select('key').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      fetchSettings();
    };
    check();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_settings').select('*');
    const map = {};
    (data || []).forEach(row => {
      let val = row.value;
      if (typeof val === 'string') try { val = JSON.parse(val); } catch {}
      map[row.key] = val;
    });
    setSettings(map);
    setLoading(false);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(settings).map(([key, value]) =>
        supabase.from('app_settings').upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() })
      );
      await Promise.all(promises);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { toast.error('Error: ' + err.message); }
    setSaving(false);
  };

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>🔧 App Settings</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px' }}>
          <h3>Setup Required</h3>
          <pre style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', marginTop: '8px' }}>{SETUP_SQL}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Check Again</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '700px' }}>
      <style>{`
        @media (max-width: 768px) { .settings-form { padding: 16px !important; } .settings-row { flex-direction: column !important; } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>🔧 App Settings</h1>
        <button onClick={saveAll} disabled={saving} style={{ padding: '8px 20px', background: saved ? '#1dd1a1' : '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.3s' }}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      {loading ? <p style={{ color: '#999' }}>Loading...</p> : (
        <div className="settings-form" style={{ background: 'white', borderRadius: '10px', padding: '24px' }}>
          {SETTINGS_CONFIG.map(cfg => (
            <div key={cfg.key} className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f0f0', gap: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#333', flex: 1 }}>{cfg.label}</label>
              {cfg.type === 'toggle' ? (
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={settings[cfg.key] === true || settings[cfg.key] === 'true'} onChange={e => updateSetting(cfg.key, e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: (settings[cfg.key] === true || settings[cfg.key] === 'true') ? '#667eea' : '#ccc',
                    borderRadius: '26px', transition: 'background 0.3s',
                  }}>
                    <span style={{
                      position: 'absolute', left: (settings[cfg.key] === true || settings[cfg.key] === 'true') ? '24px' : '2px',
                      top: '2px', width: '22px', height: '22px', background: 'white', borderRadius: '50%', transition: 'left 0.3s',
                    }} />
                  </span>
                </label>
              ) : (
                <input
                  type={cfg.type} value={settings[cfg.key] ?? ''} onChange={e => updateSetting(cfg.key, cfg.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  style={{ width: cfg.type === 'time' ? '130px' : cfg.type === 'number' ? '100px' : '250px', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', textAlign: cfg.type === 'number' ? 'center' : 'left' }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── HELP & GUIDANCE ─────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: '20px', marginTop: '28px', marginBottom: '14px' }}>💡 Help & Guidance</h2>
      <div style={{ background: 'white', borderRadius: '10px', padding: '24px' }}>
        {/* Quick Tour */}
        <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f0f0', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>🚀 Quick Tour</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Step-by-step walkthrough of all features</div>
          </div>
          <button onClick={() => { setShowTour(true); setTourStep(0); }}
            style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            Start Tour
          </button>
        </div>

        {/* Hover Hints Toggle */}
        <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>💬 Hover Hints</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Show description tooltip when hovering sidebar items</div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
            <input type="checkbox" checked={hintsOn} onChange={e => { setHintsOn(e.target.checked); setHintsEnabled(e.target.checked); toast.success(e.target.checked ? 'Hover hints enabled' : 'Hover hints disabled'); }}
              style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: hintsOn ? '#667eea' : '#ccc', borderRadius: '26px', transition: 'background 0.3s',
            }}>
              <span style={{
                position: 'absolute', left: hintsOn ? '24px' : '2px',
                top: '2px', width: '22px', height: '22px', background: 'white', borderRadius: '50%', transition: 'left 0.3s',
              }} />
            </span>
          </label>
        </div>
      </div>

      {/* ── QUICK TOUR MODAL ── */}
      {showTour && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setShowTour(false)}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '0', maxWidth: '480px', width: '90%', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Progress */}
            <div style={{ height: '4px', background: '#f0f0f0' }}>
              <div style={{ height: '100%', background: 'linear-gradient(135deg, #667eea, #764ba2)', width: `${((tourStep + 1) / TOUR_STEPS.length) * 100}%`, transition: 'width 0.3s', borderRadius: '4px' }} />
            </div>

            <div style={{ padding: '28px 24px 20px' }}>
              <div style={{ fontSize: '12px', color: '#667eea', fontWeight: '700', marginBottom: '6px' }}>
                STEP {tourStep + 1} OF {TOUR_STEPS.length}
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '22px', color: '#333' }}>
                {TOUR_STEPS[tourStep].title}
              </h3>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px' }}>
                {TOUR_STEPS[tourStep].desc}
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                <button onClick={() => setTourStep(Math.max(0, tourStep - 1))} disabled={tourStep === 0}
                  style={{ padding: '8px 18px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', opacity: tourStep === 0 ? 0.4 : 1 }}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setShowTour(false); navigate(TOUR_STEPS[tourStep].path); }}
                    style={{ padding: '8px 18px', background: '#f0f3ff', border: '1px solid #667eea', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: '#667eea' }}>
                    Go There →
                  </button>
                  {tourStep < TOUR_STEPS.length - 1 ? (
                    <button onClick={() => setTourStep(tourStep + 1)}
                      style={{ padding: '8px 18px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                      Next →
                    </button>
                  ) : (
                    <button onClick={() => { setShowTour(false); toast.success('Tour complete! You\'re all set.'); }}
                      style={{ padding: '8px 18px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                      ✓ Finish
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Step dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '12px', background: '#f8f9fa' }}>
              {TOUR_STEPS.map((_, i) => (
                <div key={i} onClick={() => setTourStep(i)} style={{
                  width: i === tourStep ? '20px' : '8px', height: '8px',
                  borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                  background: i === tourStep ? '#667eea' : i < tourStep ? '#1dd1a1' : '#ddd',
                }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
