// Layers computed client-side rather than read straight off a backend
// column. Keyed separately from READING_FIELDS (meterApi.js) so the raw
// backend contract stays untouched by locally-derived display options.
export const DERIVED_LAYERS = {
  t_raw_dem: {
    key: 't_raw_dem',
    label: 'Temperature (altitude-corrected)',
    unit: '°C',
    contourStep: 2,
    sourceField: 't_raw',
  },
};
