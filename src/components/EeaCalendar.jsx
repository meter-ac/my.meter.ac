import { useEffect, useMemo, useState } from 'react';
import { fetchEeaHistory } from '../api/externalApi.js';
import { createColorScale } from '../color/colorScale.js';
import { buildCalendarGridLayout } from '../utils/calendarLayout.js';
import CalendarGrid from './CalendarGrid.jsx';

// EEA has one reading per day per location (not a low/high pair), and the
// whole file (all locations, full ~12-year history) is small enough to fetch
// once and slice per location client-side rather than re-fetching on every
// picker change.
export default function EeaCalendar() {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchEeaHistory()
      .then((data) => {
        if (cancelled) return;
        setHistory(data);
        setLocation(data.locations[0]);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!history || !location) return [];
    const colIdx = history.locations.indexOf(location) + 1;
    return history.rows
      .map((cells) => ({ date: cells[0], value: Number(cells[colIdx]) }))
      .filter((r) => Number.isFinite(r.value));
  }, [history, location]);

  const gridLayout = useMemo(() => buildCalendarGridLayout(rows), [rows]);
  const colorScale = useMemo(() => (rows.length > 0 ? createColorScale(rows.map((r) => r.value)) : null), [rows]);

  return (
    <div className="calendar-heatmap">
      <div className="calendar-heatmap__controls">
        {history && (
          <select value={location ?? ''} onChange={(e) => setLocation(e.target.value)}>
            {history.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="calendar-heatmap__status">Couldn't load: {error}</div>}
      {!error && !history && <div className="calendar-heatmap__status">Loading…</div>}

      {gridLayout && colorScale && (
        <div className="calendar-heatmap__grids">
          <CalendarGrid
            cells={gridLayout.cells}
            weeks={gridLayout.weeks}
            monthLabels={gridLayout.monthLabels}
            colorScale={colorScale}
            unit="µSv/h"
            valueOf={(c) => c.value}
          />
        </div>
      )}
    </div>
  );
}
