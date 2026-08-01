import { GRID_COLS, GRID_ROWS, gridLat, gridLon, getInsideMask } from './grid.js';
import { bulgariaBounds } from '../geo/bulgariaBoundary.js';

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

// One interpolated value grid feeds both the filled heatmap and the contour
// tracer, so IDW only runs once per parameter/data change.
export function buildValueGrid(stationPoints) {
  const values = new Float32Array(GRID_COLS * GRID_ROWS).fill(NaN);
  if (stationPoints.length === 0) return values;
  const mask = getInsideMask();
  for (let row = 0; row < GRID_ROWS; row++) {
    const lat = gridLat(row);
    for (let col = 0; col < GRID_COLS; col++) {
      const i = row * GRID_COLS + col;
      if (!mask[i]) continue;
      const value = idwValue(stationPoints, lat, gridLon(col));
      values[i] = value === null ? NaN : value;
    }
  }
  return values;
}

export function renderHeatmapImage(valueGrid, getColorForValue) {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_COLS;
  canvas.height = GRID_ROWS;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(GRID_COLS, GRID_ROWS);

  for (let i = 0; i < valueGrid.length; i++) {
    const idx = i * 4;
    const value = valueGrid[i];
    if (Number.isNaN(value)) {
      imageData.data[idx + 3] = 0;
      continue;
    }
    const [r, g, b] = getColorForValue(value);
    imageData.data[idx] = r;
    imageData.data[idx + 1] = g;
    imageData.data[idx + 2] = b;
    imageData.data[idx + 3] = 255;
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
