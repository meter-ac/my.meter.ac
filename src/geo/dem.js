import dem from '../assets/bulgaria-dem.json';

const { bounds, cols, rows, elevations } = dem;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// Coarse (40x30) elevation grid over Bulgaria, fetched once from Open Topo
// Data (SRTM 90m) and bundled as a static asset — no runtime network call.
// Bilinearly interpolated since it's much coarser than the app's 160x120
// interpolation grid.
export function elevationAt(lat, lon) {
  const colFrac = clamp(((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * (cols - 1), 0, cols - 1);
  const rowFrac = clamp(((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (rows - 1), 0, rows - 1);

  const c0 = Math.floor(colFrac);
  const r0 = Math.floor(rowFrac);
  const c1 = Math.min(cols - 1, c0 + 1);
  const r1 = Math.min(rows - 1, r0 + 1);
  const tx = colFrac - c0;
  const ty = rowFrac - r0;

  const e00 = elevations[r0 * cols + c0];
  const e10 = elevations[r0 * cols + c1];
  const e01 = elevations[r1 * cols + c0];
  const e11 = elevations[r1 * cols + c1];

  const top = e00 + (e10 - e00) * tx;
  const bottom = e01 + (e11 - e01) * tx;
  return top + (bottom - top) * ty;
}
