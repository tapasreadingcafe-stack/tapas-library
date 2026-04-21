# Phase 10 cutover — operator runbook

This document describes how to flip the storefront from the legacy v1
render path to the v2 (Webflow-parity) render path, and how to roll
back if anything goes wrong.

**As of today the production site still runs on v1.** The cutover
infrastructure is shipped; flipping the flag is a deliberate step.

## Architecture

| Storage | Role |
| --- | --- |
| `app_settings.store_content` | Live v1 content (composite blocks). The storefront still reads this. |
| `app_settings.store_content_draft` | Legacy editor draft at `/store/content`. |
| `app_settings.store_content_v2` | v2 blob — tree + classes + interactions. Edited at `/store/content-v2`. |
| `app_settings.store_content_legacy_snapshot_2026_04_20` | Full backup taken in Phase 0. **Do not delete.** |
| `app_settings.content_system` | **The flag.** String `"v1"` or `"v2"`. |

## How the storefront decides which path to use

For each `<PageRenderer pageKey="…">` mount:

1. If URL has `?v2=1` → force v2 (for QA).
2. If URL has `?v2=0` → force v1.
3. Otherwise → read `content_system` row; v2 if `"v2"`, v1 otherwise.
4. If v2 path is chosen AND `store_content_v2.pages.<pageKey>.tree`
   has children → render v2. Otherwise fall through to v1 so no page
   goes dark during incremental cutover.

## QA preview (no flag flip)

```
https://tapasreadingcafe.com/?v2=1
```

Also try all other pages. Only the home page has a non-empty v2 tree
today; every other page will fall back to v1 even with `?v2=1`.

Check:
- Layout matches what `/store/content-v2` shows
- Scroll-in animations fire as authored
- Hover effects work
- Responsive breakpoints at 1400 / 900 / 600 / 400 widths
- No console errors

## Flipping the flag (go-live)

After QA passes, run this SQL in Supabase:

```sql
UPDATE app_settings
SET value = to_jsonb('v2'::text), updated_at = NOW()
WHERE key = 'content_system';
```

Storefront users will pick up v2 within their next page load (no
server cache). Editors should start using `/store/content-v2` only.

## Rolling back

If something breaks:

```sql
UPDATE app_settings
SET value = to_jsonb('v1'::text), updated_at = NOW()
WHERE key = 'content_system';
```

This is a single-row update. Users refresh → back on v1.

If v1 itself was somehow corrupted, restore from the snapshot:

```sql
UPDATE app_settings
SET value = (
  SELECT value FROM app_settings
  WHERE key = 'store_content_legacy_snapshot_2026_04_20'
),
updated_at = NOW()
WHERE key = 'store_content';
```

## What's NOT part of this phase

Deliberately left intact so rollback stays cheap:
- `/store/content` legacy editor route
- `tapas-store/src/blocks/TapasFigmaBlocks.js`
- `tapas-store/src/blocks/BlockLibrary.js`
- `tapas-store/src/pages/Home.js` fallback JSX
- The snapshot row

After v2 has run in production for ≥ 7 days without incident, a
cleanup PR can remove the legacy renderers and editor. Don't delete
the snapshot for at least 30 days.

## Notes for the next operator

- Pages in v2 with empty trees (about, events, offers, catalog, blog)
  fall through to v1 automatically. As you migrate each page to v2,
  it simply starts rendering via the new path — no extra config.
- Editors see the v2 canvas at `/store/content-v2` regardless of the
  flag. The flag only affects what customers see at
  `tapasreadingcafe.com`.
- `?v2=1` works even in production. Share that URL with anyone who
  needs to preview without affecting real visitors.
