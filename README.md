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

Use the Node.js 24 release pinned in `.node-version` and the exact pnpm 11
release declared by `packageManager` in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

No `.env`, no backend to run locally — the app talks directly to METER.AC's
existing public endpoints (a plain file server for station metadata/cameras,
a public read-only InfluxDB query API for readings) from the browser, in dev
and in production alike. The committed InfluxDB client credential is
intentionally public and read-only; public forks require no secrets.

### Tests

Install Chromium once on a fresh development machine, then run Playwright:

```sh
pnpm exec playwright install chromium
pnpm test
```

Use `--with-deps` when the host also needs Playwright's Linux system packages.
The suite builds fresh production assets, serves them with Vite preview at
`http://localhost:5173`, and exercises real METER.AC, InfluxDB, camera, and
map-tile services rather than mocks. Network access is required, and external
data availability can affect a run. CI-mode reporting and failure artifacts
are configured, but the CI workflow is planned separately.

Set `PLAYWRIGHT_BASE_URL` to test an already-running deployment without
starting Vite preview. For example, run the full suite against the production
container with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test`.

### External services

OpenStreetMap tiles use the current standard endpoint,
`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, with visible attribution.
Browsers must send a valid origin Referer as required by the tile usage policy.
Do not replace it with the retired `a`/`b`/`c` hostnames or suppress the
Referer. Preserve normal browser caching and do not prefetch, bulk-download, or
otherwise bypass the tile service's caching controls.

## Deployment

The production artifact is a `linux/amd64` container. A pinned Node 24 builder
uses the repository's exact pnpm version and frozen lockfile, then a pinned,
unprivileged nginx runtime serves only the fresh Vite output on port 8080.
Node, pnpm, source, tests, and development dependencies are not copied into
the runtime stage.

```sh
docker build --platform linux/amd64 -t my-meter-ac:local .
docker run --rm \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -p 8080:8080 \
  my-meter-ac:local
```

The health endpoint is `http://127.0.0.1:8080/healthz`. Production must retain
the read-only root and writable `/tmp` tmpfs contract shown above.

- **Navigation is query-string based.** `?node=N06` and `?view=table` remain
  requests for `/`. nginx deliberately has no SPA fallback; unknown paths and
  missing assets return 404.
- **Caching follows the build output.** `index.html`, `/healthz`, errors, legal
  artifacts, and future unhashed public files are not immutable. Vite-generated
  `/assets/*` filenames are content-hashed and receive one-year immutable
  caching.
- **External data remains browser-owned.** nginx does not proxy METER.AC,
  InfluxDB, cameras, or map tiles. Its CSP permits the required external
  origins, same-origin scripts, inline styles used by React and Leaflet, and
  generated data images. The origin-only referrer policy preserves the Referer
  required by OpenStreetMap.
- **Traefik owns TLS.** nginx serves plain HTTP internally. The image contains
  no certificates, HSTS policy, host routing, or authoritative Compose file.
- **No deployment configuration or secrets are built in.** The browser's
  existing InfluxDB credential remains deliberately public and read-only.
- **Legal artifacts ship with the application.** `/LICENSE.txt`, `/NOTICE.txt`,
  and `/THIRD_PARTY_NOTICES.txt` are included in the final image and use the
  non-immutable cache class. Runtime component terms are included in the
  third-party notices.

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
