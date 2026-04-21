#!/usr/bin/env node
// =====================================================================
// migrateTextToRuns.mjs — Phase D, Lane D6.
//
// Converts every leaf text node in store_content_v2 from the legacy
// `textContent: string` shape to `children: [{ text, marks: [] }]`.
// Runs through components too so templated nodes render identically
// after reuse.
//
// Safety contract:
//   * Idempotent — nodes already on the new shape (textContent absent
//     or children[0].text defined) are left alone.
//   * Additive — never drops or reorders children; only rewrites a
//     leaf when we're sure it's the legacy plain-text variant.
//   * Invocation: node scripts/migrateTextToRuns.mjs
//   * Rollback: restore from store_content_legacy_snapshot_2026_04_20.
// =====================================================================

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

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
  console.error('Missing SUPABASE_URL / SUPABASE_*_KEY.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const { data: row, error } = await sb
  .from('app_settings').select('value').eq('key', 'store_content_v2').maybeSingle();
if (error) { console.error(error); process.exit(1); }
if (!row?.value) {
  console.error('✗ store_content_v2 row missing. Run migrateBlocksToTree.mjs first.');
  process.exit(1);
}

const v2 = row.value;
let touched = 0;

function migrateNode(node) {
  if (!node || typeof node !== 'object') return node;
  const hasText = typeof node.textContent === 'string' && node.textContent.length > 0;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  // Already a run-shaped leaf → skip.
  if (hasChildren && typeof node.children[0]?.text === 'string') {
    return recurseBranch(node);
  }

  // Legacy plain-text leaf → convert. Also clear textContent so the
  // post-migration shape has exactly one source of truth.
  if (hasText && !hasChildren) {
    touched += 1;
    const next = { ...node, children: [{ text: node.textContent, marks: [] }] };
    delete next.textContent;
    return next;
  }

  return recurseBranch(node);
}

function recurseBranch(node) {
  if (!Array.isArray(node.children) || node.children.length === 0) return node;
  let changed = false;
  const nextKids = node.children.map((c) => {
    // Runs themselves have no nested structure — pass through.
    if (c && typeof c.text === 'string' && !c.tag) return c;
    const nc = migrateNode(c);
    if (nc !== c) changed = true;
    return nc;
  });
  return changed ? { ...node, children: nextKids } : node;
}

// Walk every page tree.
for (const [pageKey, page] of Object.entries(v2.pages || {})) {
  if (!page?.tree) continue;
  const nextTree = migrateNode(page.tree);
  if (nextTree !== page.tree) {
    v2.pages[pageKey] = { ...page, tree: nextTree };
  }
}

// Walk every component definition tree.
for (const [key, def] of Object.entries(v2.components || {})) {
  if (!def?.root) continue;
  const nextRoot = migrateNode(def.root);
  if (nextRoot !== def.root) {
    v2.components[key] = { ...def, root: nextRoot };
  }
}

if (touched === 0) {
  console.log('✓ Nothing to do — every leaf already on the run shape.');
  process.exit(0);
}

console.log(`→ Converted ${touched} leaf node${touched === 1 ? '' : 's'} to TextRun shape.`);
const { error: upErr } = await sb
  .from('app_settings')
  .upsert({ key: 'store_content_v2', value: v2 }, { onConflict: 'key' });
if (upErr) { console.error(upErr); process.exit(1); }
console.log('✓ store_content_v2 updated.');
