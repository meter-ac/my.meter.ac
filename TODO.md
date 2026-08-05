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
IDW/Voronoi switch, camera region filter). CI-mode reporting and seven-day
failure artifacts are enabled in the pipeline.

The repository pins Node 24 and pnpm 11 and uses `pnpm-lock.yaml` for frozen,
reproducible installs.

## Production container runtime — done

The application builds reproducibly in a pinned Node/pnpm builder and runs as
static output in a pinned unprivileged nginx image for `linux/amd64`. Runtime
checks cover the read-only filesystem, `/tmp` tmpfs, health endpoint,
query-string navigation, direct 404 behavior, cache/security headers, legal
artifacts, and the live application through Playwright.

## CI and dependency maintenance — done

Pull requests and `master` run required Playwright, dependency-review, and
hardened-container checks with read-only permissions and no publication path.
Untrusted pnpm and Docker caches are disabled. Dependabot checks Actions,
pnpm-managed dependencies, and Docker bases weekly with a three-day version
cooldown; security updates remain exempt and pass through the same CI.

## DevOps work still pending

- Publish trusted preview and production images, then add preview cleanup.
