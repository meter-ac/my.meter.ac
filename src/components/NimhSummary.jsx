import { useEffect, useState } from 'react';
import { NIMH_FIELDS, fetchNimhLocationStats } from '../api/nimhApi.js';
import BoxPlotChart from './BoxPlotChart.jsx';

// Same range presets meterac-ui's own summary_nimh.html offered.
const PERIODS = [
  { label: '1d', days: 1 },
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '2mo', days: 60 },
  { label: '3mo', days: 90 },
  { label: '6mo', days: 183 },
  { label: '1y', days: 365 },
  { label: '2y', days: 730 },
];

export default function NimhSummary() {
  const [fieldKey, setFieldKey] = useState('t_raw');
  const [periodDays, setPeriodDays] = useState(30);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    fetchNimhLocationStats(fieldKey, periodDays)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldKey, periodDays]);

  const activeField = NIMH_FIELDS.find((f) => f.key === fieldKey);

  return (
    <div className="summary-panel">
      <div className="summary-panel__controls">
        <select value={fieldKey} onChange={(e) => setFieldKey(e.target.value)}>
          {NIMH_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
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
      {items && <BoxPlotChart items={items} unit={activeField.unit} />}
    </div>
  );
}
