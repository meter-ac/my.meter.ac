import { useMemo, useState } from 'react';
import { READING_FIELDS } from '../api/meterApi.js';
import { timeAgo, formatReading } from '../utils/format.js';

const COLUMNS = [
  { key: 'name', label: 'Station', getValue: (row) => row.name },
  { key: 'id', label: 'ID', getValue: (row) => row.id },
  { key: 'ts', label: 'Status', getValue: (row) => row.ts ?? -1 },
  { key: 'camera', label: 'Cam', getValue: (row, cameraIds) => (cameraIds.has(row.id) ? 1 : 0) },
  { key: 'altitude', label: 'Alt. [m]', getValue: (row) => row.altitude },
  ...READING_FIELDS.map((f) => ({ key: f.key, label: `${f.label} [${f.unit}]`, getValue: (row) => row[f.key] })),
];

export default function TableView({ stations, readings, cameraIds, onOpenNode }) {
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState(1);
  const [filterText, setFilterText] = useState('');

  const rows = useMemo(() => {
    return stations.map((station) => ({ ...station, ...(readings.get(station.id) ?? {}) }));
  }, [stations, readings]);

  const filteredSorted = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((r) => r.name?.toLowerCase().includes(needle) || r.id?.toLowerCase().includes(needle))
      : rows;
    const column = COLUMNS.find((c) => c.key === sortKey);
    return [...filtered].sort((a, b) => {
      const av = column.getValue(a, cameraIds);
      const bv = column.getValue(b, cameraIds);
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
      return (av - bv) * sortDir;
    });
  }, [rows, filterText, sortKey, sortDir, cameraIds]);

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => -d);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  return (
    <div className="table-view">
      <input
        type="text"
        className="table-view__filter"
        placeholder="Filter by name or ID…"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
      />
      <div className="table-view__scroll">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)}>
                  {c.label}
                  {sortKey === c.key ? (sortDir === 1 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((row) => (
              <tr key={row.id} onClick={() => onOpenNode(row.id)}>
                <td className="table-view__name-cell">{row.name}</td>
                <td>{row.id}</td>
                <td>
                  {row.ts ? (
                    <span className="status-dot status-dot--online" title={timeAgo(row.ts)} />
                  ) : (
                    <span className="status-dot status-dot--offline" title="No recent readings" />
                  )}{' '}
                  {row.ts ? timeAgo(row.ts) : 'no data'}
                </td>
                <td>{cameraIds.has(row.id) ? '📷' : ''}</td>
                <td>{Number.isFinite(row.altitude) ? row.altitude : '–'}</td>
                {READING_FIELDS.map((f) => (
                  <td key={f.key}>{typeof row[f.key] === 'number' ? formatReading(row[f.key]) : '–'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-view__count">{filteredSorted.length} stations</div>
    </div>
  );
}
