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
export async function fetchParameterTimeSeries(parameterKey, startTime = null) {
  // When startTime is provided, shift the 24h window to [startTime, startTime+24h)
  // so the timelapse plays back historical data instead of the live last-24h.
  // InfluxQL accepts RFC3339 datetime literals like '2024-01-15T10:00:00.000Z'.
  //
  // InfluxDB's GROUP BY time(30m) buckets are aligned to fixed epoch boundaries
  // (:00 and :30 minutes past each hour), not to the user's chosen start time.
  // Selecting 14:46 under the old approach would yield a first frame timestamped
  // 14:30 containing only 14:46–15:00 of data — up to 29 minutes of mismatch.
  // Rounding the start down to the nearest 30-minute boundary ensures every
  // frame represents a full bucket and its timestamp matches the data window.
  let timeClause;
  if (startTime) {
    const start = new Date(startTime);
    start.setMinutes(start.getMinutes() - (start.getMinutes() % TIME_LAPSE_BUCKET_MINUTES), 0, 0);
    const end = new Date(start.getTime() + TIME_LAPSE_HOURS * 3600 * 1000);
    timeClause = `time >= '${start.toISOString()}' and time < '${end.toISOString()}'`;
  } else {
    timeClause = `time > now() - ${TIME_LAPSE_HOURS}h`;
  }
  const query = `select mean(${parameterKey}) as ${parameterKey} from box where ${LOCATION_FILTER} and ${timeClause} group by node_id, time(${TIME_LAPSE_BUCKET_MINUTES}m) fill(none)`;
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

function nodeFilterClause(nodeIds) {
  if (!nodeIds || nodeIds.length === 0) return '';
  if (nodeIds.length === 1) return ` and node_id = '${nodeIds[0]}'`;
  return ` and node_id =~ /^(${nodeIds.join('|')})$/`;
}

// Average daily low/high for one parameter, feeds the calendar heatmap.
// Needs a subquery: inner computes each station's own daily min/max, outer
// averages those across stations for that day. Verified live: cost scales
// with node-count x days, NOT payload size (which stays tiny either way) —
// whole-network+365d is ~4.8s/23KB, but whole-network+1000d balloons to
// ~36.6s despite only ~62KB, while a SINGLE station handles 1000d in ~7s.
// Callers must keep wide scope (no nodeIds) paired with shorter periods.
export async function fetchDailyMinMax(parameterKey, { days = 365, nodeIds = null } = {}) {
  const filter = `${LOCATION_FILTER}${nodeFilterClause(nodeIds)}`;
  const query = `select mean(${parameterKey}_min) as min, mean(${parameterKey}_max) as max from (select min(${parameterKey}) as ${parameterKey}_min, max(${parameterKey}) as ${parameterKey}_max from box where ${filter} and time > now() - ${days}d group by time(1d), node_id) where time > now() - ${days}d group by time(1d) fill(none)`;
  const url = `${INFLUX_QUERY_URL}?db=${INFLUX_DB}&u=${INFLUX_USER}&p=${INFLUX_PASSWORD}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load daily min/max (${res.status})`);
  const data = await res.json();
  const series = data?.results?.[0]?.series ?? [];
  if (series.length === 0) return [];
  const { columns, values } = series[0];
  const minIdx = columns.indexOf('min');
  const maxIdx = columns.indexOf('max');
  return values
    .filter((row) => row[minIdx] !== null && row[maxIdx] !== null)
    .map((row) => ({ date: row[0].slice(0, 10), min: row[minIdx], max: row[maxIdx] }));
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

// A camera having a "cams" flag doesn't mean it's currently working — some
// snapshot files are years stale but still serve a 200 (last frame the
// camera ever produced). The static file server sends Last-Modified on
// snap.jpg with open CORS, so a plain HEAD request per camera is enough to
// tell a live feed from an abandoned one, no InfluxDB involved. Verified
// live: freshness is sharply bimodal (cameras are either updated within the
// last hour, or stale by weeks-to-years) — no meaningful middle ground.
export const CAMERA_STALE_HOURS = 24;

export async function fetchCameraLastSeen(cameraIds) {
  const entries = await Promise.all(
    Array.from(cameraIds).map(async (id) => {
      try {
        const res = await fetch(`https://meter.ac/gs/nodes/${id}/snap.jpg`, { method: 'HEAD' });
        const lastModified = res.ok ? res.headers.get('Last-Modified') : null;
        return [id, lastModified ? new Date(lastModified) : null];
      } catch {
        return [id, null];
      }
    }),
  );
  return new Map(entries);
}

export function isCameraOnline(lastSeen) {
  return lastSeen instanceof Date && Date.now() - lastSeen.getTime() < CAMERA_STALE_HOURS * 60 * 60 * 1000;
}
