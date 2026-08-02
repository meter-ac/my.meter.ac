# TODO

## Add a persistent test suite

Right now there are no automated tests. Playwright has only been used ad hoc,
per feature: temporarily `npm install -D playwright`, verify the new thing in
a real browser, then uninstall and delete the script. That was fine for
one-off smoke checks on code that had just been written, but it means there's
no regression protection — nothing catches a future change silently breaking
the map, table, or overview views.

Worth doing once the app has enough surface area that manual re-checking
everything after each change stops being practical. When it happens:

- Keep Playwright as a real devDependency with an `npm test` script, instead
  of installing/uninstalling it per session.
- Decide how to handle the live backend (InfluxDB + meter.ac static files) —
  hit it for real (simple, but flaky and subject to rate limits) vs. mock or
  record fixtures.
- Cover the core flows: map loads stations and renders markers, table view
  renders and category-switches, node detail page loads via `?node=ID`,
  Overview category switch (Network / NIMH / Earthquakes / Radiation) all
  render without console errors.
- Wire it into CI once there is a CI pipeline.
