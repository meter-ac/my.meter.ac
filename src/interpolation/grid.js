import { isInsideBulgaria, bulgariaBounds } from '../geo/bulgariaBoundary.js';

export const GRID_COLS = 160;
export const GRID_ROWS = 120;

// Bulgaria's border mask never changes, only the parameter values do —
// compute it once and reuse across parameter switches.
let cachedMask = null;

export function gridLat(row) {
  const { minLat, maxLat } = bulgariaBounds;
  return maxLat - (row / (GRID_ROWS - 1)) * (maxLat - minLat);
}

export function gridLon(col) {
  const { minLon, maxLon } = bulgariaBounds;
  return minLon + (col / (GRID_COLS - 1)) * (maxLon - minLon);
}

export function getInsideMask() {
  if (cachedMask) return cachedMask;
  const mask = new Uint8Array(GRID_COLS * GRID_ROWS);
  for (let row = 0; row < GRID_ROWS; row++) {
    const lat = gridLat(row);
    for (let col = 0; col < GRID_COLS; col++) {
      const lon = gridLon(col);
      mask[row * GRID_COLS + col] = isInsideBulgaria(lat, lon) ? 1 : 0;
    }
  }
  cachedMask = mask;
  return mask;
}
