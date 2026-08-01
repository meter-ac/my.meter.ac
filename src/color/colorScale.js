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

export function createColorScale(values) {
  const finite = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (finite.length === 0) {
    return { min: 0, max: 0, getColor: () => 'rgb(154,165,173)', getColorForValue: () => [154, 165, 173] };
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const getColorForValue = (value) => colorAt((value - min) / span);
  const getColor = (value) => {
    const [r, g, b] = getColorForValue(value);
    return `rgb(${r},${g},${b})`;
  };
  return { min, max, getColor, getColorForValue };
}

export const SCALE_STOPS = STOPS;
