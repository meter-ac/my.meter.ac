const INFLUX_QUERY_URL = 'https://meter.uni-plovdiv.net/query';
const INFLUX_DB = 'meter';
const INFLUX_USER = 'client';
const INFLUX_PASSWORD = 'pvY6wQNcT8cqDEfZ';

export const NIMH_FIELDS = [
  { key: 't_raw', label: 'Temperature', unit: '°C' },
  { key: 'p_raw', label: 'Pressure (measured)', unit: 'hPa' },
  { key: 'p_sea', label: 'Pressure (sea level)', unit: 'hPa' },
  { key: 'wind_speed', label: 'Wind speed', unit: 'm/s' },
];

// External Bulgarian met-institute stations (44 locations, no lat/lon — name
// only). Box-and-whisker per location for a time window, same shape as
// meterac-ui's own summary page — verified cheap live: a plain GROUP BY
// location aggregate, not the expensive per-node subquery the calendar
// heatmap needs (~0.3s/7KB for all 44 locations at 30d).
export async function fetchNimhLocationStats(parameterKey, days) {
  const query = `select median(${parameterKey}) as med, min(${parameterKey}) as lo, max(${parameterKey}) as hi, percentile(${parameterKey},25) as q1, percentile(${parameterKey},75) as q3, count(${parameterKey}) as n from nimh where time > now() - ${days}d group by location`;
  const url = `${INFLUX_QUERY_URL}?db=${INFLUX_DB}&u=${INFLUX_USER}&p=${INFLUX_PASSWORD}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load NIMH summary (${res.status})`);
  const data = await res.json();
  const series = data?.results?.[0]?.series ?? [];
  return series
    .map((s) => {
      const row = {};
      s.columns.forEach((col, i) => {
        row[col] = s.values[0][i];
      });
      return { label: s.tags?.location ?? '?', min: row.lo, q1: row.q1, median: row.med, q3: row.q3, max: row.hi, count: row.n };
    })
    .filter((it) => it.min !== null && it.max !== null)
    .sort((a, b) => a.label.localeCompare(b.label));
}
