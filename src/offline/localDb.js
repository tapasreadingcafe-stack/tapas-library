/* Offline-first — the on-device database (Phase 0, Step 2).
 * See docs/offline-first-plan.md.
 *
 * We use Dexie (IndexedDB) rather than SQLite-WASM: it's one import, needs no
 * WASM/worker/webpack/COOP-COEP setup, is durable once storage is persisted,
 * and exports cleanly to a backup file. Trade-off accepted: reports become JS
 * aggregations instead of SQL. Best fit for "simple to manage" + single-writer.
 *
 * The model is deliberately generic:
 *   • local tables mirror the Supabase rows we operate on offline
 *   • every local write also appends an op to `outbox`
 *   • when online, the sync module (Step 3) replays the outbox in order
 */
import Dexie from 'dexie';

export const db = new Dexie('tapas_offline');

db.version(1).stores({
  // '&id' = our own unique primary key (a UUID for offline-created rows).
  // Remaining fields are secondary indexes used for lookups.
  pos_transactions: '&id, created_at, member_id, status',
  pos_transaction_items: '&id, transaction_id, book_id',
  sales: '&id, sale_date, member_id, book_id, status',
  book_copies: '&id, copy_code, book_id, status',
  books: '&id, isbn, book_id',
  members: '&id, name, phone',
  circulation: '&id, member_id, book_id, status',

  // The upload queue: one row per local change, replayed to Supabase in order.
  // '++seq' auto-increments so ordering is guaranteed. synced is 0/1 (indexable).
  outbox: '++seq, table, op, row_id, synced, created_at',

  // Key/value store: sync cursors, the C1 receipt counter, etc.
  meta: '&key',
});

/** UUID for offline-created rows (stable id before it ever reaches Supabase). */
export function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Insert (or replace) a row locally AND queue it for upload — atomically, so
 * the local table and the outbox never disagree. Returns the stored record.
 */
export async function putLocal(table, row, op = 'insert') {
  const record = { ...row };
  if (!record.id) record.id = uuid();
  const now = new Date().toISOString();
  await db.transaction('rw', table, 'outbox', async () => {
    await db.table(table).put(record);
    await db.outbox.add({ table, op, row_id: record.id, payload: record, synced: 0, created_at: now });
  });
  return record;
}

/** Update fields on an existing local row AND queue the change for upload. */
export async function patchLocal(table, id, changes) {
  const now = new Date().toISOString();
  let merged;
  await db.transaction('rw', table, 'outbox', async () => {
    await db.table(table).update(id, changes);
    merged = await db.table(table).get(id);
    await db.outbox.add({ table, op: 'update', row_id: id, payload: merged || { id, ...changes }, synced: 0, created_at: now });
  });
  return merged;
}

/** All queued changes not yet uploaded, in the order they happened. */
export function unsyncedOps() {
  return db.outbox.where('synced').equals(0).sortBy('seq');
}

/** Count of changes still waiting to sync (drives the status light). */
export function pendingCount() {
  return db.outbox.where('synced').equals(0).count();
}

/** Mark queued ops as uploaded once Supabase confirms them. */
export function markSynced(seqs) {
  return db.outbox.where('seq').anyOf(seqs).modify({ synced: 1 });
}

// ---- meta helpers (sync cursors, counters) --------------------------------
export async function getMeta(key, fallback = null) {
  const row = await db.meta.get(key);
  return row ? row.value : fallback;
}
export async function setMeta(key, value) {
  await db.meta.put({ key, value });
  return value;
}

// Expose a handle in dev so we can smoke-test from the console / preview_eval.
if (typeof window !== 'undefined') {
  window.__tapasOffline = { db, uuid, putLocal, patchLocal, unsyncedOps, pendingCount, markSynced, getMeta, setMeta };
}
