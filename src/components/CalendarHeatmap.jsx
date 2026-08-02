import { useEffect, useMemo, useState } from 'react';
import { READING_FIELDS, fetchDailyNetworkAverage } from '../api/meterApi.js';
import { createColorScale, SCALE_STOPS } from '../color/colorScale.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CELL = 11;
const CELL_GAP = 2;
const MONTH_LABEL_HEIGHT = 14;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GitHub-contributions-style grid: back up to the Sunday on/before the
// first day of data so week columns line up with real calendar weeks.
function startOfWeek(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function CalendarHeatmap() {
  const [fieldKey, setFieldKey] = useState('t_raw');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetchDailyNetworkAverage(fieldKey)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldKey]);

  const activeField = READING_FIELDS.find((f) => f.key === fieldKey);

  const { cells, colorScale, weeks, monthLabels } = useMemo(() => {
    if (!rows || rows.length === 0) return { cells: [], colorScale: null, weeks: 0, monthLabels: [] };
    const scale = createColorScale(rows.map((r) => r.value));
    const gridStart = startOfWeek(`${rows[0].date}T00:00:00Z`);

    let lastMonth = null;
    const labels = [];
    const cellsOut = rows.map((r) => {
      const date = new Date(`${r.date}T00:00:00Z`);
      const dayOffset = Math.round((date.getTime() - gridStart.getTime()) / DAY_MS);
      const week = Math.floor(dayOffset / 7);
      const month = date.getUTCMonth();
      if (month !== lastMonth) {
        labels.push({ week, label: MONTH_NAMES[month] });
        lastMonth = month;
      }
      return { dateStr: r.date, value: r.value, week, dayOfWeek: dayOffset % 7 };
    });
    const weekCount = Math.max(...cellsOut.map((c) => c.week)) + 1;
    return { cells: cellsOut, colorScale: scale, weeks: weekCount, monthLabels: labels };
  }, [rows]);

  const width = weeks * (CELL + CELL_GAP);
  const height = 7 * (CELL + CELL_GAP);
  const hovered = hoveredDate ? cells.find((c) => c.dateStr === hoveredDate) : null;

  return (
    <div className="calendar-heatmap">
      <select value={fieldKey} onChange={(e) => setFieldKey(e.target.value)}>
        {READING_FIELDS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      {error && <div className="calendar-heatmap__status">Couldn't load: {error}</div>}
      {!error && rows === null && <div className="calendar-heatmap__status">Loading…</div>}

      {rows && rows.length > 0 && (
        <>
          <div className="calendar-heatmap__scroll">
            <svg
              viewBox={`0 0 ${width} ${height + MONTH_LABEL_HEIGHT}`}
              width={width}
              height={height + MONTH_LABEL_HEIGHT}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {monthLabels.map((m) => (
                <text key={m.week} x={m.week * (CELL + CELL_GAP)} y={10} className="calendar-heatmap__month-label">
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
                  fill={colorScale.getColor(c.value)}
                  onMouseEnter={() => setHoveredDate(c.dateStr)}
                />
              ))}
            </svg>
          </div>
          <div className="calendar-heatmap__tooltip">
            {hovered
              ? `${formatDate(hovered.dateStr)} — ${Math.round(hovered.value * 10) / 10} ${activeField.unit}`
              : 'Hover a day for its network-wide average'}
          </div>
          <div className="calendar-heatmap__legend">
            <div
              className="layer-controls__gradient calendar-heatmap__gradient"
              style={{ background: `linear-gradient(to right, ${SCALE_STOPS.map(([r, g, b]) => `rgb(${r},${g},${b})`).join(', ')})` }}
            />
            <div className="calendar-heatmap__legend-labels">
              <span>
                {Math.round(colorScale.min * 10) / 10} {activeField.unit}
              </span>
              <span>
                {Math.round(colorScale.max * 10) / 10} {activeField.unit}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
