import { useEffect, useMemo, useState } from 'react';
import { READING_FIELDS, fetchNodeHistory } from '../api/meterApi.js';
import HistoryChart from './HistoryChart.jsx';

const RANGES = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
];

export default function NodeHistoryPanel({ nodeId }) {
  const [rangeHours, setRangeHours] = useState(24);
  const [fieldKey, setFieldKey] = useState('t_raw');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetchNodeHistory(nodeId, rangeHours)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [nodeId, rangeHours]);

  const activeField = READING_FIELDS.find((f) => f.key === fieldKey);

  const points = useMemo(() => {
    if (!rows) return [];
    return rows
      .filter((r) => typeof r[fieldKey] === 'number' && Number.isFinite(r[fieldKey]))
      .map((r) => ({ time: r.time, value: r[fieldKey] }));
  }, [rows, fieldKey]);

  return (
    <div className="node-history-panel">
      <div className="node-history-panel__controls">
        <select value={fieldKey} onChange={(e) => setFieldKey(e.target.value)}>
          {READING_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="layer-controls__segmented node-history-panel__range">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              className={rangeHours === r.hours ? 'is-active' : ''}
              onClick={() => setRangeHours(r.hours)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="node-history-panel__status">Couldn't load history: {error}</div>
      ) : rows === null ? (
        <div className="node-history-panel__status">Loading…</div>
      ) : (
        <HistoryChart points={points} label={activeField.label} unit={activeField.unit} />
      )}
    </div>
  );
}
