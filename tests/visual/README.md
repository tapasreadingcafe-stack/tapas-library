# Visual regression harness

Phase J of the Webflow-parity plan. Loads every storefront page twice
— once with `?v2=0` (legacy render path) and once with `?v2=1` (new v2
tree render path) — at three breakpoints (desktop / tablet / mobile),
then pixel-diffs the pair with [pixelmatch](https://github.com/mapbox/pixelmatch).

**The harness is expected to fail on the first run** because the v2
tree hasn't reached full visual parity with v1 yet. That's the point:
the baseline report tells the cutover conversation what's drifted, so
every v2 fix can be reviewed and re-baselined.

## Run locally

```bash
# 1. start the storefront (produces the base URL)
cd tapas-store && npm start &

# 2. run the suite (from repo root)
npm run test:visual
```

The script writes results to `tests/visual/output/`:
- `<page>-<breakpoint>-v1.png`      — legacy render
- `<page>-<breakpoint>-v2.png`      — v2 tree render
- `<page>-<breakpoint>-diff.png`    — per-pixel diff overlay
- `report.html`                     — side-by-side HTML report

## Thresholds

`FAIL_THRESHOLD = 0.005` — tests fail if more than 0.5 % of pixels
differ. Tweak in `run.mjs` if a page legitimately re-flows between
the two renderers.

## CI

`.github/workflows/visual.yml` runs the suite on every push + PR
against `main`, posts the report as a workflow artifact, and fails
the job if any page crosses the threshold. Review the artifact, fix
the drift, or explicitly re-baseline by approving the failing job
once (the workflow overwrites stored baselines on main).
