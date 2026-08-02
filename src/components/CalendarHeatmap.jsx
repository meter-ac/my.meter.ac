import { useEffect, useMemo, useState } from 'react';
import { READING_FIELDS, fetchDailyMinMax } from '../api/meterApi.js';
import { createColorScale, SCALE_STOPS } from '../color/colorScale.js';
import { stationMatchesRegion, REGIONS } from '../utils/regions.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CELL = 11;
const CELL_GAP = 2;
const MONTH_LABEL_HEIGHT = 14;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Wide scopes (all stations, or a whole region) get pricier the longer the
// period — verified live: whole-network 365d is ~4.8s, 1000d balloons to
// ~36.6s. A single station stays cheap even over years, so only that scope
// gets the longer options.
const MULTI_NODE_PERIODS = [
  { label: '1mo', days: 30 },
  { label: '3mo', days: 90 },
  { label: '6mo', days: 182 },
  { label: '12mo', days: 365 },
];
const SINGLE_STATION_PERIODS = [
  ...MULTI_NODE_PERIODS,
  { label: '24mo', days: 730 },
  { label: 'All-time', days: 3000 },
];

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

function parseScope(value) {
  if (value.startsWith('region:')) return { type: 'region', region: value.slice(7) };
  if (value.startsWith('station:')) return { type: 'station', stationId: value.slice(8) };
  return { type: 'all' };
}

const GRADIENT_CSS = `linear-gradient(to right, ${SCALE_STOPS.map(([r, g, b]) => `rgb(${r},${g},${b})`).join(', ')})`;

function MiniCalendarGrid({ title, cells, weeks, monthLabels, colorScale, unit, valueOf }) {
  const [hoveredDate, setHoveredDate] = useState(null);
  const width = weeks * (CELL + CELL_GAP);
  const height = 7 * (CELL + CELL_GAP);
  const hovered = hoveredDate ? cells.find((c) => c.dateStr === hoveredDate) : null;

  return (
    <div className="calendar-heatmap__grid">
      <div className="calendar-heatmap__grid-title">{title}</div>
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
              fill={colorScale.getColor(valueOf(c))}
              onMouseEnter={() => setHoveredDate(c.dateStr)}
            />
          ))}
        </svg>
      </div>
      <div className="calendar-heatmap__tooltip">
        {hovered
          ? `${formatDate(hovered.dateStr)} — ${Math.round(valueOf(hovered) * 10) / 10} ${unit}`
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

export default function CalendarHeatmap({ stations }) {
  const [fieldKey, setFieldKey] = useState('t_raw');
  const [scope, setScope] = useState('all');
  const [periodDays, setPeriodDays] = useState(30);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const parsedScope = parseScope(scope);
  const isWideScope = parsedScope.type !== 'station';
  const periodOptions = isWideScope ? MULTI_NODE_PERIODS : SINGLE_STATION_PERIODS;

  const nodeIds = useMemo(() => {
    if (parsedScope.type === 'station') return [parsedScope.stationId];
    if (parsedScope.type === 'region') {
      return stations.filter((s) => stationMatchesRegion(s, parsedScope.region)).map((s) => s.id);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, stations]);

  const sortedStations = useMemo(() => [...stations].sort((a, b) => a.name.localeCompare(b.name)), [stations]);

  function handleScopeChange(value) {
    setScope(value);
    const wide = parseScope(value).type !== 'station';
    if (wide && periodDays > 365) setPeriodDays(365);
  }

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetchDailyMinMax(fieldKey, { days: periodDays, nodeIds })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldKey, periodDays, nodeIds]);

  const activeField = READING_FIELDS.find((f) => f.key === fieldKey);

  const gridLayout = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const gridStart = startOfWeek(`${rows[0].date}T00:00:00Z`);
    let lastMonth = null;
    const monthLabels = [];
    const cells = rows.map((r) => {
      const date = new Date(`${r.date}T00:00:00Z`);
      const dayOffset = Math.round((date.getTime() - gridStart.getTime()) / DAY_MS);
      const week = Math.floor(dayOffset / 7);
      const month = date.getUTCMonth();
      if (month !== lastMonth) {
        monthLabels.push({ week, label: MONTH_NAMES[month] });
        lastMonth = month;
      }
      return { dateStr: r.date, min: r.min, max: r.max, week, dayOfWeek: dayOffset % 7 };
    });
    const weeks = Math.max(...cells.map((c) => c.week)) + 1;
    return { cells, weeks, monthLabels };
  }, [rows]);

  const lowScale = useMemo(() => (rows ? createColorScale(rows.map((r) => r.min)) : null), [rows]);
  const highScale = useMemo(() => (rows ? createColorScale(rows.map((r) => r.max)) : null), [rows]);

  return (
    <div className="calendar-heatmap">
      <div className="calendar-heatmap__controls">
        <select value={fieldKey} onChange={(e) => setFieldKey(e.target.value)}>
          {READING_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>

        <select value={scope} onChange={(e) => handleScopeChange(e.target.value)}>
          <option value="all">All stations</option>
          <optgroup label="Region">
            {REGIONS.map((r) => (
              <option key={r.key} value={`region:${r.key}`}>
                {r.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Station">
            {sortedStations.map((s) => (
              <option key={s.id} value={`station:${s.id}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>

        <div className="layer-controls__segmented calendar-heatmap__period">
          {periodOptions.map((p) => (
            <button
              key={p.label}
              type="button"
              className={periodDays === p.days ? 'is-active' : ''}
              onClick={() => setPeriodDays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="calendar-heatmap__status">Couldn't load: {error}</div>}
      {!error && rows === null && <div className="calendar-heatmap__status">Loading…</div>}

      {gridLayout && lowScale && highScale && (
        <div className="calendar-heatmap__grids">
          <MiniCalendarGrid
            title="Daily low (avg)"
            cells={gridLayout.cells}
            weeks={gridLayout.weeks}
            monthLabels={gridLayout.monthLabels}
            colorScale={lowScale}
            unit={activeField.unit}
            valueOf={(c) => c.min}
          />
          <MiniCalendarGrid
            title="Daily high (avg)"
            cells={gridLayout.cells}
            weeks={gridLayout.weeks}
            monthLabels={gridLayout.monthLabels}
            colorScale={highScale}
            unit={activeField.unit}
            valueOf={(c) => c.max}
          />
        </div>
      )}
    </div>
  );
}
