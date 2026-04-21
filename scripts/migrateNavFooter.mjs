#!/usr/bin/env node
// =====================================================================
// migrateNavFooter.mjs
//
// Additive, idempotent migration. Reads store_content_v2, and for every
// page whose body tree is missing a tapas-navbar / tapas-footer,
// prepends / appends a default one compiled via compileTapasNavbar /
// compileTapasFooter.
//
// Why this is its own script (not folded into migrateBlocksToTree):
// v1 stored site-wide navbar/footer OUTSIDE each page's blocks array
// (see tapas-store/src/App.js -> GlobalHeader/GlobalFooter), so the
// one-shot compiler couldn't see them. This script closes the gap
// without destroying anything already in store_content_v2.
//
// Safety contract:
//   * Only mutates pages whose body tree lacks the named class.
//   * Never removes or reorders existing children.
//   * Merges classes additively (existing keys win).
//   * Running twice is a no-op.
//
// Rollback: delete the navbar/footer node from the affected page's
// tree.children, or restore the row from store_content_legacy_snapshot.
//
// Invocation: node scripts/migrateNavFooter.mjs
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

const { compileTapasNavbar, compileTapasFooter } = await import(
  resolve(__dirname, '..', 'src', 'editor', 'compileBlocksToTree.js')
);

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// Also pull the current site content so we can seed the nav/footer
// with the brand name and any custom link lists the user already has.
const [{ data: v2Row, error: v2Err }, { data: draftRow }] = await Promise.all([
  sb.from('app_settings').select('value').eq('key', 'store_content_v2').maybeSingle(),
  sb.from('app_settings').select('value').eq('key', 'store_content_draft').maybeSingle(),
]);
if (v2Err) { console.error(v2Err); process.exit(1); }
if (!v2Row?.value) {
  console.error('✗ store_content_v2 row missing. Run migrateBlocksToTree.mjs first.');
  process.exit(1);
}

const v2 = v2Row.value;
const legacy = draftRow?.value || {};

// Derive navbar/footer props from v1 site content so defaults inherit
// whatever the staff already configured (brand name, custom links,
// taglines). Falls back to compiler defaults when missing.
const navProps = {
  brand_name: legacy?.brand?.name || v2?.brand?.name || 'TAPAS',
  logo_emoji: legacy?.navbar?.logo_emoji || '',
  links:      legacy?.navbar?.links || undefined,
  login_label: legacy?.navbar?.login_label || 'Login',
};
const footerProps = {
  brand_name:     legacy?.brand?.name || v2?.brand?.name || 'TAPAS',
  tagline:        legacy?.footer?.tagline || legacy?.brand?.tagline || '',
  copyright_text: legacy?.footer?.copyright_text || 'All rights reserved.',
};

const hasClass = (node, name) => {
  if (!node) return false;
  if (Array.isArray(node.classes) && node.classes.includes(name)) return true;
  for (const c of node.children || []) {
    if (hasClass(c, name)) return true;
  }
  return false;
};

let pagesTouched = 0;
for (const [pageKey, page] of Object.entries(v2.pages || {})) {
  const tree = page?.tree;
  if (!tree || !Array.isArray(tree.children)) continue;

  let mutated = false;

  if (!hasClass(tree, 'tapas-navbar')) {
    const { root, classes } = compileTapasNavbar(navProps);
    tree.children.unshift(root);
    // Additive class merge — existing site classes win so the migration
    // can't clobber a user's custom navbar styling.
    for (const [k, def] of Object.entries(classes)) {
      if (!v2.classes[k]) v2.classes[k] = def;
    }
    mutated = true;
    console.log(`  + navbar → ${pageKey}`);
  }

  if (!hasClass(tree, 'tapas-footer')) {
    const { root, classes } = compileTapasFooter(footerProps);
    tree.children.push(root);
    for (const [k, def] of Object.entries(classes)) {
      if (!v2.classes[k]) v2.classes[k] = def;
    }
    mutated = true;
    console.log(`  + footer → ${pageKey}`);
  }

  if (mutated) pagesTouched += 1;
}

if (pagesTouched === 0) {
  console.log('✓ Nothing to do — every page already has navbar + footer.');
  process.exit(0);
}

console.log(`→ Writing back store_content_v2 (${pagesTouched} page${pagesTouched === 1 ? '' : 's'} touched)…`);
const { error: upErr } = await sb
  .from('app_settings')
  .upsert({ key: 'store_content_v2', value: v2 }, { onConflict: 'key' });
if (upErr) { console.error(upErr); process.exit(1); }

console.log('✓ Done.');
