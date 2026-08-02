# my.meter.ac

A map-first web frontend for [METER.AC](https://meter.ac), an open atmospheric
monitoring network. This project is a proof-of-concept **replacement for
[github.com/meter-ac/ui](https://github.com/meter-ac/ui)** — richer
visualization (interactive map, spatial interpolation, time-lapse, calendar
trends, a real per-station page) on the same public data the existing site
already uses. See [AGENTS.md](./AGENTS.md) for the full architecture and data-
source reference.

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

```
npm install
npm run dev
```

No `.env`, no backend to run locally — the app talks directly to METER.AC's
existing public endpoints (a plain file server for station metadata/cameras,
a public read-only InfluxDB query API for readings) from the browser, in dev
and in production alike.

## Deployment

This is a static site (Vite build, output to `dist/`) with **no backend and
no server-side routing requirement**:

```
npm install
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
- To slot into the existing production pipeline (the `meter-ac/ui` repo's
  Jenkins build: `npm ci` → build → copy the output to wherever nginx serves
  it from), the only change needed is copying `dist/` instead of `_site/` —
  the rest of that pipeline (build agent, HTML/asset handling, deploy step)
  applies unchanged.
- If deploying under a sub-path rather than a domain root, set `base` in
  `vite.config.js` accordingly (default is root-relative, matching a direct
  domain replacement of the current site).
