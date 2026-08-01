const STOPS = [
  [33, 102, 172], // blue
  [103, 200, 200], // cyan
  [90, 180, 90], // green
  [230, 200, 60], // yellow
  [220, 60, 40], // red
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function colorAt(t) {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(scaled));
  const localT = scaled - i;
  const [r1, g1, b1] = STOPS[i];
  const [r2, g2, b2] = STOPS[i + 1];
  return [Math.round(lerp(r1, r2, localT)), Math.round(lerp(g1, g2, localT)), Math.round(lerp(b1, b2, localT))];
}

function quantile(sortedValues, p) {
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * (idx - lo);
}

// Bounds exclude outliers using Tukey's fences (1.5x the interquartile range
// beyond Q1/Q3) instead of true min/max — a handful of faulty sensors (e.g. a
// pressure reading in the thousands of hPa) would otherwise stretch the whole
// scale and swamp every real reading into one color. This adapts to however
// many outliers actually exist, unlike trimming a fixed percentage, and works
// the same way regardless of parameter/unit. Values outside the fence still
// render, just clamped to the nearest end color instead of extending the ramp.
export function createColorScale(values) {
  const finite = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (finite.length === 0) {
    return { min: 0, max: 0, getColor: () => 'rgb(154,165,173)', getColorForValue: () => [154, 165, 173] };
  }
  let scaleValues = finite;
  if (finite.length >= 4) {
    const q1 = quantile(finite, 0.25);
    const q3 = quantile(finite, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    const withinFence = finite.filter((v) => v >= lowerFence && v <= upperFence);
    if (withinFence.length > 0) scaleValues = withinFence;
  }
  const min = scaleValues[0];
  const max = scaleValues[scaleValues.length - 1];
  const span = max - min || 1;
  const getColorForValue = (value) => colorAt((value - min) / span);
  const getColor = (value) => {
    const [r, g, b] = getColorForValue(value);
    return `rgb(${r},${g},${b})`;
  };
  return { min, max, getColor, getColorForValue };
}

export const SCALE_STOPS = STOPS;
