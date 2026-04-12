import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

const INACTIVITY_MS = 8 * 60 * 60 * 1000; // 8 hours
const LAST_ACTIVITY_KEY = 'tapas_last_activity';
// Cache the staff profile in sessionStorage so we can show the dashboard
// instantly on refresh without waiting for a Supabase round-trip.
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
  // Optimistic initialisation from cache — lets us skip the loading
  // spinner entirely when the user refreshes with a valid session.
  const cached = readCachedStaff();
  const [user, setUser]               = useState(null);
  const [staff, setStaff]             = useState(cached);
  const [loading, setLoading]         = useState(!cached); // skip loading if cached
  const [sessionExpired, setSessionExpired] = useState(false);
  const inactivityTimer               = useRef(null);
  const staffLoadedRef                = useRef(false); // prevent double-load

  // ─── logout ───────────────────────────────────────────────────────────
  const logout = useCallback(async (reason) => {
    clearTimeout(inactivityTimer.current);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    sessionStorage.removeItem(STAFF_CACHE_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setStaff(null);
    staffLoadedRef.current = false;
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
    // Prevent duplicate loads from init() + onAuthStateChange racing.
    if (staffLoadedRef.current) return;
    staffLoadedRef.current = true;

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
        const sentinel = { _not_staff: true };
        setStaff(sentinel);
        writeCachedStaff(null);
        return;
      }

      if (!data.is_active) {
        await supabase.auth.signOut();
        setUser(null);
        const sentinel = { _deactivated: true };
        setStaff(sentinel);
        writeCachedStaff(null);
        return;
      }

      setStaff(data);
      writeCachedStaff(data);
      // Track last login (fire-and-forget)
      supabase.from('staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {});
    } catch (err) {
      console.error('Failed to load staff profile:', err);
      try { await supabase.auth.signOut(); } catch (_) {}
      setUser(null);
      const sentinel = { _error: err.message || String(err) };
      setStaff(sentinel);
      writeCachedStaff(null);
    }
  }, []);

  // ─── initialise on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.error('[Auth] Missing env vars.');
      setLoading(false);
      return;
    }

    // Timeout fallback: never stay stuck on loading more than 4s
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    // We rely on onAuthStateChange as the single source of truth.
    // Supabase v2 fires INITIAL_SESSION on mount (with the stored
    // session if any), then SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
    // as the session changes. Handling INITIAL_SESSION the same way
    // as SIGNED_IN prevents the "refresh = auto-logout" bug.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user) {
          // Check inactivity BEFORE loading the profile.
          const last = localStorage.getItem(LAST_ACTIVITY_KEY);
          if (last && Date.now() - parseInt(last, 10) > INACTIVITY_MS) {
            await supabase.auth.signOut();
            setSessionExpired(true);
            setLoading(false);
            clearTimeout(timeout);
            return;
          }

          setSessionExpired(false);
          await loadStaffProfile(session.user);
        }
        setLoading(false);
        clearTimeout(timeout);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setStaff(null);
        staffLoadedRef.current = false;
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
    staffLoadedRef.current = false; // allow fresh profile load
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
