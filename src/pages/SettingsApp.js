import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';
import { isHintsEnabled, setHintsEnabled } from '../components/HintTooltip';
import { DEFAULT_HINTS, loadCustomHints, saveCustomHints } from '../components/GlobalTooltip';
import { useDevMode } from '../components/DevMode';

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
  { key: 'library_name', label: 'Library / Cafe Name', type: 'text', tourId: 'setting-library-name' },
  { key: 'fine_rate_per_day', label: 'Fine Rate Per Day (₹)', type: 'number', tourId: 'setting-fine-rate' },
  { key: 'default_loan_days', label: 'Default Loan Period (Days)', type: 'number', tourId: 'setting-loan-days' },
  { key: 'max_books_basic', label: 'Max Books (Basic Plan)', type: 'number' },
  { key: 'max_books_premium', label: 'Max Books (Premium Plan)', type: 'number' },
  { key: 'library_open_time', label: 'Opening Time', type: 'time' },
  { key: 'library_close_time', label: 'Closing Time', type: 'time' },
  { key: 'cafe_enabled', label: 'Cafe Module Enabled', type: 'toggle', tourId: 'module-toggles' },
  { key: 'events_enabled', label: 'Events Module Enabled', type: 'toggle' },
  { key: 'marketing_enabled', label: 'Marketing Module Enabled', type: 'toggle' },
  { key: 'store_enabled', label: 'Online Store Enabled', type: 'toggle' },
  { key: 'fine_grace_period_days', label: 'Fine Grace Period (Days)', type: 'number', tourId: 'setting-grace-period' },
  { key: 'fine_max_cap', label: 'Max Fine Cap Per Book (₹)', type: 'number' },
  { key: 'fine_rate_student', label: 'Fine Rate - Student (₹/day)', type: 'number' },
  { key: 'fine_rate_premium', label: 'Fine Rate - Premium (₹/day)', type: 'number' },
  { key: 'fine_rate_family', label: 'Fine Rate - Family (₹/day)', type: 'number' },
  { key: '_divider_email', label: '📧 Email Notifications', type: 'divider' },
  { key: 'email_notifications_enabled', label: 'Email Notifications Enabled', type: 'toggle', tourId: 'setting-email-toggle' },
  { key: 'smtp_email', label: 'Gmail Address (sender)', type: 'text' },
  { key: 'smtp_password', label: 'Gmail App Password', type: 'password' },
  { key: '_divider_whatsapp', label: '📱 WhatsApp Notifications', type: 'divider' },
  { key: 'whatsapp_mode', label: 'WhatsApp Mode', type: 'select', options: [{ value: 'link', label: 'wa.me Link (free)' }, { value: 'api', label: 'Business API (automated)' }] },
  { key: 'whatsapp_api_key', label: 'WhatsApp API Token (Business API only)', type: 'password' },
  { key: 'whatsapp_phone_id', label: 'WhatsApp Phone Number ID', type: 'text' },
  { key: '_divider_report', label: '📊 Daily Report', type: 'divider' },
  { key: 'daily_report_enabled', label: 'Daily Morning Report', type: 'toggle' },
  { key: 'daily_report_email', label: 'Report Recipient Email', type: 'text' },
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

export default function SettingsApp({ onStartTour }) {
  const toast = useToast();
  const navigate = useNavigate();
  const devModeCtx = useDevMode();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hintsOn, setHintsOn] = useState(isHintsEnabled());
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showEditHints, setShowEditHints] = useState(false);
  const [editingHints, setEditingHints] = useState({});
  const [hintSearch, setHintSearch] = useState('');

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
          {SETTINGS_CONFIG.map(cfg => {
            if (cfg.type === 'divider') return (
              <div key={cfg.key} data-tour={cfg.key === '_divider_email' ? 'email-settings' : cfg.key === '_divider_whatsapp' ? 'whatsapp-settings' : undefined} style={{ padding: '18px 0 8px', borderBottom: '2px solid #667eea', marginTop: '12px' }}>
                <label style={{ fontSize: '15px', fontWeight: '700', color: '#333' }}>{cfg.label}</label>
              </div>
            );
            return (
            <div key={cfg.key} data-tour={cfg.tourId} className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f0f0', gap: '16px' }}>
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
              ) : cfg.type === 'select' ? (
                <select value={settings[cfg.key] ?? ''} onChange={e => updateSetting(cfg.key, e.target.value)}
                  style={{ width: '250px', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }}>
                  {(cfg.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={cfg.type === 'select' ? 'text' : cfg.type} value={settings[cfg.key] ?? ''} onChange={e => updateSetting(cfg.key, cfg.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  placeholder={cfg.type === 'password' ? '••••••••' : ''}
                  style={{ width: cfg.type === 'time' ? '130px' : cfg.type === 'number' ? '100px' : '250px', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', textAlign: cfg.type === 'number' ? 'center' : 'left' }}
                />
              )}
            </div>
          );})}
        </div>
      )}

      {/* ── DEVELOPER MODE ────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: '20px', marginTop: '28px', marginBottom: '14px' }}>🛠 Developer</h2>
      <div style={{ background: 'white', borderRadius: '10px', padding: '24px' }}>
        <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f0f0', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>🛠 Developer Mode</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Edit any label, title, or tab name directly by clicking on it. A ✎ icon appears on editable elements.</div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" checked={devModeCtx.devMode} onChange={() => { devModeCtx.toggleDevMode(); toast.success(devModeCtx.devMode ? 'Developer mode OFF' : 'Developer mode ON — click any label to edit'); }}
              style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: devModeCtx.devMode ? '#667eea' : '#ccc', borderRadius: '26px', transition: 'background 0.3s',
            }}>
              <span style={{
                position: 'absolute', left: devModeCtx.devMode ? '24px' : '2px',
                top: '2px', width: '22px', height: '22px', background: 'white', borderRadius: '50%', transition: 'left 0.3s',
              }} />
            </span>
          </label>
        </div>
        {devModeCtx.devMode && (
          <div style={{ padding: '14px 0' }}>
            <p style={{ fontSize: '13px', color: '#667eea', marginBottom: '8px' }}>✎ Dev mode is ON — click on any label in the sidebar or page headers to rename it.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { devModeCtx.resetAll(); toast.success('All custom labels reset to defaults'); }}
                style={{ padding: '6px 14px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                Reset All Labels
              </button>
              <span style={{ fontSize: '12px', color: '#999', alignSelf: 'center' }}>
                {Object.keys(devModeCtx.customLabels).length} custom label(s)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── HELP & GUIDANCE ─────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: '20px', marginTop: '28px', marginBottom: '14px' }}>💡 Help & Guidance</h2>
      <div style={{ background: 'white', borderRadius: '10px', padding: '24px' }}>
        {/* Quick Tour */}
        <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f0f0', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>🚀 Quick Tour</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Step-by-step walkthrough of all features</div>
          </div>
          <button onClick={() => { if (onStartTour) onStartTour(); else { setShowTour(true); setTourStep(0); } }}
            style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            🚀 Start Interactive Tour
          </button>
        </div>

        {/* Hover Hints Toggle + Edit */}
        <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>💬 Hover Hints</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Show tooltip when hovering buttons, tabs, and sidebar items</div>
          </div>
          <button onClick={() => { setEditingHints({ ...DEFAULT_HINTS, ...loadCustomHints() }); setShowEditHints(true); }}
            style={{ padding: '6px 12px', background: '#f0f3ff', border: '1px solid #667eea', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#667eea', whiteSpace: 'nowrap' }}>
            ✏️ Edit
          </button>
          <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
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

      {/* ── EDIT HINTS MODAL ── */}
      {showEditHints && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={() => setShowEditHints(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '600px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>✏️ Edit Hover Hints</h3>
              <button onClick={() => setShowEditHints(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
            <input placeholder="Search hints..." value={hintSearch} onChange={e => setHintSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', marginBottom: '12px' }} />
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '14px' }}>
              {Object.entries(editingHints)
                .filter(([key]) => !hintSearch || key.includes(hintSearch.toLowerCase()))
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([key, val]) => (
                <div key={key} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: '120px', maxWidth: '140px', fontSize: '12px', fontWeight: '600', color: '#667eea', paddingTop: '8px', textTransform: 'capitalize' }}>
                    {key}
                  </div>
                  <input value={val} onChange={e => setEditingHints(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13px' }} />
                  <button onClick={() => setEditingHints(prev => { const n = { ...prev }; delete n[key]; return n; })}
                    style={{ padding: '6px 8px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                const custom = {};
                Object.entries(editingHints).forEach(([k, v]) => {
                  if (v !== DEFAULT_HINTS[k]) custom[k] = v;
                });
                saveCustomHints(custom);
                toast.success('Hints saved!');
                setShowEditHints(false);
              }} style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Save Hints
              </button>
              <button onClick={() => { saveCustomHints({}); setEditingHints({ ...DEFAULT_HINTS }); toast.success('Reset to defaults'); }}
                style={{ padding: '10px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Reset
              </button>
              <button onClick={() => setShowEditHints(false)}
                style={{ padding: '10px 16px', background: '#e0e0e0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
