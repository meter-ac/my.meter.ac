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

// Tukey's fences: 1.5x the interquartile range beyond Q1/Q3. Returns null
// when there aren't enough points to fit quartiles meaningfully.
function tukeyFenceBounds(sortedFiniteValues) {
  if (sortedFiniteValues.length < 4) return null;
  const q1 = quantile(sortedFiniteValues, 0.25);
  const q3 = quantile(sortedFiniteValues, 0.75);
  const iqr = q3 - q1;
  return { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
}

// Drops points outside the Tukey fence computed from the group's own values
// — used to keep a broken sensor (e.g. a pressure reading in the thousands
// of hPa) out of the map interpolation entirely, not just out of the color
// scale below. Falls back to the unfiltered list if fencing would remove
// everything (e.g. too few points, or every value legitimately far apart).
export function filterTukeyOutliers(points, valueOf = (p) => p.value) {
  const finite = points
    .map(valueOf)
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);
  const bounds = tukeyFenceBounds(finite);
  if (!bounds) return points;
  const within = points.filter((p) => {
    const v = valueOf(p);
    return typeof v === 'number' && Number.isFinite(v) && v >= bounds.lower && v <= bounds.upper;
  });
  return within.length > 0 ? within : points;
}

// Bounds exclude outliers using the same Tukey fence instead of true
// min/max — a handful of faulty sensors would otherwise stretch the whole
// scale and swamp every real reading into one color. This adapts to however
// many outliers actually exist, unlike trimming a fixed percentage, and works
// the same way regardless of parameter/unit. Values outside the fence still
// render, just clamped to the nearest end color instead of extending the ramp.
//
// useTukeyFences: false skips this — a curator trying to spot failed sensors
// wants exactly the opposite behavior, since a fenced-out faulty reading gets
// clamped to a normal-looking end color instead of standing out. Defaults on
// for the general map view; see utils/curatorSettings.js for the toggle,
// which also gates filterTukeyOutliers above for the interpolated surface.
export function createColorScale(values, { useTukeyFences = true } = {}) {
  const finite = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (finite.length === 0) {
    return { min: 0, max: 0, getColor: () => 'rgb(154,165,173)', getColorForValue: () => [154, 165, 173] };
  }
  let scaleValues = finite;
  const bounds = useTukeyFences ? tukeyFenceBounds(finite) : null;
  if (bounds) {
    const withinFence = finite.filter((v) => v >= bounds.lower && v <= bounds.upper);
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

// Same blue→red ramp as createColorScale, but anchored to a fixed domain
// instead of this dataset's own spread — for parameters (temperature) where
// a uniformly mild/cold day shouldn't still get stretched blue-to-red just
// because that's today's range. See color/fixedRanges.js for the anchors.
export function createFixedColorScale(min, max) {
  const span = max - min || 1;
  const getColorForValue = (value) => colorAt((value - min) / span);
  const getColor = (value) => {
    const [r, g, b] = getColorForValue(value);
    return `rgb(${r},${g},${b})`;
  };
  return { min, max, getColor, getColorForValue };
}

export const SCALE_STOPS = STOPS;
