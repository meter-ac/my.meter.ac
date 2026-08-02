import { useEffect, useState } from 'react';
import { fetchEarthquakeLocationStats } from '../api/externalApi.js';
import BoxPlotChart from './BoxPlotChart.jsx';

const PERIODS = [
  { label: '30d', days: 30 },
  { label: '2mo', days: 60 },
  { label: '3mo', days: 90 },
  { label: '6mo', days: 183 },
  { label: '1y', days: 365 },
  { label: '2y', days: 730 },
  { label: '5y', days: 1825 },
];

const STATS = [
  { key: 'magnitude', label: 'Magnitude', unit: '' },
  { key: 'depth', label: 'Depth', unit: 'km' },
];

export default function EarthquakeSummary() {
  const [statKey, setStatKey] = useState('magnitude');
  const [periodDays, setPeriodDays] = useState(365);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    fetchEarthquakeLocationStats(periodDays, statKey)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [periodDays, statKey]);

  const activeStat = STATS.find((s) => s.key === statKey);

  return (
    <div className="summary-panel">
      <div className="summary-panel__controls">
        <div className="layer-controls__segmented summary-panel__stat">
          {STATS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={statKey === s.key ? 'is-active' : ''}
              onClick={() => setStatKey(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="layer-controls__segmented summary-panel__period">
          {PERIODS.map((p) => (
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
      {error && <div className="summary-panel__status">Couldn't load: {error}</div>}
      {!error && items === null && <div className="summary-panel__status">Loading…</div>}
      {items && items.length === 0 && (
        <div className="summary-panel__status">No earthquakes recorded in this period.</div>
      )}
      {items && items.length > 0 && (
        <BoxPlotChart items={items} unit={activeStat.unit} invertY={statKey === 'depth'} />
      )}
    </div>
  );
}
