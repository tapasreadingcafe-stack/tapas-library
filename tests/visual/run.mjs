#!/usr/bin/env node
// =====================================================================
// Visual regression harness — Phase J.
//
// For every configured page + breakpoint:
//   1. screenshot the storefront with ?v2=0
//   2. screenshot the storefront with ?v2=1
//   3. pixel-diff via pixelmatch; flag if >FAIL_THRESHOLD.
//
// Writes all artifacts + a side-by-side HTML report under
// tests/visual/output/. Exits non-zero when any page exceeds the
// threshold so CI can enforce it.
//
// Deps expected in the repo: playwright, pixelmatch, pngjs. They're
// dev-only and installed by the visual.yml workflow when running in
// CI (npm i --no-save playwright pixelmatch pngjs).
// =====================================================================

import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = resolve(__dirname, 'output');
const BASE_URL  = process.env.TAPAS_STORE_URL || 'http://localhost:3001';
const FAIL_THRESHOLD = 0.005; // 0.5 %

const PAGES = [
  { key: 'home',    path: '/' },
  { key: 'catalog', path: '/catalog' },
  { key: 'about',   path: '/about' },
  { key: 'offers',  path: '/offers' },
  { key: 'contact', path: '/contact' },
];
const BREAKPOINTS = [
  { key: 'desktop', width: 1280, height: 800 },
  { key: 'tablet',  width: 834,  height: 1112 },
  { key: 'mobile',  width: 390,  height: 844 },
];

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const results = [];
  let failed = 0;

  try {
    for (const page of PAGES) {
      for (const bp of BREAKPOINTS) {
        const v1 = await snap(browser, page.path, bp, 0);
        const v2 = await snap(browser, page.path, bp, 1);

        // Pad PNGs to the same dimensions so pixelmatch has a chance
        // — v1 / v2 sometimes differ by a pixel because of scroll bars.
        const width  = Math.max(v1.width, v2.width);
        const height = Math.max(v1.height, v2.height);
        const v1p = padToSize(v1, width, height);
        const v2p = padToSize(v2, width, height);
        const diff = new PNG({ width, height });
        const delta = pixelmatch(v1p.data, v2p.data, diff.data, width, height, {
          threshold: 0.1,
          includeAA: false,
        });
        const ratio = delta / (width * height);

        const nameBase = `${page.key}-${bp.key}`;
        await writeFile(resolve(OUT_DIR, `${nameBase}-v1.png`),   PNG.sync.write(v1p));
        await writeFile(resolve(OUT_DIR, `${nameBase}-v2.png`),   PNG.sync.write(v2p));
        await writeFile(resolve(OUT_DIR, `${nameBase}-diff.png`), PNG.sync.write(diff));

        const pass = ratio <= FAIL_THRESHOLD;
        if (!pass) failed += 1;
        results.push({ page: page.key, path: page.path, breakpoint: bp.key, ratio, pass });
        console.log(
          `${pass ? '✓' : '✗'} ${nameBase.padEnd(24)} ${(ratio * 100).toFixed(3)}%`
        );
      }
    }
  } finally {
    await browser.close();
  }

  await writeReport(results);
  process.exit(failed > 0 ? 1 : 0);
}

async function snap(browser, path, bp, v2Flag) {
  const ctx = await browser.newContext({
    viewport: { width: bp.width, height: bp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${BASE_URL}${path}${sep}v2=${v2Flag}`, { waitUntil: 'networkidle' });
  // Give lazy-loaded images + hydration + scroll-in observers time to
  // settle. Bumping this up past 600ms hits diminishing returns.
  await page.waitForTimeout(600);
  const buf = await page.screenshot({ fullPage: true, type: 'png' });
  await ctx.close();
  return PNG.sync.read(buf);
}

function padToSize(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  // Fill white so diffs outside the original frame aren't coloured.
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255; out.data[i + 1] = 255; out.data[i + 2] = 255; out.data[i + 3] = 255;
  }
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

async function writeReport(results) {
  const rows = results.map((r) => `
    <tr class="${r.pass ? 'pass' : 'fail'}">
      <td>${escape(r.page)}</td>
      <td>${escape(r.breakpoint)}</td>
      <td class="num">${(r.ratio * 100).toFixed(3)}%</td>
      <td class="status">${r.pass ? '✓ pass' : '✗ fail'}</td>
      <td><img src="${r.page}-${r.breakpoint}-v1.png"   alt="v1 render"   loading="lazy"></td>
      <td><img src="${r.page}-${r.breakpoint}-v2.png"   alt="v2 render"   loading="lazy"></td>
      <td><img src="${r.page}-${r.breakpoint}-diff.png" alt="pixel diff" loading="lazy"></td>
    </tr>
  `).join('\n');
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Tapas visual regression</title>
<style>
  body { font: 13px/1.4 -apple-system, BlinkMacSystemFont, Inter, sans-serif; margin: 24px; background: #111; color: #eee; }
  h1 { margin-top: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #222; text-align: left; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; }
  tr.fail td.status { color: #ff9a9a; font-weight: 700; }
  tr.pass td.status { color: #86e08b; }
  td.num { font-family: ui-monospace, monospace; }
  img { max-width: 240px; border: 1px solid #222; display: block; }
</style></head>
<body>
<h1>Tapas visual regression — ${new Date().toISOString()}</h1>
<p>Threshold: ${(FAIL_THRESHOLD * 100).toFixed(2)} % of pixels.</p>
<table>
  <thead><tr><th>Page</th><th>Breakpoint</th><th>Δ</th><th>Status</th><th>v1</th><th>v2</th><th>Diff</th></tr></thead>
  <tbody>${rows}</tbody>
</table></body></html>`;
  await writeFile(resolve(OUT_DIR, 'report.html'), html);
  await writeFile(resolve(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;',
  }[c]));
}

void readFile; // silence unused-import on older Node
main().catch((e) => { console.error(e); process.exit(1); });
