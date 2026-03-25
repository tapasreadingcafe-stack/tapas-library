import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

const INACTIVITY_MS = 8 * 60 * 60 * 1000; // 8 hours
const LAST_ACTIVITY_KEY = 'tapas_last_activity';

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);   // Supabase auth user
  const [staff, setStaff]             = useState(null);   // staff table row
  const [loading, setLoading]         = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const inactivityTimer               = useRef(null);

  // ─── logout ───────────────────────────────────────────────────────────
  const logout = useCallback(async (reason) => {
    clearTimeout(inactivityTimer.current);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setStaff(null);
    if (reason === 'inactivity') setSessionExpired(true);
  }, []);

  // ─── inactivity timer reset ───────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    inactivityTimer.current = setTimeout(() => logout('inactivity'), INACTIVITY_MS);
  }, [logout]);

  // ─── load staff profile from DB ──────────────────────────────────────
  const loadStaffProfile = useCallback(async (authUser) => {
    setUser(authUser);
    try {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (data) {
        if (!data.is_active) {
          // Account deactivated — sign out
          await supabase.auth.signOut();
          setUser(null);
          setStaff({ _deactivated: true });
          return;
        }
        setStaff(data);
        // Track last login (fire-and-forget)
        supabase.from('staff')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id)
          .then(() => {});
      } else {
        // No staff row yet — treat as basic staff so app doesn't crash
        setStaff({ email: authUser.email, role: 'staff', name: authUser.email, is_active: true, _no_record: true });
      }
    } catch (err) {
      console.error('Failed to load staff profile:', err);
      setStaff({ email: authUser.email, role: 'staff', name: authUser.email, is_active: true });
    }
  }, []);

  // ─── initialise on mount ─────────────────────────────────────────────
  useEffect(() => {
    // Safety: if env vars are missing, bail out immediately
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.error('[Auth] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY env vars.');
      setLoading(false);
      return;
    }

    // Timeout fallback: never stay stuck on loading more than 5s
    const timeout = setTimeout(() => {
      console.warn('[Auth] Auth check timed out after 5s — forcing loading=false');
      setLoading(false);
    }, 5000);

    const init = async () => {
      console.log('[Auth] Starting auth check...');
      try {
        // Check if session expired due to inactivity (across page refresh)
        const last = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (last && Date.now() - parseInt(last, 10) > INACTIVITY_MS) {
          console.log('[Auth] Session expired due to inactivity');
          await supabase.auth.signOut();
          setSessionExpired(true);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[Auth] getSession result:', session ? 'session found' : 'no session', error || '');
        if (session?.user) {
          await loadStaffProfile(session.user);
        }
      } catch (e) {
        console.error('[Auth] Init error:', e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
        console.log('[Auth] loading set to false');
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange event:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        setSessionExpired(false);
        await loadStaffProfile(session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setStaff(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [loadStaffProfile]);

  // ─── activity tracking (only when logged in) ─────────────────────────
  useEffect(() => {
    if (!user) return;
    const EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    EVENTS.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();
    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  // ─── public API ───────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  const changePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const isAdmin = () => staff?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, staff, loading, sessionExpired,
      login, logout, sendPasswordReset, changePassword, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
