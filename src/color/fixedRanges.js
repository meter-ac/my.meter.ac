// Parameters whose color scale is anchored to fixed physical values instead
// of today's data spread, so a uniformly mild/cold day doesn't get stretched
// blue-to-red just because that's this dataset's range. Unlike PM2.5/PM10
// (see aqiScale.js), temperature has no EU/WMO-regulated band index — this
// just follows the common weather-map convention of a fixed-span gradient.
export const FIXED_RANGES = {
  t_raw: { min: -30, max: 45 },
};

export function fixedRangeFor(parameterKey) {
  return FIXED_RANGES[parameterKey] ?? null;
}
