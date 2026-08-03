// Parameters whose color scale is anchored to fixed physical values instead
// of today's data spread, so a uniformly mild/cold (or high/low-pressure)
// day doesn't get stretched blue-to-red just because that's this dataset's
// range. Unlike PM2.5/PM10 (see aqiScale.js), neither of these has an
// EU/WMO-regulated band index — both just follow standard weather-map
// convention: a fixed -30…45°C span for temperature, and 970-1050 hPa
// (deep storm to strong anticyclone) centered on the 1013.25 hPa standard
// atmosphere for pressure, with the same 4 hPa isobar spacing this app
// already uses for pressure contour lines.
//
// p_raw deliberately has no entry here — it's the station's raw,
// altitude-dependent ambient reading (see meterApi.js), not comparable
// across stations at different elevations. A fixed anchor would make a
// mountain station always read "low pressure" regardless of actual weather;
// only p_sea (reduced to sea level) is the physically comparable quantity
// synoptic maps color-code.
//
// gamma_cpm is raw Geiger-tube counts, not a calibrated dose rate — there's
// no known CPM→µSv/h conversion factor for this hardware, so this
// deliberately stays in CPM rather than guessing a conversion and inventing
// a µSv/h health scale. 0-200 matches the 0-200 CPM dial meter.ac's own
// gauge.js already uses for this exact field, whose 0-70 band it highlights
// as the normal/background range — reusing the project's own established
// convention rather than a value invented for this rewrite.
export const FIXED_RANGES = {
  t_raw: { min: -30, max: 45 },
  p_sea: { min: 940, max: 1052 },
  gamma_cpm: { min: 0, max: 200 },
};

export function fixedRangeFor(parameterKey) {
  return FIXED_RANGES[parameterKey] ?? null;
}
