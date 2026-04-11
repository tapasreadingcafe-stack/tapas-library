import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const { member } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'otp' | 'signup'
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (member) navigate('/member');
  }, [member, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/member');
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
      navigate('/member');
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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile`,
          data: { name: fullName.trim() },
        },
      });
      if (error) throw error;
      // If session is returned immediately (email confirmation disabled), go straight in.
      if (data.session) {
        navigate('/profile');
        return;
      }
      // Otherwise show the "check your email" message.
      setInfo(`✅ Account created! Check ${email} for a confirmation link. Once confirmed, come back and log in.`);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', fontFamily:'Lato, sans-serif', background:'linear-gradient(135deg, #FDF8F0, #FAEBD7)' }}>
      <div style={{ width:'100%', maxWidth:'440px' }}>

        {/* Card */}
        <div style={{ background:'white', borderRadius:'24px', padding:'40px', boxShadow:'0 20px 60px rgba(44,24,16,0.12)' }}>

          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>📚</div>
            <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'30px', fontWeight:'700', color:'#2C1810', marginBottom:'8px' }}>
              {mode === 'signup' ? 'Create Account' : 'Member Login'}
            </h1>
            <p style={{ color:'#8B6914', fontSize:'14px' }}>
              {mode === 'signup'
                ? 'Join Tapas Reading Cafe to shop, borrow, and reserve.'
                : 'Welcome back! Access your books, reservations, and more.'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div style={{ display:'flex', background:'#FFF8ED', borderRadius:'12px', padding:'4px', marginBottom:'28px', gap:'2px' }}>
            {[['login','Login'],['otp','OTP'],['signup','Sign Up']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setInfo(''); setOtpSent(false); }} style={{
                flex:1, padding:'10px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'Lato, sans-serif',
                background: mode === m ? '#2C1810' : 'transparent',
                color: mode === m ? '#F5DEB3' : '#8B6914',
                fontWeight: mode === m ? '700' : '400', fontSize:'14px', transition:'all 0.2s'
              }}>
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background:'rgba(252,129,129,0.15)', border:'1px solid #FC8181', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', color:'#9B2335', fontSize:'14px' }}>
              ⚠️ {error}
            </div>
          )}
          {info && (
            <div style={{ background:'rgba(72,187,120,0.12)', border:'1px solid #48BB78', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', color:'#276749', fontSize:'14px' }}>
              {info}
            </div>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Full Name</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
                  style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"
                  style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password"
                  style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', boxSizing:'border-box' }} />
              </div>
              <button type="submit" disabled={loading} style={{
                padding:'14px', background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
                border:'none', borderRadius:'12px', fontWeight:'700', fontSize:'16px', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily:'Lato, sans-serif', marginTop:'4px'
              }}>
                {loading ? '⏳ Creating account...' : '✨ Create My Account'}
              </button>
              <p style={{ textAlign:'center', color:'#8B6914', fontSize:'12px', margin:'4px 0 0 0' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }} style={{ background:'none', border:'none', color:'#D4A853', fontWeight:'700', cursor:'pointer', fontSize:'12px', padding:0 }}>
                  Log in →
                </button>
              </p>
            </form>
          )}

          {mode !== 'signup' && (<>
          {mode === 'login' ? (
            <form onSubmit={handleEmailLogin} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Email Address</label>
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='#D4A853'}
                  onBlur={e => e.target.style.borderColor='#F5DEB3'}
                />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Password</label>
                <input
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='#D4A853'}
                  onBlur={e => e.target.style.borderColor='#F5DEB3'}
                />
              </div>
              <button type="submit" disabled={loading} style={{
                padding:'14px', background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3',
                border:'none', borderRadius:'12px', fontWeight:'700', fontSize:'16px', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily:'Lato, sans-serif', marginTop:'4px'
              }}>
                {loading ? '⏳ Logging in...' : '🔓 Login to My Account'}
              </button>
            </form>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom:'16px' }}>
                    <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Email Address</label>
                    <input
                      type="email" required
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', boxSizing:'border-box' }}
                    />
                  </div>
                  <button type="submit" disabled={loading} style={{
                    width:'100%', padding:'14px', background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
                    border:'none', borderRadius:'12px', fontWeight:'700', fontSize:'16px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'Lato, sans-serif'
                  }}>
                    {loading ? '⏳ Sending...' : '📧 Send OTP to Email'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ textAlign:'center', background:'rgba(72,187,120,0.1)', border:'1px solid #48BB78', borderRadius:'8px', padding:'12px', marginBottom:'16px', color:'#276749', fontSize:'14px' }}>
                    ✅ OTP sent to <strong>{email}</strong>
                  </div>
                  <div style={{ marginBottom:'16px' }}>
                    <label style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>Enter OTP</label>
                    <input
                      required
                      value={otp} onChange={e => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      style={{ width:'100%', padding:'12px 16px', border:'2px solid #F5DEB3', borderRadius:'8px', fontSize:'15px', outline:'none', fontFamily:'Lato, sans-serif', textAlign:'center', letterSpacing:'4px', boxSizing:'border-box' }}
                    />
                  </div>
                  <button type="submit" disabled={loading} style={{
                    width:'100%', padding:'14px', background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3',
                    border:'none', borderRadius:'12px', fontWeight:'700', fontSize:'16px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'Lato, sans-serif', marginBottom:'10px'
                  }}>
                    {loading ? '⏳ Verifying...' : '✅ Verify & Login'}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} style={{ width:'100%', padding:'10px', background:'transparent', border:'1px solid #F5DEB3', borderRadius:'8px', color:'#8B6914', cursor:'pointer', fontSize:'13px', fontFamily:'Lato, sans-serif' }}>
                    ← Change Email
                  </button>
                </form>
              )}
            </div>
          )}
          </>)}

          {mode !== 'signup' && (
            <div style={{ marginTop:'24px', textAlign:'center' }}>
              <p style={{ color:'#8B6914', fontSize:'14px' }}>
                Not a member yet?{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(''); setInfo(''); }} style={{ background:'none', border:'none', color:'#D4A853', fontWeight:'700', cursor:'pointer', fontSize:'14px', padding:0 }}>
                  Create an account →
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ marginTop:'24px', textAlign:'center' }}>
          <p style={{ color:'#8B6914', fontSize:'13px' }}>
            🔒 Your account is secured by Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
