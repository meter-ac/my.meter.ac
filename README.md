# my.meter.ac

A map-first web frontend for [METER.AC](https://meter.ac), an open atmospheric
monitoring network. This project is a proof of concept for a richer successor
to the legacy METER.AC interface: interactive maps, spatial interpolation,
time-lapse, calendar trends, and shareable station pages over the same public
data. The source is maintained at
[github.com/meter-ac/my.meter.ac](https://github.com/meter-ac/my.meter.ac).
See [AGENTS.md](./AGENTS.md) for the architecture and data-source reference.

![Map view with the temperature heatmap and isotherm contours active](./docs/screenshot.png)

## What's here

- **Map** — station markers colored by any parameter, an IDW-interpolated
  heatmap, isobar/isotherm contour lines, altitude-corrected temperature (DEM-
  based), Current/24h-average/Time-lapse modes.
- **Table** — sortable/filterable station lists across the Nodes, Meteo, and
  Earth (radon) networks, plus recent-earthquake and background-radiation
  reference tables.
- **Cameras** — snapshot gallery for camera-equipped stations.
- **Overview** — network snapshot (current extremes, reporting count) and a
  GitHub-style calendar heatmap of daily low/high, selectable by station,
  region, or the whole network.
- **Node pages** — a real, shareable page per station (`?node=ID`) with
  current readings, history chart, and camera, reachable from the map, the
  tables, or the camera gallery. Supports marking one station as a favorite
  (saved in the browser, no login) that becomes the default view.

## Development

Use Node.js 24 and install the exact dependency graph from `package-lock.json`:

```sh
npm ci
npm run dev
```

No `.env`, no backend to run locally — the app talks directly to METER.AC's
existing public endpoints (a plain file server for station metadata/cameras,
a public read-only InfluxDB query API for readings) from the browser, in dev
and in production alike. The committed InfluxDB client credential is
intentionally public and read-only; public forks require no secrets.

### Tests

Install Chromium once on a fresh development machine, then run Playwright:

```sh
npx playwright install chromium
npm test
```

The suite starts the Vite development server and exercises real METER.AC,
InfluxDB, camera, and map-tile services rather than mocks. Network access is
required, and external data availability can affect a run. Production-output
testing and CI are planned separately.

### External services

OpenStreetMap tiles use the current standard endpoint,
`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, with visible attribution.
Browsers must send a valid origin Referer as required by the tile usage policy.
Do not replace it with the retired `a`/`b`/`c` hostnames or suppress the
Referer. Preserve normal browser caching and do not prefetch, bulk-download, or
otherwise bypass the tile service's caching controls.

## Deployment

This is a static site (Vite build, output to `dist/`) with **no backend and
no server-side routing requirement**:

```sh
npm ci
npm run build   # → dist/
npm run preview # sanity-check the production build locally before deploying
```

- **Navigation is query-string based** (`?node=N06`, `?view=table`), not
  path-based routes — every app state is still a request for `/`, so unlike
  most single-page apps this needs **no rewrite/fallback rule** on the host
  (no "redirect all paths to `index.html`" config to write). Any static file
  host works by just pointing it at `dist/`: Netlify, Vercel, GitHub Pages,
  S3/CloudFront, or a plain nginx `root`.
- **No secrets, no environment variables, no provisioning.** All data calls
  go straight from the visitor's browser to METER.AC's already-public,
  CORS-open endpoints (`Access-Control-Allow-Origin: *`, verified) — there is
  nothing for a deploy pipeline to configure beyond the static build itself.
## License and security

Original repository code is licensed under the
[Apache License 2.0](./LICENSE). Third-party packages, inherited assets, map
tiles, and external data are not relicensed; see
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and [NOTICE](./NOTICE).
METER.AC-owned raw measurements and statistics derived from them are dedicated
under CC0, while NIMH, NIGGG, EEA, OpenStreetMap, and other third-party data
remain subject to their source terms.

Report vulnerabilities through the process in [SECURITY.md](./SECURITY.md),
not a public issue.
