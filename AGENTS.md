# AGENTS.md

## Scope

A map-first React/Vite proof of concept for a richer METER.AC visualization
frontend. It covers interactive maps, spatial interpolation, time-lapse, and
long-term aggregation across the open atmospheric monitoring network.

Monetization, billing, API-key tiers, and station sponsorship belong to separate
workstreams, not this repository.

## Architecture

- This is a static browser application with no backend, proxy, `.env`, or
  provisioning of its own. It calls METER.AC's CORS-open static files and public,
  read-only InfluxDB v1 endpoint directly.
- `src/App.jsx` owns top-level UI state and initially loads general nodes,
  current/24-hour readings, and camera metadata. `TableView` fetches the selected
  non-node category on demand; Overview subviews fetch their own summaries when
  selected.
- There is no router or global state library. `App.jsx` synchronizes plain React
  state with `?view=...` and `?node=...` through the History API. Routes remain
  requests for `/`, so static hosting does not need an SPA fallback.
- The production image builds with Node/pnpm and copies only `dist/` into an
  unprivileged nginx runtime. nginx listens on port 8080, exposes `/healthz`,
  and never proxies the browser's external data requests.
- Charts, calendar grids, IDW/Voronoi interpolation, contours, and DEM correction
  are hand-rolled. Reuse those modules before adding a charting or geospatial
  dependency.

## Data sources

All URLs and query shapes below were verified against the live backend, not assumed —
if something looks unusual, it's because the source data is exactly that unusual.

### Station metadata (plain text/CSV, no auth)
| Network | URL | Notes |
|---|---|---|
| General nodes | `meter.ac/gs/metadata/nodes.csv` | Clean CSV, ~230 rows. Also `meter.ac/gs/nodes/nodes.txt` for the same list plus a `cams :` line (which stations have cameras). |
| Meteo (professional stations) | `meter.ac/gs/meteo/meteo.txt` | ~39 stations, `M`-prefixed IDs. |
| Earth (radon stations) | `meter.ac/gs/earth/earth.txt` | ~40 stations, `E`-prefixed IDs. File has `#`-commented exclusion/archive lines interleaved with real rows, not just a leading block. |

All of these need line-level filtering, not just "skip the header" — blank lines, `#`
comments, and `all :`/`cams :`/`lora :` summary lines can appear anywhere in the file.
`src/utils/csv.js`'s `parseCsv()` handles this uniformly; reuse it for any new station
list rather than re-deriving the filtering logic.

**Known bad entries**: `N16` ("test_indoors") and `N211` ("Makedonia_Hut") are
deliberately excluded — the production frontend's own build-time node list drops them
by name, but the CSV/InfluxDB location filter alone doesn't catch `Makedonia_Hut`
(it doesn't match the generic `test_` prefix exclusion). See `EXCLUDED_LOCATIONS` in
`src/api/meterApi.js`.

### Live/historical readings (InfluxDB v1 HTTP API)
Base: `https://meter.uni-plovdiv.net/query?db=meter&u=client&p=<read-only-password>&q=<InfluxQL>`

Three measurements:
- **`box`** — the general node network. Tags: `node_id`. Fields include `t_raw`,
  `t_dew`, `p_raw` (ambient pressure), `p_sea` (reduced to sea level — use this one
  for cross-station comparisons/isobars, not `p_raw`), `rh`, `pm25`, `pm10`,
  `gamma_cpm`.
- **`radon`** — the Earth network. Tags: `location`, `rn_id`. Fields include
  `rn_value_bqm3`, `t_raw`, `p_raw`, `rh`, `sbm20_cpm`. **`rn_id` uses a different ID
  scheme than earth.txt** (`Rn01` vs `E01` — same numeric suffix, different prefix;
  join by string-replacing the prefix, see `src/api/earthApi.js`). Unmatched IDs
  are intentionally dropped.
- **`nimh`** — external Bulgarian met-institute data. Tags: `location` only (no
  node ID or coordinates). Overview exposes server-side aggregate box plots, not
  map stations.

Meteo (`M`-prefixed) stations are **not in InfluxDB at all**. Each station's current
reading is its own tiny text file: `meter.ac/gs/meteo/{id}/data.current` — comma-
separated `T_raw,T_dew,P,RH,Wind_Dr,Wind_Sp,Rainfall,Solar,Gamma,Unix`, missing values
as `-`. No bulk endpoint exists; fetch all stations in parallel (`Promise.all`), not
sequentially (~0.25s/station sequential is too slow for ~39 stations, parallel is fine).

**Query cost is scope-dependent, not just period-dependent** — this bit real time to
discover, don't re-derive it: a plain `mean()`/`last()` query scales fine with more
days because InfluxDB aggregates server-side. But a query needing a **subquery**
(e.g. "average of each station's own daily min/max" — `src/api/meterApi.js`'s
`fetchDailyMinMax`) scales with *node-count × days*, not just days: whole-network
365 days is ~4.8s, but whole-network 1000 days balloons to ~36.6s, while a single
station handles 1000 days in ~7s. Any new subquery-based feature needs to either
cap the period for wide scopes or restrict to a narrow scope for long periods.

### External feeds (read-only reference data, not really "stations")
- `meter.ac/gs/niggg/earthquakes.txt` — regional seismic event log, no header,
  `id,lat,lon,depth,magnitude,datetime,location`, genuinely live (updates daily).
- `meter.ac/gs/eea/gamma-radiation.txt` — daily background-radiation reference CSV
  across ~26 fixed monitoring locations, going back to 2013. **This one is stale** —
  its own latest row can be over a year old — any UI showing it must display the
  actual date of the data, not imply it's current. Full-history loading resolves
  duplicate dates with the last source row winning.
- Camera snapshots/timelapse: `meter.ac/gs/nodes/{id}/snap.jpg` and
  `snap-video-last-1d.mp4`. Real cameras, freshness varies wildly station to station
  (same-day to multiple years stale). Liveness uses `snap.jpg`'s CORS-visible
  `Last-Modified` header and a 24-hour threshold; a camera flag alone does not mean
  the feed is live. Handle broken/stale images gracefully (`onError` hides them).

## Conventions established in this codebase

- **Map color selection is field-specific.** PM2.5/PM10 use EAQI bands in
  `src/color/aqiScale.js`; temperature, sea-level pressure, and radiation use
  anchors from `src/color/fixedRanges.js`; other fields use `createColorScale()`
  with Tukey fences by default.
- The curator setting can disable Tukey fencing for adaptive scales and
  interpolation. When enabled, the fence removes outliers from IDW and Voronoi
  surfaces while station markers still show the underlying readings. It does not
  replace fixed or EAQI display scales.
- **Sparse data is normal, not an error.** Every station reports a different subset
  of parameters. Values may be absent or `null`; detail views omit missing fields
  while tables may render a neutral dash. Never manufacture zero readings.
- Keep client-derived layers separate from backend field contracts; see
  `src/api/derivedLayers.js`. Region membership belongs in the nonexclusive
  heuristic in `src/utils/regions.js`, not a second hardcoded station list.
- OpenStreetMap tiles must use exactly
  `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, retain visible attribution,
  and receive a valid origin Referer. Do not restore the retired `a`/`b`/`c`
  hostnames, suppress the Referer, bypass browser caching, or prefetch/bulk
  download tiles.

## Directory layout
```
src/
  api/            One file per data source (meterApi.js = nodes/box, meteoApi.js,
                   earthApi.js, externalApi.js) + derivedLayers.js (client-computed
                   layers like the DEM-corrected temperature).
  color/          Shared color-scale logic.
  components/     UI. Roughly: map stack (StationMap/HeatmapOverlay/ContourLayer/
                   LayerControls/PlaybackControls), table stack (TableView is a
                   category container over StationTable/EarthquakeTable/
                   RadiationTable), node detail (NodeDetailPage/NodeHistoryPanel/
                   HistoryChart), overview (OverviewView/NetworkSnapshot/
                   CalendarHeatmap), CameraGallery.
  geo/            Bulgaria boundary polygon (for clipping the heatmap to the
                   country) and the bundled DEM (for altitude correction).
  interpolation/  IDW grid, marching-squares contours, altitude correction — all
                   share one grid definition (grid.js).
  utils/          Small stateless helpers (csv parsing, number/time formatting,
                   region classification, favorite-station localStorage wrapper).
  App.jsx         Top-level state, routing, data fetching orchestration.
```

## Development

Use the exact Node.js 24 and pnpm 11 releases pinned in `.node-version` and
`package.json`'s `packageManager`; keep development, CI, and image builds aligned
with them. Install reproducibly with `pnpm install --frozen-lockfile`; use
`pnpm dev` for Vite, `pnpm build` for static output, and `pnpm test` for the live
Playwright suite. Install Chromium on a fresh machine with
`pnpm exec playwright install chromium` (`--with-deps` may be needed on Linux).

Playwright builds and serves fresh production output with Vite preview on
`http://localhost:5173` and exercises live services; network access is required,
and assertions must tolerate changing station and camera data. Local runs may
reuse an existing server at that address. CI-mode runs never reuse a server,
reject `test.only`, retain traces and screenshots on failure, and produce an
HTML report for artifact upload. Public forks require no secrets or environment
configuration.

Set `PLAYWRIGHT_BASE_URL` to test an already-running deployment without
starting Vite preview, including the production container on port 8080.

Focus tests with `pnpm test -- tests/core-flows.spec.js` or
`pnpm test -- tests/curator-settings.spec.js -g "<test title>"`. There are
currently no lint, format, or typecheck scripts.

## Continuous integration

- `.github/workflows/ci.yml` runs for pull requests targeting `master`, pushes
  to `master`, and manual dispatches. `Playwright`, `Dependency review`, and
  `Container` are required pull-request checks.
- The workflow has read-only repository permission. It does not receive secrets,
  log in to GHCR, or publish packages. Keep write permissions isolated to future
  trusted publication jobs rather than widening validation permissions.
- Third-party Actions must be pinned to full commit SHAs with release comments.
  Dependabot maintains those pins.
- CI intentionally disables pnpm and BuildKit caches. Do not let untrusted PR
  cache entries become inputs to a trusted image-publication job.
- Playwright uses live external services and uploads its report, traces, and
  screenshots for seven days on failure. Container validation builds only
  `linux/amd64`, starts the image with the production hardening flags, and checks
  health, routing, caching, and security headers without publishing the image.
- `.github/dependabot.yml` checks the `github-actions`, `npm`, and `docker`
  ecosystems weekly. Version updates have a three-day cooldown; security updates
  do not. Node container updates stay on major 24 unless deliberately changed.
  pnpm 11 support in Dependabot is still incomplete, so frozen CI installation
  must reject manifest-only or invalid lockfile changes.

## Container runtime

- Build only `linux/amd64` with
  `docker build --platform linux/amd64 -t my-meter-ac:local .`.
- Run nginx with a read-only root, a small writable `/tmp` tmpfs, all
  capabilities dropped, and `no-new-privileges`. nginx's PID and temporary
  paths are under `/tmp`; do not introduce another writable path.
- Query-string navigation is served from exact `/` requests. Do not add an SPA
  fallback: unknown paths and missing assets must return 404.
- `/healthz` returns a small response with `no-store`. `index.html`, errors,
  legal artifacts, and future unhashed public files require revalidation.
  `/assets/*` is reserved for Vite-generated content-hashed files and may use
  one-year immutable cache headers.
- The CSP must continue allowing browser connections to `meter.ac` and
  `meter.uni-plovdiv.net`, camera images from `meter.ac`, tile images from exact
  host `tile.openstreetmap.org`, required inline styles, and generated data
  images. Keep `Referrer-Policy: origin` so map-tile requests send an
  origin-only Referer.
- Traefik owns HTTPS, redirects, and HSTS. nginx serves plain HTTP internally
  on port 8080 and must not gain certificates, host ports, proxy behavior, or
  an authoritative Compose definition in this repository.
- Keep builder and runtime stages separate. The final image must not contain
  Node, pnpm, application source, tests, reports, Git metadata, or development
  dependencies.

## Licensing, provenance, and public contributions

- Apache-2.0 covers original repository code only. Third-party packages,
  inherited assets, generated runtime code, map tiles, and external data retain
  their own terms; maintain `THIRD_PARTY_NOTICES.md` when any dependency or
  bundled asset changes.
- Keep `LICENSE`, `NOTICE`, and `THIRD_PARTY_NOTICES.md` byte-synchronized with
  `public/LICENSE.txt`, `public/NOTICE.txt`, and
  `public/THIRD_PARTY_NOTICES.txt`. Vite copies these legal artifacts into
  static output. When a container base changes, review its package-license
  inventory and update the runtime section of the notices.
- `src/assets/bulgaria.topo.json` retains the original 2020 meter.ac MIT
  notice. `src/assets/bulgaria-dem.json` derives from public-domain NASA/USGS
  SRTM data retrieved through Open Topo Data. `docs/screenshot.png` includes
  OpenStreetMap tiles and attribution.
- METER.AC's CC0 dedication covers METER.AC-owned raw measurements and derived
  statistics, not NIMH, NIGGG, EEA, OpenStreetMap, or other third-party data.
- Treat pull requests from forks as untrusted. They must not receive repository
  secrets, write credentials, or package-publication authority. The browser
  InfluxDB credential is intentionally public/read-only and is not a secret.
- Direct sensitive reports to GitHub private vulnerability reporting as
  documented in `SECURITY.md`.

## Documentation maintenance

When changing package scripts, dependencies, tests, navigation, data-source
contracts, architecture, licensing, or deployment behavior, update affected
guidance in `AGENTS.md`, `README.md`, and `TODO.md` in the same change. Remove
superseded guidance rather than accumulating history.
