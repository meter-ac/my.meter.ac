import { parseCsv } from '../utils/csv.js';

const NODES_CSV_URL = 'https://meter.ac/gs/metadata/nodes.csv';
const NODES_TXT_URL = 'https://meter.ac/gs/nodes/nodes.txt';
const INFLUX_QUERY_URL = 'https://meter.uni-plovdiv.net/query';
const INFLUX_DB = 'meter';
const INFLUX_USER = 'client';
const INFLUX_PASSWORD = 'pvY6wQNcT8cqDEfZ';

const FIELD_KEYS = ['t_raw', 't_dew', 'p_raw', 'p_sea', 'rh', 'pm25', 'pm10', 'gamma_cpm'];

// meterac-ui's own build-time node list (src/_data/nodes.js) drops these by
// name alongside anything location-prefixed "test_" — a hand-picked
// exclusion list (known test rig / decommissioned hut), not a freshness
// check. nodes.csv doesn't apply it, so without this our map was showing
// "test_indoors" as a real station and Makedonia_Hut was actually getting
// live InfluxDB readings (its name doesn't start with "test_", so the
// `!~ /^test_/` filter alone didn't catch it).
const EXCLUDED_LOCATIONS = ['test_indoors', 'Makedonia_Hut'];
const LOCATION_FILTER = `location != 'unknown' and location !~ /^test_/${EXCLUDED_LOCATIONS.map((loc) => ` and location != '${loc}'`).join('')}`;

const LATEST_QUERY = `select last(ts) as ts, ${FIELD_KEYS.map((k) => `last(${k}) as ${k}`).join(', ')} from box where ${LOCATION_FILTER} and time > now() - 2h group by node_id`;

const DAY_AVERAGE_QUERY = `select ${FIELD_KEYS.map((k) => `mean(${k}) as ${k}`).join(', ')}, count(t_raw) as sample_count from box where ${LOCATION_FILTER} and time > now() - 24h group by node_id`;

// p_raw is the station's raw ambient reading (altitude-dependent, not
// comparable station-to-station); p_sea is that same reading reduced to
// mean sea level by the ingest pipeline, which is what's actually meaningful
// for isobars across stations at different elevations.
//
// contourStep is the spacing between contour lines, in the field's own unit —
// fixed per parameter (like real isobar maps use a fixed 4 hPa step) rather than
// derived from the live min/max, so a single outlier reading can't skew the spacing.
export const READING_FIELDS = [
  { key: 't_raw', label: 'Temperature', unit: '°C', contourStep: 2 },
  { key: 't_dew', label: 'Dew point', unit: '°C', contourStep: 2 },
  { key: 'p_raw', label: 'Pressure (measured)', unit: 'hPa', contourStep: 4 },
  { key: 'p_sea', label: 'Pressure (sea level)', unit: 'hPa', contourStep: 4 },
  { key: 'rh', label: 'Humidity', unit: '%', contourStep: 10 },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', contourStep: 20 },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', contourStep: 20 },
  { key: 'gamma_cpm', label: 'Radiation', unit: 'CPM', contourStep: 10 },
];

export async function fetchStations() {
  const res = await fetch(NODES_CSV_URL);
  if (!res.ok) throw new Error(`Failed to load station list (${res.status})`);
  const rows = parseCsv(await res.text());
  return rows
    .map((row) => ({
      id: row.NodeID,
      name: row.Location,
      altitude: Number(row.Altitude),
      lat: Number(row.Latitude),
      lon: Number(row.Longitude),
    }))
    .filter(
      (s) =>
        s.id &&
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lon) &&
        !EXCLUDED_LOCATIONS.includes(s.name) &&
        !s.name?.startsWith('test_'),
    );
}

async function runInfluxQuery(query) {
  const url = `${INFLUX_QUERY_URL}?db=${INFLUX_DB}&u=${INFLUX_USER}&p=${INFLUX_PASSWORD}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load readings (${res.status})`);
  const data = await res.json();
  const series = data?.results?.[0]?.series ?? [];
  const byNodeId = new Map();
  for (const s of series) {
    const nodeId = s.tags?.node_id;
    if (!nodeId) continue;
    const row = {};
    s.columns.forEach((col, i) => {
      row[col] = s.values[0][i];
    });
    byNodeId.set(nodeId, row);
  }
  return byNodeId;
}

export function fetchLatestReadings() {
  return runInfluxQuery(LATEST_QUERY);
}

export function fetchDayAverageReadings() {
  return runInfluxQuery(DAY_AVERAGE_QUERY);
}

const TIME_LAPSE_HOURS = 24;
const TIME_LAPSE_BUCKET_MINUTES = 30;

// One parameter's 24h history, bucketed into 30-min frames — fetched on
// demand for whichever parameter is being animated, not preloaded for all 8
// (a single parameter is already ~270KB/49 frames; all 8 would be ~2MB).
// Frame reading objects deliberately have the same {[parameterKey]: value}
// shape as the other fetchers' rows, so every existing `reading[key]` call
// site (marker coloring, popup field list) works unchanged on a time-lapse
// frame without special-casing.
export async function fetchParameterTimeSeries(parameterKey) {
  const query = `select mean(${parameterKey}) as ${parameterKey} from box where ${LOCATION_FILTER} and time > now() - ${TIME_LAPSE_HOURS}h group by node_id, time(${TIME_LAPSE_BUCKET_MINUTES}m) fill(none)`;
  const url = `${INFLUX_QUERY_URL}?db=${INFLUX_DB}&u=${INFLUX_USER}&p=${INFLUX_PASSWORD}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load time series (${res.status})`);
  const data = await res.json();
  const series = data?.results?.[0]?.series ?? [];

  const timestamps = Array.from(new Set(series.flatMap((s) => s.values.map((row) => row[0])))).sort();
  const frameIndexByTimestamp = new Map(timestamps.map((t, i) => [t, i]));
  const frames = timestamps.map((timestamp) => ({ timestamp, readings: new Map() }));

  for (const s of series) {
    const nodeId = s.tags?.node_id;
    if (!nodeId) continue;
    const valueIdx = s.columns.indexOf(parameterKey);
    for (const row of s.values) {
      const value = row[valueIdx];
      if (value === null || value === undefined) continue;
      frames[frameIndexByTimestamp.get(row[0])].readings.set(nodeId, { [parameterKey]: value });
    }
  }

  return frames;
}

// Single-node history for the chart modal — one node, so all fields at once
// is cheap (unlike the time-lapse case, which is one field across all nodes).
export async function fetchNodeHistory(nodeId, hours) {
  const query = `select time, ${FIELD_KEYS.join(', ')} from box where node_id='${nodeId}' and time > now() - ${hours}h order by time asc`;
  const url = `${INFLUX_QUERY_URL}?db=${INFLUX_DB}&u=${INFLUX_USER}&p=${INFLUX_PASSWORD}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load node history (${res.status})`);
  const data = await res.json();
  const series = data?.results?.[0]?.series ?? [];
  if (series.length === 0) return [];
  const { columns, values } = series[0];
  return values.map((row) => {
    const point = {};
    columns.forEach((col, i) => {
      point[col] = row[i];
    });
    return point;
  });
}

// Network-wide daily mean for one parameter — feeds the calendar heatmap.
// Aggregated server-side (GROUP BY time(1d), no node grouping) so a full
// year is cheap: ~25KB/2.6s verified live, versus ~270KB for just 24h of
// one parameter in fetchParameterTimeSeries (that one groups by node too).
export async function fetchDailyNetworkAverage(parameterKey, days = 365) {
  const query = `select mean(${parameterKey}) as ${parameterKey} from box where ${LOCATION_FILTER} and time > now() - ${days}d group by time(1d) fill(none)`;
  const url = `${INFLUX_QUERY_URL}?db=${INFLUX_DB}&u=${INFLUX_USER}&p=${INFLUX_PASSWORD}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load daily averages (${res.status})`);
  const data = await res.json();
  const series = data?.results?.[0]?.series ?? [];
  if (series.length === 0) return [];
  const { columns, values } = series[0];
  const valueIdx = columns.indexOf(parameterKey);
  return values.filter((row) => row[valueIdx] !== null).map((row) => ({ date: row[0].slice(0, 10), value: row[valueIdx] }));
}

// meterac-ui's own nodes.js parses this same "cams :" line from nodes.txt at
// build time to set each node's camera flag — nodes.csv doesn't carry it.
export async function fetchCameraNodeIds() {
  const res = await fetch(NODES_TXT_URL);
  if (!res.ok) throw new Error(`Failed to load camera list (${res.status})`);
  const text = await res.text();
  const camsLine = text.split('\n').find((line) => line.startsWith('cams'));
  if (!camsLine) return [];
  return camsLine
    .replace(/^cams\s*:\s*/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
