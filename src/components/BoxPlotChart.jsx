import { useMemo, useState } from 'react';

const COLUMN_WIDTH = 26;
const BOX_WIDTH = 15;
const HEIGHT = 240;
const PADDING = { top: 12, right: 16, bottom: 150, left: 48 };
const H_TICKS = 4;

function round1(v) {
  return Math.round(v * 10) / 10;
}

// Hand-rolled box-and-whisker chart — one column per category (station/
// region), min-max whisker + q1-q3 box + median line. Horizontally
// scrollable for the 40+ categories NIMH/Earthquakes have.
export default function BoxPlotChart({ items, unit }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const { width, innerHeight, yFor, hLines } = useMemo(() => {
    const innerH = HEIGHT - PADDING.top - PADDING.bottom;
    if (items.length === 0) return { width: 0, innerHeight: innerH, yFor: () => 0, hLines: [] };
    let min = Math.min(...items.map((it) => it.min));
    let max = Math.max(...items.map((it) => it.max));
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.08;
    min -= pad;
    max += pad;
    const yForValue = (v) => PADDING.top + innerH - ((v - min) / (max - min)) * innerH;
    const lines = Array.from({ length: H_TICKS + 1 }, (_, i) => {
      const t = i / H_TICKS;
      return { y: PADDING.top + t * innerH, value: max - t * (max - min) };
    });
    return {
      width: items.length * COLUMN_WIDTH + PADDING.left + PADDING.right,
      innerHeight: innerH,
      yFor: yForValue,
      hLines: lines,
    };
  }, [items]);

  if (items.length === 0) {
    return <div className="boxplot-chart__status">No data for this selection</div>;
  }

  const hovered = hoverIndex !== null ? items[hoverIndex] : null;

  return (
    <div className="boxplot-chart">
      <div className="boxplot-chart__scroll">
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT}>
          {hLines.map((h, i) => (
            <g key={i}>
              <line x1={PADDING.left} x2={width - PADDING.right} y1={h.y} y2={h.y} className="history-chart__gridline" />
              <text x={PADDING.left - 6} y={h.y + 3} textAnchor="end" className="history-chart__axis-label">
                {round1(h.value)}
              </text>
            </g>
          ))}
          {items.map((it, i) => {
            const cx = PADDING.left + i * COLUMN_WIDTH + COLUMN_WIDTH / 2;
            const isHovered = hoverIndex === i;
            const labelY = HEIGHT - PADDING.bottom + 10;
            return (
              <g
                key={it.label}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
              >
                <rect x={PADDING.left + i * COLUMN_WIDTH} y={0} width={COLUMN_WIDTH} height={HEIGHT} fill="transparent" />
                <line x1={cx} x2={cx} y1={yFor(it.min)} y2={yFor(it.max)} className="boxplot-chart__whisker" />
                <rect
                  x={cx - BOX_WIDTH / 2}
                  y={yFor(it.q3)}
                  width={BOX_WIDTH}
                  height={Math.max(1, yFor(it.q1) - yFor(it.q3))}
                  className={isHovered ? 'boxplot-chart__box is-hovered' : 'boxplot-chart__box'}
                />
                <line
                  x1={cx - BOX_WIDTH / 2}
                  x2={cx + BOX_WIDTH / 2}
                  y1={yFor(it.median)}
                  y2={yFor(it.median)}
                  className="boxplot-chart__median"
                />
                <text
                  x={cx}
                  y={labelY}
                  textAnchor="end"
                  transform={`rotate(-90 ${cx} ${labelY})`}
                  className="history-chart__axis-label"
                >
                  {it.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="boxplot-chart__tooltip">
        {hovered
          ? `${hovered.label}: median ${round1(hovered.median)} ${unit}, range ${round1(hovered.min)}–${round1(hovered.max)} ${unit} (n=${hovered.count})`
          : 'Hover a box for its median/range and sample count'}
      </div>
    </div>
  );
}
