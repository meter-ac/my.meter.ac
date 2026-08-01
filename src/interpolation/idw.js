import { isInsideBulgaria, bulgariaBounds } from '../geo/bulgariaBoundary.js';

const GRID_COLS = 160;
const GRID_ROWS = 120;

// Bulgaria's border mask never changes, only the parameter values do —
// compute it once and reuse across parameter switches.
let cachedMask = null;

function gridLat(row, rows) {
  const { minLat, maxLat } = bulgariaBounds;
  return maxLat - (row / (rows - 1)) * (maxLat - minLat);
}

function gridLon(col, cols) {
  const { minLon, maxLon } = bulgariaBounds;
  return minLon + (col / (cols - 1)) * (maxLon - minLon);
}

function getInsideMask() {
  if (cachedMask) return cachedMask;
  const mask = new Uint8Array(GRID_COLS * GRID_ROWS);
  for (let row = 0; row < GRID_ROWS; row++) {
    const lat = gridLat(row, GRID_ROWS);
    for (let col = 0; col < GRID_COLS; col++) {
      const lon = gridLon(col, GRID_COLS);
      mask[row * GRID_COLS + col] = isInsideBulgaria(lat, lon) ? 1 : 0;
    }
  }
  cachedMask = mask;
  return mask;
}

// Plain degree-distance IDW (no cos(lat) correction for longitude shrinkage) —
// acceptable at Bulgaria's latitude for a demo-quality surface, not survey-grade.
function idwValue(stationPoints, lat, lon, power = 2) {
  let weightedSum = 0;
  let weightSum = 0;
  for (const p of stationPoints) {
    const dLat = p.lat - lat;
    const dLon = p.lon - lon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < 1e-9) return p.value;
    const weight = 1 / distSq ** (power / 2);
    weightedSum += weight * p.value;
    weightSum += weight;
  }
  return weightSum > 0 ? weightedSum / weightSum : null;
}

export function buildHeatmapImage(stationPoints, getColorForValue) {
  if (stationPoints.length === 0) return null;
  const mask = getInsideMask();
  const canvas = document.createElement('canvas');
  canvas.width = GRID_COLS;
  canvas.height = GRID_ROWS;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(GRID_COLS, GRID_ROWS);

  for (let row = 0; row < GRID_ROWS; row++) {
    const lat = gridLat(row, GRID_ROWS);
    for (let col = 0; col < GRID_COLS; col++) {
      const idx = (row * GRID_COLS + col) * 4;
      if (!mask[row * GRID_COLS + col]) {
        imageData.data[idx + 3] = 0;
        continue;
      }
      const lon = gridLon(col, GRID_COLS);
      const value = idwValue(stationPoints, lat, lon);
      if (value === null) {
        imageData.data[idx + 3] = 0;
        continue;
      }
      const [r, g, b] = getColorForValue(value);
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const { minLat, maxLat, minLon, maxLon } = bulgariaBounds;
  return {
    dataUrl: canvas.toDataURL(),
    bounds: [
      [minLat, minLon],
      [maxLat, maxLon],
    ],
  };
}
