import { useMemo, useState } from 'react';

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 12, right: 16, bottom: 24, left: 44 };

function formatTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryChart({ points, label, unit, color = '#1a5f8c' }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const { path, dots, xForIndex, minValue, maxValue } = useMemo(() => {
    if (points.length === 0) return { path: '', dots: [], xForIndex: () => 0, minValue: 0, maxValue: 0 };

    const values = points.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const valuePad = (max - min) * 0.1;
    min -= valuePad;
    max += valuePad;

    const innerWidth = WIDTH - PADDING.left - PADDING.right;
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const xFor = (i) => PADDING.left + (points.length === 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth);
    const yFor = (v) => PADDING.top + innerHeight - ((v - min) / (max - min)) * innerHeight;

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.value)}`).join(' ');
    const dotPositions = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }));

    return { path: linePath, dots: dotPositions, xForIndex: xFor, minValue: min + valuePad, maxValue: max - valuePad };
  }, [points]);

  if (points.length === 0) {
    return <div className="history-chart__empty">No data for this range</div>;
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handleMouseMove(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(xForIndex(i) - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  }

  return (
    <div className="history-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="history-chart__svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <text x={PADDING.left - 6} y={PADDING.top + 4} textAnchor="end" className="history-chart__axis-label">
          {Math.round(maxValue * 10) / 10}
        </text>
        <text x={PADDING.left - 6} y={HEIGHT - PADDING.bottom} textAnchor="end" className="history-chart__axis-label">
          {Math.round(minValue * 10) / 10}
        </text>
        <text x={PADDING.left} y={HEIGHT - 6} className="history-chart__axis-label">
          {formatTime(points[0].time)}
        </text>
        <text x={WIDTH - PADDING.right} y={HEIGHT - 6} textAnchor="end" className="history-chart__axis-label">
          {formatTime(points[points.length - 1].time)}
        </text>
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
        {hovered && (
          <>
            <line x1={dots[hoverIndex].x} x2={dots[hoverIndex].x} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} className="history-chart__hover-line" />
            <circle cx={dots[hoverIndex].x} cy={dots[hoverIndex].y} r="3.5" fill={color} />
          </>
        )}
      </svg>
      <div className="history-chart__tooltip">
        {hovered
          ? `${formatTime(hovered.time)} — ${Math.round(hovered.value * 10) / 10} ${unit}`
          : `${label}: hover the chart for a value`}
      </div>
    </div>
  );
}
