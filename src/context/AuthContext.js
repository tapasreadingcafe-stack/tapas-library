import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);
const INACTIVITY_MS = 8 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'tapas_last_activity';

// =====================================================================
// Simple, robust auth. Two paths:
//   1. Mount → getSession → if session, query staff → done
//   2. Login button → signInWithPassword → query staff → done
// No caching tricks, no event-handler dedup, no refs.
// =====================================================================

async function fetchStaffRow(email) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [staff, setStaff]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const inactivityTimer               = useRef(null);

  const logout = useCallback(async (reason) => {
    clearTimeout(inactivityTimer.current);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    setStaff(null);
    if (reason === 'inactivity') setSessionExpired(true);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    inactivityTimer.current = setTimeout(() => logout('inactivity'), INACTIVITY_MS);
  }, [logout]);

  // ── Init: check existing session on mount ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Inactivity check
        const last = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (last && Date.now() - parseInt(last, 10) > INACTIVITY_MS) {
          await supabase.auth.signOut();
          if (!cancelled) { setSessionExpired(true); setLoading(false); }
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const staffRow = await fetchStaffRow(session.user.email);
        if (!cancelled) {
          if (staffRow && staffRow.is_active) {
            setUser(session.user);
            setStaff(staffRow);
          } else {
            // Valid session but not staff — sign out
            await supabase.auth.signOut();
            setStaff(staffRow ? { _deactivated: true } : { _not_staff: true });
          }
          setLoading(false);
        }
      } catch (e) {
        console.error('[Auth] init error:', e);
        if (!cancelled) setLoading(false);
      }
    };

    init();

    // Listen for sign-out (e.g. from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setStaff(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Activity tracking ──────────────────────────────────────────────
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

  // ── Login ──────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const staffRow = await fetchStaffRow(data.user.email);
    if (staffRow && staffRow.is_active) {
      setUser(data.user);
      setStaff(staffRow);
      setSessionExpired(false);
    } else {
      await supabase.auth.signOut();
      setStaff(staffRow ? { _deactivated: true } : { _not_staff: true });
      throw new Error(staffRow ? 'Account deactivated' : 'Not a staff account');
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
