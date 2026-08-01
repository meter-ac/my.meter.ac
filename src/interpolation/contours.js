import { GRID_COLS, GRID_ROWS, gridLat, gridLon } from './grid.js';

export function computeContourLevels(min, max, step) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !step || min >= max) return [];
  const start = Math.ceil(min / step) * step;
  const levels = [];
  for (let level = start; level <= max; level += step) {
    levels.push(Math.round(level * 100) / 100);
  }
  return levels;
}

function interpEdge(v1, v2, level) {
  if (v1 === v2) return 0.5;
  return (level - v1) / (v2 - v1);
}

function gridToLatLon(col, row) {
  return [gridLat(row), gridLon(col)];
}

// Standard 16-case marching squares. Corner bits: TL=8, TR=4, BR=2, BL=1.
// Cases 5 and 10 are ambiguous "saddle" cells — resolved with a fixed split
// rather than center-value disambiguation, a rare, minor visual simplification.
export function traceContour(valueGrid, level) {
  const segments = [];
  for (let row = 0; row < GRID_ROWS - 1; row++) {
    for (let col = 0; col < GRID_COLS - 1; col++) {
      const tl = valueGrid[row * GRID_COLS + col];
      const tr = valueGrid[row * GRID_COLS + col + 1];
      const bl = valueGrid[(row + 1) * GRID_COLS + col];
      const br = valueGrid[(row + 1) * GRID_COLS + col + 1];
      if (Number.isNaN(tl) || Number.isNaN(tr) || Number.isNaN(bl) || Number.isNaN(br)) continue;

      let caseIndex = 0;
      if (tl >= level) caseIndex |= 8;
      if (tr >= level) caseIndex |= 4;
      if (br >= level) caseIndex |= 2;
      if (bl >= level) caseIndex |= 1;
      if (caseIndex === 0 || caseIndex === 15) continue;

      const top = gridToLatLon(col + interpEdge(tl, tr, level), row);
      const right = gridToLatLon(col + 1, row + interpEdge(tr, br, level));
      const bottom = gridToLatLon(col + interpEdge(bl, br, level), row + 1);
      const left = gridToLatLon(col, row + interpEdge(tl, bl, level));

      const linesByCase = {
        1: [[left, bottom]],
        2: [[bottom, right]],
        3: [[left, right]],
        4: [[top, right]],
        5: [[left, top], [bottom, right]],
        6: [[top, bottom]],
        7: [[left, top]],
        8: [[left, top]],
        9: [[top, bottom]],
        10: [[left, bottom], [top, right]],
        11: [[top, right]],
        12: [[left, right]],
        13: [[bottom, right]],
        14: [[left, bottom]],
      };

      for (const segment of linesByCase[caseIndex] ?? []) {
        segments.push(segment);
      }
    }
  }
  return segments;
}
