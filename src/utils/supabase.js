import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

// The default Supabase auth lock uses the Web Locks API (navigator.locks) to
// serialize token refreshes across tabs. On some mobile browsers — and when
// the same account is signed in on multiple devices/tabs — that lock can get
// stuck and never release, which makes EVERY auth call (getSession on load,
// signInWithPassword on the login button) hang forever. That showed up as the
// app freezing on "Loading dashboard…" and the login button stuck on
// "Signing in…". We swap in a non-blocking lock that just runs the callback,
// which avoids the deadlock. This app doesn't need cross-tab refresh
// serialization, so there's no practical downside.
const nonBlockingLock = async (_name, _acquireTimeout, fn) => fn()

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    lock: nonBlockingLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
