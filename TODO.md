# TODO

## Public repository readiness — done

The public-readiness change establishes Apache-2.0 licensing for original
code, preserves third-party and asset notices, documents data-license
boundaries, adds private vulnerability reporting guidance, updates the
OpenStreetMap tile endpoint, and tests the public legal artifacts.

The readiness pull request is merged, the repository is public, and the planned
post-merge security settings are enabled.

## Persistent test suite — done

`npm test` runs a real Playwright suite (`tests/`) against the live backend
(no mocking — see `playwright.config.js` for why). Covers the core flows
(map/table/node-detail/overview) plus the curator settings added alongside
outlier-aware interpolation (Tukey fence toggle, offline-camera visibility,
IDW/Voronoi switch, camera region filter).

The suite currently runs against Vite's development server. Production-mode
Playwright testing remains future work.

## DevOps work still pending

- Migrate reproducibly from npm to pnpm 11 and pin the verified Node release.
- Run Playwright against freshly built production output.
- Add the hardened production container runtime.
- Add CI validation and Dependabot; no CI pipeline exists yet.
- Publish trusted preview and production images, then add preview cleanup.
