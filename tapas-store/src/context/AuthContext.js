import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

// =====================================================================
// AuthContext for the customer store (tapas-store).
//
// Responsibilities:
//   - Track the Supabase auth user and the linked `members` row
//   - Repair the auth_user_id link on login if the DB trigger missed it
//     or the member was created walk-in before online signup
//   - Expose wishlistCount so the navbar badge stays in sync
//   - Provide login/logout helpers via Supabase Auth
//
// Staff dashboard has a separate AuthContext at src/context/AuthContext.js
// which reads the `staff` table. Do NOT share code between them —
// their trust boundaries are intentionally different.
// =====================================================================

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser]         = useState(null);
  const [member, setMember]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [wishlistCount, setWishlistCount] = useState(0);

  // -------------------------------------------------------------------
  // Load or repair the members row for a given auth user.
  //   1. Lookup by auth_user_id (happy path once the DB trigger has run)
  //   2. Fallback: lookup by email and repair the auth_user_id link
  //      (covers walk-in members who later sign up online)
  //   3. Last resort: insert a fresh row (if the trigger failed silently)
  // -------------------------------------------------------------------
  const loadMember = useCallback(async (user) => {
    setAuthUser(user);

    let row = null;

    // 1) by auth_user_id
    const { data: byAuth } = await supabase
      .from('members')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (byAuth) row = byAuth;

    // 2) repair path — find by email, relink
    if (!row && user.email) {
      const { data: byEmail } = await supabase
        .from('members')
        .select('*')
        .ilike('email', user.email)
        .maybeSingle();

      if (byEmail) {
        if (!byEmail.auth_user_id) {
          const { data: linked } = await supabase
            .from('members')
            .update({ auth_user_id: user.id })
            .eq('id', byEmail.id)
            .select('*')
            .single();
          row = linked || byEmail;
        } else {
          row = byEmail;
        }
      }
    }

    // 3) last-resort insert (trigger failure)
    if (!row) {
      const { data: created, error: insErr } = await supabase
        .from('members')
        .insert({
          auth_user_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Guest'),
          phone: user.phone || '',  // NOT NULL column — fill empty string for online signups
          customer_type: 'online',
          status: 'active',
        })
        .select('*')
        .single();
      if (insErr) {
        console.error('[Auth] member insert fallback failed:', insErr);
      }
      row = created || null;
    }

    setMember(row);

    if (row) {
      const { count } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', row.id);
      setWishlistCount(count || 0);
    } else {
      setWishlistCount(0);
    }
  }, []);

  // -------------------------------------------------------------------
  // Mount: pick up any existing session, wire up auth state changes.
  // -------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.error('[Auth] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          await loadMember(session.user);
        }
      } catch (err) {
        console.error('[Auth] init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Flip loading ON while we resolve the member row so downstream
        // pages don't race-redirect to /login before loadMember finishes.
        setLoading(true);
        try {
          await loadMember(session.user);
        } finally {
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setMember(null);
        setWishlistCount(0);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setAuthUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadMember]);

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const loginWithOtp = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  const verifyOtp = async (email, otp) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setMember(null);
    setWishlistCount(0);
  };

  const refresh = useCallback(async () => {
    if (authUser) await loadMember(authUser);
  }, [authUser, loadMember]);

  const updateMember = async (patch) => {
    if (!member) throw new Error('No member loaded');
    const { data, error } = await supabase
      .from('members')
      .update(patch)
      .eq('id', member.id)
      .select('*')
      .single();
    if (error) throw error;
    setMember(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{
      authUser,
      member,
      loading,
      wishlistCount,
      setWishlistCount,
      setMember,
      login,
      loginWithOtp,
      verifyOtp,
      logout,
      refresh,
      updateMember,
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
