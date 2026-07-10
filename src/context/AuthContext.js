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

// Reject if a promise doesn't settle in time, so a hung auth/network call
// surfaces as an error the UI can recover from instead of spinning forever.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    ),
  ]);
}

async function fetchStaffRow(email) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Offline auth cache ─────────────────────────────────────────────────
// The staff row is cached after a successful online sign-in so that, on a
// trusted single counter device (see docs/offline-first-plan.md), an already
// signed-in user can keep working when the network drops — instead of being
// stranded at the login screen because the staff lookup can't reach Supabase.
const STAFF_CACHE_KEY = 'tapas_staff_cache';

function cacheStaff(row) {
  try { if (row && row.is_active) localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(row)); } catch {}
}
function readCachedStaff(email) {
  try {
    const raw = localStorage.getItem(STAFF_CACHE_KEY);
    if (!raw) return null;
    const row = JSON.parse(raw);
    if (!row || !row.is_active) return null;
    if (email && row.email !== email) return null;
    return row;
  } catch { return null; }
}
function clearStaffCache() {
  try { localStorage.removeItem(STAFF_CACHE_KEY); } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [staff, setStaff]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const inactivityTimer               = useRef(null);
  const isRefreshing                  = useRef(false);

  const logout = useCallback(async (reason) => {
    clearTimeout(inactivityTimer.current);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    clearStaffCache();
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

  // ── Heartbeat: update last_login in DB ─────────────────────────────
  const updateHeartbeat = useCallback(async (staffId) => {
    if (!staffId) return;
    try {
      await supabase
        .from('staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', staffId);
    } catch (e) {
      console.error('[Auth] heartbeat error:', e);
    }
  }, []);

  // ── Refresh staff data (permissions + heartbeat) ───────────────────
  const refreshStaff = useCallback(async () => {
    if (!user || isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      const row = await fetchStaffRow(user.email);
      if (!row || !row.is_active) { logout(); return; }
      setStaff(row);
      updateHeartbeat(row.id);
    } catch (e) {
      console.error('[Auth] refresh error:', e);
    } finally {
      isRefreshing.current = false;
    }
  }, [user, logout, updateHeartbeat]);

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

        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

        let session = null;
        try {
          ({ data: { session } } = await supabase.auth.getSession());
        } catch {
          session = null;
        }

        if (session?.user) {
          // Session found. Fetch the staff row; if that network call fails
          // (offline), fall back to the cached staff so an already-signed-in
          // user keeps working with no connection.
          let staffRow;
          try {
            staffRow = await fetchStaffRow(session.user.email);
            if (staffRow && staffRow.is_active) cacheStaff(staffRow);
          } catch (netErr) {
            const cached = readCachedStaff(session.user.email);
            if (cached) {
              if (!cancelled) { setUser(session.user); setStaff(cached); setLoading(false); }
              return;
            }
            throw netErr; // no cache → surface as before (falls to login)
          }
          if (!cancelled) {
            if (staffRow && staffRow.is_active) {
              setUser(session.user);
              setStaff(staffRow);
              updateHeartbeat(staffRow.id); // heartbeat
            } else {
              await supabase.auth.signOut();
              setStaff(staffRow ? { _deactivated: true } : { _not_staff: true });
            }
            setLoading(false);
          }
          return;
        }

        // No active session. If offline but this device signed in before,
        // grant offline access from the cached staff (trusted single counter
        // device). It re-validates automatically once back online.
        if (offline) {
          const cached = readCachedStaff();
          if (cached) {
            if (!cancelled) { setUser({ email: cached.email, _offline: true }); setStaff(cached); setLoading(false); }
            return;
          }
        }

        if (!cancelled) setLoading(false);
        return;
      } catch (e) {
        console.error('[Auth] init error:', e);
        if (!cancelled) setLoading(false);
      } finally {
        if (!cancelled) clearTimeout(watchdog);
      }
    };

    // Watchdog: never let the auth check spin forever. If getSession() or the
    // staff lookup hangs (flaky mobile network, stale/corrupt token), drop the
    // "Loading…" overlay after 10s so the gate falls through to the login
    // screen instead of trapping the user on an infinite spinner.
    const watchdog = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Auth] init watchdog fired — forcing loading=false');
        setLoading(false);
      }
    }, 10000);

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
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, [updateHeartbeat]);

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

  // ── Periodic refresh (2 min) + tab focus refresh ───────────────────
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshStaff, 2 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshStaff();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, refreshStaff]);

  // ── Login ──────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      15000,
      'Sign-in'
    );
    if (error) throw error;

    const staffRow = await withTimeout(fetchStaffRow(data.user.email), 15000, 'Staff lookup');
    if (staffRow && staffRow.is_active) {
      cacheStaff(staffRow); // enable offline access next time the network drops
      setUser(data.user);
      setStaff(staffRow);
      setSessionExpired(false);
      // Update last_login on login (heartbeat)
      updateHeartbeat(staffRow.id);
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
      login, logout, sendPasswordReset, changePassword, isAdmin, refreshStaff,
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
