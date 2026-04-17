import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';

// =====================================================================
// CustomerLogin — Modern Heritage design system
// Solid parchment card, bottom-line inputs, teal primary actions.
// NO glassmorphism — this is a full-page layout, not an overlay.
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
      setInfo(`Account created! Check ${email} for a confirmation link.`);
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
      {/* Subtle truffle radial glow */}
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle, rgba(38,23,12,0.06), transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'460px', position:'relative', zIndex:1 }}>
        <div style={{
          background:'var(--bg-card)',
          padding:'44px 40px',
          borderRadius:'var(--radius-2xl, 24px)',
          boxShadow:'var(--shadow-float, 0 16px 48px rgba(38,23,12,0.1))',
        }}>
          {/* Logo + Title */}
          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <div style={{ fontSize:'52px', marginBottom:'10px', lineHeight:1 }}>&#128218;</div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:'600', color:'var(--text)', marginBottom:'6px' }}>
              Welcome back
            </h1>
            <p style={{ color:'var(--text-subtle)', fontSize:'14px', fontFamily:'var(--font-body)' }}>
              Member Login
            </p>
          </div>

          {/* Mode toggle — truffle chips */}
          <div style={{
            display:'flex',
            background:'var(--bg-inset)',
            borderRadius:'var(--radius-2xl, 24px)',
            padding:'4px',
            marginBottom:'28px',
            gap:'2px',
          }}>
            {[['login','Login'],['otp','OTP'],['signup','Sign Up']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setInfo(''); setOtpSent(false); }} style={{
                flex:1, padding:'10px', borderRadius:'20px', border:'none', cursor:'pointer',
                fontFamily:'var(--font-body)',
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? '#fbfbe2' : 'var(--text-subtle)',
                fontWeight: mode === m ? '700' : '500', fontSize:'13px',
                transition:'all 200ms ease',
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Error banner — danger chip */}
          {error && (
            <div style={{
              background:'rgba(155,35,53,0.1)', color:'#9B2335',
              borderRadius:'var(--radius-lg, 16px)', padding:'12px 14px', marginBottom:'18px',
              fontSize:'13px', fontWeight:'600', lineHeight:'1.5', fontFamily:'var(--font-body)',
            }}>
              {error}
            </div>
          )}
          {/* Success banner — teal chip */}
          {info && (
            <div style={{
              background:'rgba(0,106,106,0.1)', color:'var(--secondary)',
              borderRadius:'var(--radius-lg, 16px)', padding:'12px 14px', marginBottom:'18px',
              fontSize:'13px', fontWeight:'600', lineHeight:'1.5', fontFamily:'var(--font-body)',
            }}>
              {info}
            </div>
          )}

          {/* Sign Up form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
              <div>
                <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Full Name</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className="tps-input" />
              </div>
              <div>
                <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="tps-input" />
              </div>
              <div>
                <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="tps-input" />
              </div>
              <div>
                <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="tps-input" />
              </div>
              <button type="submit" disabled={loading} className="tps-btn tps-btn-teal tps-btn-lg tps-btn-block" style={{ marginTop:'6px' }}>
                {loading ? 'Creating account...' : 'Create My Account'}
              </button>
              <p style={{ textAlign:'center', fontSize:'12px', margin:'4px 0 0 0', color:'var(--text-subtle)', fontFamily:'var(--font-body)' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }} style={{ background:'none', border:'none', color:'var(--secondary)', fontWeight:'700', cursor:'pointer', fontSize:'12px', padding:0, fontFamily:'var(--font-display)', textDecoration:'underline' }}>
                  Log in
                </button>
              </p>
            </form>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleEmailLogin} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
              <div>
                <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="tps-input" />
              </div>
              <div>
                <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="tps-input" />
              </div>
              <button type="submit" disabled={loading} className="tps-btn tps-btn-teal tps-btn-lg tps-btn-block" style={{ marginTop:'6px' }}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {/* OTP form */}
          {mode === 'otp' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom:'18px' }}>
                    <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Email Address</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="tps-input" />
                  </div>
                  <button type="submit" disabled={loading} className="tps-btn tps-btn-teal tps-btn-lg tps-btn-block">
                    {loading ? 'Sending...' : 'Send OTP to Email'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{
                    background:'rgba(0,106,106,0.1)', color:'var(--secondary)',
                    borderRadius:'var(--radius-lg, 16px)', padding:'12px', marginBottom:'18px',
                    textAlign:'center', fontSize:'13px', fontWeight:'600', fontFamily:'var(--font-body)',
                  }}>
                    OTP sent to <strong>{email}</strong>
                  </div>
                  <div style={{ marginBottom:'18px' }}>
                    <label style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'1.5px', display:'block', marginBottom:'8px', fontFamily:'var(--font-body)' }}>Enter OTP</label>
                    <input required value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6}
                      className="tps-input"
                      style={{ textAlign:'center', letterSpacing:'8px', fontSize:'18px', fontWeight:'700' }} />
                  </div>
                  <button type="submit" disabled={loading} className="tps-btn tps-btn-teal tps-btn-lg tps-btn-block" style={{ marginBottom:'10px' }}>
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="tps-btn tps-btn-primary tps-btn-block" style={{ background:'transparent', color:'var(--text-subtle)', border:'none', fontSize:'13px' }}>
                    Change Email
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Switch to signup */}
          {mode !== 'signup' && (
            <div style={{ marginTop:'24px', textAlign:'center' }}>
              <p style={{ fontSize:'14px', color:'var(--text-subtle)', fontFamily:'var(--font-body)' }}>
                Not a member yet?{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(''); setInfo(''); }} style={{ background:'none', border:'none', color:'var(--secondary)', fontWeight:'700', cursor:'pointer', fontSize:'14px', padding:0, fontFamily:'var(--font-display)', textDecoration:'underline' }}>
                  Create an account
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer — staff access note */}
        <div style={{ marginTop:'20px', textAlign:'center' }}>
          <p style={{ fontSize:'12px', color:'var(--text-subtle)', fontFamily:'var(--font-body)' }}>
            Staff access only at <a href="/staff" style={{ color:'var(--text-subtle)', textDecoration:'underline' }}>/staff</a>
          </p>
        </div>
      </div>
    </div>
  );
}
