import { useState } from 'react';
import { formatCalendarDate } from '../utils/calendarLayout.js';
import { SCALE_STOPS } from '../color/colorScale.js';

const CELL = 11;
const CELL_GAP = 2;
const MONTH_LABEL_HEIGHT = 14;
const GRADIENT_CSS = `linear-gradient(to right, ${SCALE_STOPS.map(([r, g, b]) => `rgb(${r},${g},${b})`).join(', ')})`;

// One GitHub-contributions-style day grid with its own hover tooltip and
// legend. Shared by CalendarHeatmap (Nodes daily low/high — rendered twice,
// once per stat) and EeaCalendar (a single grid, one value per day).
export default function CalendarGrid({ title, cells, weeks, monthLabels, colorScale, unit, valueOf }) {
  const [hoveredDate, setHoveredDate] = useState(null);
  const width = weeks * (CELL + CELL_GAP);
  const height = 7 * (CELL + CELL_GAP);
  const hovered = hoveredDate ? cells.find((c) => c.dateStr === hoveredDate) : null;

  return (
    <div className="calendar-heatmap__grid">
      {title && <div className="calendar-heatmap__grid-title">{title}</div>}
      <div className="calendar-heatmap__scroll">
        <svg
          viewBox={`0 0 ${width} ${height + MONTH_LABEL_HEIGHT}`}
          width={width}
          height={height + MONTH_LABEL_HEIGHT}
          onMouseLeave={() => setHoveredDate(null)}
        >
          {monthLabels.map((m, i) => (
            <text key={`${m.week}-${i}`} x={m.week * (CELL + CELL_GAP)} y={10} className="calendar-heatmap__month-label">
              {m.label}
            </text>
          ))}
          {cells.map((c) => (
            <rect
              key={c.dateStr}
              x={c.week * (CELL + CELL_GAP)}
              y={MONTH_LABEL_HEIGHT + c.dayOfWeek * (CELL + CELL_GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={colorScale.getColor(valueOf(c))}
              onMouseEnter={() => setHoveredDate(c.dateStr)}
            />
          ))}
        </svg>
      </div>
      <div className="calendar-heatmap__tooltip">
        {hovered
          ? `${formatCalendarDate(hovered.dateStr)} — ${Math.round(valueOf(hovered) * 10) / 10} ${unit}`
          : 'Hover a day for its value'}
      </div>
      <div className="calendar-heatmap__legend">
        <div className="layer-controls__gradient calendar-heatmap__gradient" style={{ background: GRADIENT_CSS }} />
        <div className="calendar-heatmap__legend-labels">
          <span>
            {Math.round(colorScale.min * 10) / 10} {unit}
          </span>
          <span>
            {Math.round(colorScale.max * 10) / 10} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
