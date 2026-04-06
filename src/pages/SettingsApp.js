import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/Toast';

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
  ('events_enabled', 'true')
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
];

export default function SettingsApp() {
  const toast = useToast();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    </div>
  );
}
