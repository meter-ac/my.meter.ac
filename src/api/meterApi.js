const NODES_CSV_URL = 'https://meter.ac/gs/metadata/nodes.csv';
const INFLUX_QUERY_URL = 'https://meter.uni-plovdiv.net/query';
const INFLUX_DB = 'meter';
const INFLUX_USER = 'client';
const INFLUX_PASSWORD = 'pvY6wQNcT8cqDEfZ';

const FIELD_KEYS = ['t_raw', 't_dew', 'p_raw', 'p_sea', 'rh', 'pm25', 'pm10', 'gamma_cpm'];

const LATEST_QUERY = `select last(ts) as ts, ${FIELD_KEYS.map((k) => `last(${k}) as ${k}`).join(', ')} from box where location != 'unknown' and location !~ /^test_/ and time > now() - 2h group by node_id`;

const DAY_AVERAGE_QUERY = `select ${FIELD_KEYS.map((k) => `mean(${k}) as ${k}`).join(', ')}, count(t_raw) as sample_count from box where location != 'unknown' and location !~ /^test_/ and time > now() - 24h group by node_id`;

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

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((col, i) => {
      row[col] = cells[i];
    });
    return row;
  });
}

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
    .filter((s) => s.id && Number.isFinite(s.lat) && Number.isFinite(s.lon));
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
