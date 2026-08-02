import { useMemo, useState } from 'react';
import { timeAgo, formatReading } from '../utils/format.js';

// Generic sortable/filterable station table, used for Nodes, Meteo, and
// Earth — they're all "stations with a current reading," just different
// field sets and data sources. cameraIds/onOpenNode are optional: Meteo and
// Earth have neither a camera flag nor a node detail page (NodeDetailPage is
// hardcoded to the `box` measurement's fields), so those columns/the
// row-click just don't render when the props are omitted. externalLinkFor is
// the Meteo/Earth alternative — a per-row link out to that station's own
// history chart on meter.ac (confirmed live: .../gs/meteo/{id}/history.html
// and .../gs/earth/{id}/history.html both work, unlike gauge.html which 404s
// for those two networks).
export default function StationTable({ stations, readings, fields, cameraIds, onOpenNode, externalLinkFor }) {
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState(1);
  const [filterText, setFilterText] = useState('');

  const columns = useMemo(() => {
    const cols = [
      { key: 'name', label: 'Station', getValue: (row) => row.name },
      { key: 'id', label: 'ID', getValue: (row) => row.id },
      { key: 'ts', label: 'Status', getValue: (row) => row.ts ?? -1 },
    ];
    if (cameraIds) cols.push({ key: 'camera', label: 'Cam', getValue: (row) => (cameraIds.has(row.id) ? 1 : 0) });
    if (externalLinkFor) cols.push({ key: 'link', label: 'Chart', getValue: () => 0 });
    cols.push({ key: 'altitude', label: 'Alt. [m]', getValue: (row) => row.altitude });
    cols.push(...fields.map((f) => ({ key: f.key, label: `${f.label} [${f.unit}]`, getValue: (row) => row[f.key] })));
    return cols;
  }, [fields, cameraIds, externalLinkFor]);

  const rows = useMemo(() => {
    return stations.map((station) => ({ ...station, ...(readings.get(station.id) ?? {}) }));
  }, [stations, readings]);

  const filteredSorted = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((r) => r.name?.toLowerCase().includes(needle) || r.id?.toLowerCase().includes(needle))
      : rows;
    const column = columns.find((c) => c.key === sortKey) ?? columns[0];
    return [...filtered].sort((a, b) => {
      const av = column.getValue(a);
      const bv = column.getValue(b);
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
      return (av - bv) * sortDir;
    });
  }, [rows, filterText, sortKey, sortDir, columns]);

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
              {columns.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)}>
                  {c.label}
                  {sortKey === c.key ? (sortDir === 1 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((row) => (
              <tr key={row.id} onClick={onOpenNode ? () => onOpenNode(row.id) : undefined}>
                <td className={onOpenNode ? 'table-view__name-cell' : ''}>{row.name}</td>
                <td>{row.id}</td>
                <td>
                  {row.ts ? (
                    <span className="status-dot status-dot--online" title={timeAgo(row.ts)} />
                  ) : (
                    <span className="status-dot status-dot--offline" title="No recent readings" />
                  )}{' '}
                  {row.ts ? timeAgo(row.ts) : 'no data'}
                </td>
                {cameraIds && <td>{cameraIds.has(row.id) ? '📷' : ''}</td>}
                {externalLinkFor && (
                  <td>
                    <a
                      href={externalLinkFor(row)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      History ↗
                    </a>
                  </td>
                )}
                <td>{Number.isFinite(row.altitude) ? row.altitude : '–'}</td>
                {fields.map((f) => (
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
