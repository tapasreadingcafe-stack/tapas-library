import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

const INACTIVITY_MS = 8 * 60 * 60 * 1000; // 8 hours
const LAST_ACTIVITY_KEY = 'tapas_last_activity';
const STAFF_CACHE_KEY = 'tapas_staff_cache';

function readCachedStaff() {
  try {
    const raw = sessionStorage.getItem(STAFF_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function writeCachedStaff(staff) {
  try {
    if (staff && !staff._not_staff && !staff._deactivated && !staff._error) {
      sessionStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(staff));
    } else {
      sessionStorage.removeItem(STAFF_CACHE_KEY);
    }
  } catch {}
}

export function AuthProvider({ children }) {
  const cached = readCachedStaff();
  const [user, setUser]               = useState(cached ? { email: cached.email, _cached: true } : null);
  const [staff, setStaff]             = useState(cached);
  const [loading, setLoading]         = useState(!cached);
  const [sessionExpired, setSessionExpired] = useState(false);
  const inactivityTimer               = useRef(null);

  // ─── logout ───────────────────────────────────────────────────────────
  const logout = useCallback(async (reason) => {
    clearTimeout(inactivityTimer.current);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    sessionStorage.removeItem(STAFF_CACHE_KEY);
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
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await supabase.auth.signOut();
        setUser(null);
        setStaff({ _not_staff: true });
        writeCachedStaff(null);
        return;
      }

      if (!data.is_active) {
        await supabase.auth.signOut();
        setUser(null);
        setStaff({ _deactivated: true });
        writeCachedStaff(null);
        return;
      }

      setStaff(data);
      writeCachedStaff(data);
      supabase.from('staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {});
    } catch (err) {
      console.error('Failed to load staff profile:', err);
      try { await supabase.auth.signOut(); } catch (_) {}
      setUser(null);
      setStaff({ _error: err.message || String(err) });
      writeCachedStaff(null);
    }
  }, []);

  // ─── initialise on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => setLoading(false), 4000);
    let profileLoaded = false; // local flag to deduplicate within this effect

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user) {
          const last = localStorage.getItem(LAST_ACTIVITY_KEY);
          if (last && Date.now() - parseInt(last, 10) > INACTIVITY_MS) {
            await supabase.auth.signOut();
            sessionStorage.removeItem(STAFF_CACHE_KEY);
            setUser(null);
            setStaff(null);
            setSessionExpired(true);
            setLoading(false);
            clearTimeout(timeout);
            return;
          }

          setSessionExpired(false);
          setUser(session.user);

          // Load staff profile — skip only if we JUST loaded it in
          // this same effect cycle (dedup INITIAL_SESSION + SIGNED_IN).
          if (!profileLoaded) {
            profileLoaded = true;
            await loadStaffProfile(session.user);
          }
        } else if (event === 'INITIAL_SESSION' && !session) {
          sessionStorage.removeItem(STAFF_CACHE_KEY);
          setUser(null);
          setStaff(null);
        }
        setLoading(false);
        clearTimeout(timeout);
      } else if (event === 'SIGNED_OUT') {
        profileLoaded = false;
        setUser(null);
        setStaff(null);
        sessionStorage.removeItem(STAFF_CACHE_KEY);
        setLoading(false);
        clearTimeout(timeout);
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

    // Query staff table directly here — don't rely on loadStaffProfile
    // or onAuthStateChange which have timing issues.
    if (data?.user) {
      try {
        const { data: staffRow } = await supabase
          .from('staff')
          .select('*')
          .eq('email', data.user.email)
          .maybeSingle();

        setUser(data.user);
        if (staffRow && staffRow.is_active) {
          setStaff(staffRow);
          writeCachedStaff(staffRow);
        } else {
          setStaff(staffRow ? { _deactivated: true } : { _not_staff: true });
          writeCachedStaff(null);
        }
      } catch (e) {
        // Staff query failed — still set user so we don't lose the session
        setUser(data.user);
        setStaff({ _error: e.message || 'Staff query failed' });
      }
    }

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
