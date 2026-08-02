// European Air Quality Index (EAQI) breakpoints — https://airindex.eea.europa.eu,
// 24h-mean µg/m³ bands as published by the EEA. Unlike createColorScale's
// relative min/max stretch (fine for temperature/pressure, where "today's
// highest reading" is a meaningful red), PM2.5/PM10 have official health
// thresholds: a uniformly "moderate" day everywhere would otherwise still get
// painted blue-to-red across the map just because that's this dataset's
// spread, which is exactly the misleading behavior this scale avoids.
// Colors follow the EAQI's own Green/Yellow/Orange/Red/Purple/Maroon
// convention (the six index-level colors are unchanged by the 2024
// breakpoint revision below, only the concentration ranges shifted).
const BAND_COLORS = [
  [76, 175, 80], // Good — green
  [253, 216, 53], // Fair — yellow
  [251, 140, 0], // Moderate — orange
  [229, 57, 53], // Poor — red
  [142, 36, 170], // Very poor — purple
  [128, 0, 32], // Extremely poor — maroon
];

export const AQI_BANDS = {
  pm25: [
    { max: 5, label: 'Good', color: BAND_COLORS[0] },
    { max: 15, label: 'Fair', color: BAND_COLORS[1] },
    { max: 50, label: 'Moderate', color: BAND_COLORS[2] },
    { max: 90, label: 'Poor', color: BAND_COLORS[3] },
    { max: 140, label: 'Very poor', color: BAND_COLORS[4] },
    { max: Infinity, label: 'Extremely poor', color: BAND_COLORS[5] },
  ],
  pm10: [
    { max: 15, label: 'Good', color: BAND_COLORS[0] },
    { max: 45, label: 'Fair', color: BAND_COLORS[1] },
    { max: 120, label: 'Moderate', color: BAND_COLORS[2] },
    { max: 195, label: 'Poor', color: BAND_COLORS[3] },
    { max: 270, label: 'Very poor', color: BAND_COLORS[4] },
    { max: Infinity, label: 'Extremely poor', color: BAND_COLORS[5] },
  ],
};

export function isAqiParameter(parameterKey) {
  return Object.prototype.hasOwnProperty.call(AQI_BANDS, parameterKey);
}

function bandFor(bands, value) {
  return bands.find((b) => value <= b.max) ?? bands[bands.length - 1];
}

export function createAqiColorScale(parameterKey) {
  const bands = AQI_BANDS[parameterKey];
  const getColorForValue = (value) => bandFor(bands, value).color;
  const getColor = (value) => {
    const [r, g, b] = getColorForValue(value);
    return `rgb(${r},${g},${b})`;
  };
  return { bands, getColor, getColorForValue };
}
