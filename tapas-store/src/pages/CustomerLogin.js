import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';

// =====================================================================
// CustomerLogin — 2025-2026 redesign
// Modern auth card with segmented mode toggle, rounded inputs, subtle
// glass morphism background. Dark-mode aware.
// =====================================================================

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { member } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (member) navigate('/profile');
  }, [member, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile`,
          data: { name: fullName.trim() },
        },
      });
      if (error) throw error;
      if (data.session) { navigate('/profile'); return; }
      setInfo(`✅ Account created! Check ${email} for a confirmation link.`);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'85vh',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'40px 20px',
      fontFamily:'var(--font-body)',
      background:'var(--bg)',
      position:'relative',
      overflow:'hidden',
    }}>
      {/* Atmosphere glow */}
      <div style={{ position:'absolute', top:'-120px', left:'-120px', width:'380px', height:'380px', borderRadius:'50%', background:'radial-gradient(circle, rgba(212,168,83,0.18), transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-120px', right:'-120px', width:'380px', height:'380px', borderRadius:'50%', background:'radial-gradient(circle, rgba(44,24,16,0.15), transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'460px', position:'relative', zIndex:1 }}>
        <div className="tps-card tps-animate-pop" style={{
          padding:'44px 40px',
          borderRadius:'var(--radius-2xl)',
          boxShadow:'var(--shadow-xl)',
        }}>
          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <div style={{ fontSize:'52px', marginBottom:'10px' }}>📚</div>
            <h1 className="tps-h3" style={{ marginBottom:'8px' }}>
              {mode === 'signup' ? 'Create Account' : 'Welcome back'}
            </h1>
            <p className="tps-subtle" style={{ fontSize:'14px' }}>
              {mode === 'signup'
                ? 'Join Tapas Reading Cafe to shop, borrow, and reserve.'
                : 'Access your books, reservations, and more.'}
            </p>
          </div>

          {/* Mode toggle segmented control */}
          <div style={{
            display:'flex',
            background:'var(--bg-muted)',
            borderRadius:'var(--radius-pill)',
            padding:'4px',
            marginBottom:'28px',
            gap:'2px',
          }}>
            {[['login','Login'],['otp','OTP'],['signup','Sign Up']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setInfo(''); setOtpSent(false); }} style={{
                flex:1, padding:'10px', borderRadius:'var(--radius-pill)', border:'none', cursor:'pointer',
                fontFamily:'var(--font-body)',
                background: mode === m ? 'var(--text)' : 'transparent',
                color: mode === m ? 'var(--bg)' : 'var(--text-subtle)',
                fontWeight: mode === m ? '800' : '600', fontSize:'13px',
                transition:'all 200ms var(--ease)',
              }}>
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="tps-badge tps-badge-danger" style={{ display:'block', width:'100%', padding:'12px 14px', marginBottom:'18px', textTransform:'none', letterSpacing:'0', textAlign:'left', lineHeight:'1.5' }}>
              ⚠️ {error}
            </div>
          )}
          {info && (
            <div className="tps-badge tps-badge-success" style={{ display:'block', width:'100%', padding:'12px 14px', marginBottom:'18px', textTransform:'none', letterSpacing:'0', textAlign:'left', lineHeight:'1.5' }}>
              {info}
            </div>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <label className="tps-label">Full Name</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className="tps-input" />
              </div>
              <div>
                <label className="tps-label">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="tps-input" />
              </div>
              <div>
                <label className="tps-label">Password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="tps-input" />
              </div>
              <div>
                <label className="tps-label">Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="tps-input" />
              </div>
              <button type="submit" disabled={loading} className="tps-btn tps-btn-primary tps-btn-lg tps-btn-block" style={{ marginTop:'6px' }}>
                {loading ? '⏳ Creating account…' : '✨ Create My Account'}
              </button>
              <p className="tps-subtle" style={{ textAlign:'center', fontSize:'12px', margin:'4px 0 0 0' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }} style={{ background:'none', border:'none', color:'var(--brand-accent)', fontWeight:'800', cursor:'pointer', fontSize:'12px', padding:0 }}>
                  Log in →
                </button>
              </p>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleEmailLogin} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <label className="tps-label">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="tps-input" />
              </div>
              <div>
                <label className="tps-label">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="tps-input" />
              </div>
              <button type="submit" disabled={loading} className="tps-btn tps-btn-primary tps-btn-lg tps-btn-block" style={{ marginTop:'6px' }}>
                {loading ? '⏳ Logging in…' : '🔓 Login'}
              </button>
            </form>
          )}

          {mode === 'otp' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom:'16px' }}>
                    <label className="tps-label">Email Address</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="tps-input" />
                  </div>
                  <button type="submit" disabled={loading} className="tps-btn tps-btn-primary tps-btn-lg tps-btn-block">
                    {loading ? '⏳ Sending…' : '📧 Send OTP to Email'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className="tps-badge tps-badge-success" style={{ display:'block', width:'100%', padding:'12px', marginBottom:'18px', textTransform:'none', letterSpacing:'0', textAlign:'center' }}>
                    ✅ OTP sent to <strong>{email}</strong>
                  </div>
                  <div style={{ marginBottom:'16px' }}>
                    <label className="tps-label">Enter OTP</label>
                    <input required value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6}
                      className="tps-input"
                      style={{ textAlign:'center', letterSpacing:'8px', fontSize:'18px', fontWeight:'800' }} />
                  </div>
                  <button type="submit" disabled={loading} className="tps-btn tps-btn-primary tps-btn-lg tps-btn-block" style={{ marginBottom:'10px' }}>
                    {loading ? '⏳ Verifying…' : '✓ Verify & Login'}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="tps-btn tps-btn-ghost tps-btn-sm tps-btn-block">
                    ← Change Email
                  </button>
                </form>
              )}
            </div>
          )}

          {mode !== 'signup' && (
            <div style={{ marginTop:'24px', textAlign:'center' }}>
              <p className="tps-subtle" style={{ fontSize:'14px' }}>
                Not a member yet?{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(''); setInfo(''); }} style={{ background:'none', border:'none', color:'var(--brand-accent)', fontWeight:'800', cursor:'pointer', fontSize:'14px', padding:0 }}>
                  Create an account →
                </button>
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop:'20px', textAlign:'center' }}>
          <p className="tps-subtle" style={{ fontSize:'12px' }}>
            🔒 Secured by Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
