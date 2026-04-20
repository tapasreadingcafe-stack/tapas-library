#!/usr/bin/env node
// =====================================================================
// migrateBlocksToTree.mjs
//
// Webflow-parity Path A — Phase 0 migration. Reads the current
// store_content_draft row from Supabase, compiles the composite block
// array to a v2 Node tree via src/editor/compileBlocksToTree.js, and
// writes the result to a new store_content_v2 row.
//
// Safe to re-run: always overwrites store_content_v2 (never touches
// store_content or store_content_draft). Revert = delete store_content_v2.
//
// Local invocation:
//   node scripts/migrateBlocksToTree.mjs
//
// Requires REACT_APP_SUPABASE_URL + REACT_APP_SUPABASE_ANON_KEY or
// SUPABASE_SERVICE_ROLE_KEY in env / .env at repo root.
// =====================================================================

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load .env manually so we don't require a dotenv dependency.
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/.exec(line);
    if (m) process.env[m[1]] = m[1].startsWith('#') ? process.env[m[1]] : m[2].replace(/^['"]|['"]$/g, '');
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_*_KEY. Set one of:');
  console.error('  REACT_APP_SUPABASE_URL + REACT_APP_SUPABASE_ANON_KEY');
  console.error('  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Dynamic import so the script works whether compileBlocksToTree.js is
// the current version or a refactored one. The file sits in src/ which
// is CRA-compiled; here we import directly — CRA's build isn't in the
// path, so we rely on Node's ESM loader understanding plain JS.
const { compileSiteContent } = await import(
  resolve(__dirname, '..', 'src', 'editor', 'compileBlocksToTree.js')
);

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// Pull the current draft.
console.log('→ Fetching store_content_draft…');
const { data: draftRow, error: draftErr } = await sb
  .from('app_settings').select('value').eq('key', 'store_content_draft').maybeSingle();
if (draftErr) { console.error(draftErr); process.exit(1); }

const legacy = draftRow?.value || {};
console.log(`  pages in draft: ${Object.keys(legacy.pages || {}).join(', ') || '(none)'}`);

// Compile.
console.log('→ Compiling to v2 tree…');
const v2 = compileSiteContent(legacy);
console.log(`  pages compiled: ${Object.keys(v2.pages).length}`);
console.log(`  classes emitted: ${Object.keys(v2.classes).length}`);

// Write the new row.
console.log('→ Upserting store_content_v2…');
const { error: upErr } = await sb
  .from('app_settings')
  .upsert({ key: 'store_content_v2', value: v2 }, { onConflict: 'key' });
if (upErr) { console.error(upErr); process.exit(1); }

console.log('✓ Done. store_content_v2 is ready.');
console.log('  To rollback: DELETE FROM app_settings WHERE key = \'store_content_v2\';');
