# TODO

## Persistent test suite — done

`npm test` runs a real Playwright suite (`tests/`) against the live backend
(no mocking — see `playwright.config.js` for why). Covers the core flows
(map/table/node-detail/overview) plus the curator settings added alongside
outlier-aware interpolation (Tukey fence toggle, offline-camera visibility,
IDW/Voronoi switch, camera region filter).

Not yet done: wiring into CI (no CI pipeline exists yet).
