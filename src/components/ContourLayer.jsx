import { Polyline, Tooltip } from 'react-leaflet';
import { computeContourLevels, traceContour } from '../interpolation/contours.js';

const CONTOUR_COLOR = '#3a4a5c';

function longestSegmentIndex(segments) {
  let best = 0;
  let bestLenSq = -1;
  segments.forEach(([[lat1, lon1], [lat2, lon2]], i) => {
    const lenSq = (lat2 - lat1) ** 2 + (lon2 - lon1) ** 2;
    if (lenSq > bestLenSq) {
      bestLenSq = lenSq;
      best = i;
    }
  });
  return best;
}

export default function ContourLayer({ valueGrid, min, max, step, unit }) {
  if (!valueGrid) return null;
  const levels = computeContourLevels(min, max, step);

  return levels.map((level) => {
    const segments = traceContour(valueGrid, level);
    if (segments.length === 0) return null;
    const labelIndex = longestSegmentIndex(segments);
    return segments.map((positions, i) => (
      <Polyline
        key={`${level}-${i}`}
        positions={positions}
        pathOptions={{ color: CONTOUR_COLOR, weight: 1.5, opacity: 0.85 }}
      >
        {i === labelIndex && (
          <Tooltip permanent direction="center" className="contour-label" opacity={1}>
            {level}
            {unit}
          </Tooltip>
        )}
      </Polyline>
    ));
  });
}
