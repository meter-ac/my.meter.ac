# AGENTS.md — meteracnew

## What this is

A map-first, visualization-focused web frontend for METER.AC, an open atmospheric
monitoring network (~230 DIY sensor stations plus a smaller network of professional
weather stations, radon stations, and a couple of external data feeds). This project
is a **proof of concept for a richer visualization layer** — interactive map, spatial
interpolation, time-lapse, long-term calendar aggregation — evaluated as a possible
future replacement for the existing production frontend.

**Out of scope for this repo**: the monetization workstreams sometimes discussed for
METER.AC (tiered API keys, sponsor-a-node, billing) belong in a separate effort, not
here. This repo is content/visualization only.

## Architecture

**No backend of its own.** Everything is a static React app (Vite build) that talks
directly, client-side, to METER.AC's existing public infrastructure:

- A legacy Apache file server (station metadata as CSV/plain-text files, camera
  snapshots, static per-node history pages).
- A public, read-only InfluxDB v1 HTTP query endpoint (live and historical sensor
  readings).

Both are confirmed CORS-open (`Access-Control-Allow-Origin: *`) and don't require a
proxy. There is a **separate, independent** production frontend deployment (different
server, different content) — this app's data dependencies do not depend on that
deployment's fate one way or the other.

No router library. Client-side navigation is plain React state; the one place a real
URL matters (a shareable/bookmarkable link per station) is handled with
`history.pushState`/`popstate` directly in `App.jsx` — see `readLocation()`.

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
(the password is a public, low-privilege, read-only credential already shipped
client-side by the production frontend — not a secret, reused here as-is).

Three measurements:
- **`box`** — the general node network. Tags: `node_id`. Fields include `t_raw`,
  `t_dew`, `p_raw` (ambient pressure), `p_sea` (reduced to sea level — use this one
  for cross-station comparisons/isobars, not `p_raw`), `rh`, `pm25`, `pm10`,
  `gamma_cpm`.
- **`radon`** — the Earth network. Tags: `location`, `rn_id`. Fields include
  `rn_value_bqm3`, `t_raw`, `p_raw`, `rh`, `sbm20_cpm`. **`rn_id` uses a different ID
  scheme than earth.txt** (`Rn01` vs `E01` — same numeric suffix, different prefix;
  join by string-replacing the prefix, see `src/api/earthApi.js`).
- **`nimh`** — external Bulgarian met-institute data. Tags: `location` only (no
  node_id). Not currently wired into the UI.

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
  actual date of the data, not imply it's current.
- Camera snapshots/timelapse: `meter.ac/gs/nodes/{id}/snap.jpg` and
  `snap-video-last-1d.mp4`. Real cameras, freshness varies wildly station to station
  (same-day to multiple years stale) — handle broken/stale images gracefully
  (`onError` hides them), don't assume every camera-flagged station has a live feed.

## Conventions established in this codebase

- **No chart/mapping libraries beyond Leaflet.** Line charts (`HistoryChart.jsx`),
  the calendar heatmap (`CalendarHeatmap.jsx`), spatial interpolation (IDW,
  `interpolation/idw.js`), contour tracing (marching squares,
  `interpolation/contours.js`), and DEM-based altitude correction
  (`interpolation/altitudeCorrection.js`) are all hand-rolled — no d3, no charting
  library, no turf. Keep following this pattern for similar needs rather than adding
  a dependency; the existing pieces are small and composable.
- **Color scales use Tukey's IQR fences** (`src/color/colorScale.js`), not true
  min/max — a handful of faulty sensors (a pressure sensor once reported >2000 hPa
  live) would otherwise wreck the whole scale. Reuse `createColorScale()` for any
  new value-driven coloring rather than a raw min/max normalize.
- **Sparse data is normal, not an error.** Every station reports a different subset
  of parameters; readings objects only contain the fields a station actually has.
  UI should skip/omit missing fields, never show a fake "N/A" placeholder row.
- **Simple heuristics over hardcoded lists** where the production frontend already
  established one — e.g. region tagging (`src/utils/regions.js`) mirrors the
  production frontend's own altitude/location-prefix heuristic rather than
  maintaining a separate curated list.
- No global state library — plain React state, lifted to `App.jsx` where more than
  one view needs it (stations/readings/camera list are fetched once there and passed
  down).
- No test framework is set up. Changes are verified by running the dev server and
  driving it with a headless browser (Playwright, installed/verified/removed as a
  temporary devDependency per change — not a persistent project dependency).

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

`npm run dev` (Vite). No build step needed for the data layer — everything fetches
live from the public endpoints above, including in local dev.
