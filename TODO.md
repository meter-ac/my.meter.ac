# TODO

## Public repository readiness — done

The public-readiness change establishes Apache-2.0 licensing for original
code, preserves third-party and asset notices, documents data-license
boundaries, adds private vulnerability reporting guidance, updates the
OpenStreetMap tile endpoint, and tests the public legal artifacts.

The readiness pull request is merged, the repository is public, and the planned
post-merge security settings are enabled.

## Persistent test suite — done

`pnpm test` builds and previews the production Vite output, then runs the real
Playwright suite (`tests/`) against the live backend (no mocking — see
`playwright.config.js` for why). It covers the core flows
(map/table/node-detail/overview) plus the curator settings added alongside
outlier-aware interpolation (Tukey fence toggle, offline-camera visibility,
IDW/Voronoi switch, camera region filter). CI-mode reporting and failure
artifacts are configured in preparation for the pipeline.

The repository pins Node 24 and pnpm 11 and uses `pnpm-lock.yaml` for frozen,
reproducible installs.

## DevOps work still pending

- Add the hardened production container runtime.
- Add CI validation and Dependabot; no CI pipeline exists yet.
- Publish trusted preview and production images, then add preview cleanup.
