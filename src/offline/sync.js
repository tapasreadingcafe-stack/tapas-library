/* Offline-first — the sync module (Phase 0, Step 3).
 * See docs/offline-first-plan.md.
 *
 * Single-writer sync, so no conflict machinery — just:
 *   • PUSH: replay the outbox to Supabase, in order, idempotently (upsert by id).
 *   • PULL: fetch rows changed elsewhere since a cursor (needs `updated_at`).
 *
 * The billing tables use uuid primary keys, so the UUIDs we mint offline drop
 * straight in and replaying an op twice is harmless (upsert on the same id).
 */
import { supabase as defaultClient } from '../utils/supabase';
import { db, unsyncedOps, markSynced, getMeta, setMeta, pendingCount } from './localDb';
import { setSyncing, refreshPending, markSyncedNow } from './status';

// The Supabase client, swappable in dev so tests never hit the real database.
let client = defaultClient;
export function __setClient(c) {
  client = c || defaultClient;
}

let running = false;

/**
 * Replay queued local changes to Supabase, oldest first. Stops at the first
 * failure so ordering is preserved and the batch is retried next time.
 */
export async function pushOutbox() {
  const ops = await unsyncedOps();
  const done = [];
  for (const op of ops) {
    try {
      if (op.op === 'delete') {
        const { error } = await client.from(op.table).delete().eq('id', op.row_id);
        if (error) throw error;
      } else {
        // insert AND update both replay as a full-row upsert keyed by id.
        const { error } = await client.from(op.table).upsert(op.payload, { onConflict: 'id' });
        if (error) throw error;
      }
      done.push(op.seq);
    } catch (e) {
      if (done.length) await markSynced(done);
      return { pushed: done.length, stoppedAt: op.seq, error: e.message || String(e) };
    }
  }
  if (done.length) await markSynced(done);
  return { pushed: done.length, error: null };
}

/**
 * Pull rows changed on the server since our cursor into the local DB.
 * Requires `updated_at` on the table (Phase 0.5 schema prep) — tables without
 * it simply error and are skipped, so this is safe to call on any list.
 */
export async function pullSince(tables) {
  const results = {};
  for (const t of tables) {
    try {
      const cursor = await getMeta('pull:' + t, '1970-01-01T00:00:00+00:00');
      const { data, error } = await client
        .from(t)
        .select('*')
        .gt('updated_at', cursor)
        .order('updated_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      if (data && data.length) {
        await db.table(t).bulkPut(data);
        await setMeta('pull:' + t, data[data.length - 1].updated_at);
      }
      results[t] = data ? data.length : 0;
    } catch (e) {
      results[t] = 'skipped: ' + (e.message || String(e));
    }
  }
  return results;
}

/** One sync pass: push first (get our bills out), then optionally pull. */
export async function runSync({ pull = [] } = {}) {
  if (running) return { skipped: 'already-running' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    await refreshPending();
    return { skipped: 'offline', pending: await pendingCount() };
  }
  running = true;
  setSyncing(true);
  try {
    const push = await pushOutbox();
    if (push.pushed) markSyncedNow();
    const pulled = pull.length ? await pullSince(pull) : undefined;
    await refreshPending();
    return { push, pulled, pending: await pendingCount() };
  } finally {
    running = false;
    setSyncing(false);
  }
}

/**
 * Start background sync: run now, again whenever the network returns, and on a
 * gentle interval. Returns a stop() function. Call this once the app is wired
 * to the local store (Step 4) — not before, so nothing pushes unexpectedly.
 */
export function startSync(opts = {}) {
  const trigger = () => runSync(opts).catch(() => {});
  const onOnline = () => trigger();
  window.addEventListener('online', onOnline);
  const interval = setInterval(trigger, opts.intervalMs || 30000);
  trigger();
  return () => {
    window.removeEventListener('online', onOnline);
    clearInterval(interval);
  };
}

// Dev handle for smoke-testing from the console / preview_eval.
if (typeof window !== 'undefined') {
  window.__tapasSync = { pushOutbox, pullSince, runSync, startSync, __setClient };
}
