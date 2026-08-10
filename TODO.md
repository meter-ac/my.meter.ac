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

The Dockerfile pins the exact Node 24 builder version and digest, `package.json`
pins pnpm 11, and `pnpm-lock.yaml` provides frozen, reproducible installs. CI
derives its Node runtime from the Dockerfile so Docker Dependabot updates have
one exact version source.

## Production container runtime — done

The application builds reproducibly in a pinned Node/pnpm builder and runs as
static output in a pinned unprivileged nginx image for `linux/amd64`. Runtime
checks cover the read-only filesystem, `/tmp` tmpfs, health endpoint,
query-string navigation, direct 404 behavior, cache/security headers, legal
artifacts, and the live application through Playwright.

## CI and dependency maintenance — done

Pull requests run required Playwright, dependency-review, and hardened-container
checks; `master` reruns Playwright and container validation. Those jobs have
read-only permissions. Untrusted pnpm and Docker caches are disabled. Dependabot
checks Actions, pnpm-managed dependencies, and Docker bases weekly with a
three-day version cooldown; security updates remain exempt and pass through the
same CI. The required container check also runs ShellCheck over reusable CI
helpers and verifies container-base notice consistency.

## GHCR image publication — done

Trusted pull requests publish public preview images after required validation.
Fork and Dependabot pull requests build once in required validation without
write access or publication.
Successful `master` runs publish `latest` and a commit-addressed image with
BuildKit SBOM/provenance and a keyless Cosign signature; `latest` advances only
after signature verification.

## GHCR preview cleanup — done

The close workflow deletes package versions carrying a trusted pull request's
exact `pr-N` or `pr-N-sha-*` tags. Cleanup shares the publisher's queued
`pr-image-N` concurrency group, never executes pull-request code, refuses mixed
tags, and supports idempotent manual recovery for any closed pull request
number, including conflicted PRs whose close workflow is suppressed.

## Operations handoff and production cutover — done

The authoritative Compose, Traefik, and Watchtower configuration remains in the
server/operations repository. The handoff, production cutover, and rollback
verification are complete, and production tracks the published `latest` image.
