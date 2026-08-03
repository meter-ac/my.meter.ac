import { GRID_COLS, GRID_ROWS, gridLat, gridLon } from './grid.js';
import { buildValueGrid } from './idw.js';
import { elevationAt } from '../geo/dem.js';

const STANDARD_LAPSE_RATE = -0.0065; // °C per meter, ICAO standard atmosphere

// Ordinary least squares fit of value ~ altitude. Returns null if there
// aren't enough points or altitude barely varies (can't fit a slope).
function fitLinearTrend(points) {
  const n = points.length;
  if (n < 5) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.altitude;
    sumY += p.value;
    sumXY += p.altitude * p.value;
    sumXX += p.altitude * p.altitude;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-6) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, fitted: true };
}

function fallbackTrend(points) {
  const intercept = points.reduce((sum, p) => sum + (p.value - STANDARD_LAPSE_RATE * p.altitude), 0) / points.length;
  return { slope: STANDARD_LAPSE_RATE, intercept, fitted: false };
}

// Detrend station readings by a fitted (or standard) lapse rate, interpolate
// the residual field (IDW by default, or gridBuilder if given — see
// idw.js's buildVoronoiGrid for the alternative), then re-trend each grid
// cell using the real terrain elevation under it (from the bundled DEM).
// Fitting the slope from live data — rather than assuming a fixed
// -6.5°C/km — also means a temperature inversion (higher stations reading
// warmer) comes out the right sign instead of being corrected the wrong way.
export function buildAltitudeCorrectedGrid(stationPoints, gridBuilder = buildValueGrid) {
  const empty = new Float32Array(GRID_COLS * GRID_ROWS).fill(NaN);
  if (stationPoints.length === 0) return { grid: empty, trend: null };

  const trend = fitLinearTrend(stationPoints) ?? fallbackTrend(stationPoints);

  const residualPoints = stationPoints.map((p) => ({
    lat: p.lat,
    lon: p.lon,
    value: p.value - (trend.intercept + trend.slope * p.altitude),
  }));
  const residualGrid = gridBuilder(residualPoints);

  const grid = new Float32Array(GRID_COLS * GRID_ROWS);
  for (let row = 0; row < GRID_ROWS; row++) {
    const lat = gridLat(row);
    for (let col = 0; col < GRID_COLS; col++) {
      const i = row * GRID_COLS + col;
      const residual = residualGrid[i];
      if (Number.isNaN(residual)) {
        grid[i] = NaN;
        continue;
      }
      grid[i] = residual + trend.intercept + trend.slope * elevationAt(lat, gridLon(col));
    }
  }
  return { grid, trend };
}
