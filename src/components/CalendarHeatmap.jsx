import { useEffect, useMemo, useState } from 'react';
import { READING_FIELDS, fetchDailyMinMax } from '../api/meterApi.js';
import { createColorScale } from '../color/colorScale.js';
import { stationMatchesRegion, REGIONS } from '../utils/regions.js';
import { buildCalendarGridLayout } from '../utils/calendarLayout.js';
import CalendarGrid from './CalendarGrid.jsx';

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

function parseScope(value) {
  if (value.startsWith('region:')) return { type: 'region', region: value.slice(7) };
  if (value.startsWith('station:')) return { type: 'station', stationId: value.slice(8) };
  return { type: 'all' };
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
  const gridLayout = useMemo(() => buildCalendarGridLayout(rows), [rows]);
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
          <CalendarGrid
            title="Daily low (avg)"
            cells={gridLayout.cells}
            weeks={gridLayout.weeks}
            monthLabels={gridLayout.monthLabels}
            colorScale={lowScale}
            unit={activeField.unit}
            valueOf={(c) => c.min}
          />
          <CalendarGrid
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
