const NODES_CSV_URL = 'https://meter.ac/gs/metadata/nodes.csv';
const INFLUX_QUERY_URL = 'https://meter.uni-plovdiv.net/query';
const INFLUX_DB = 'meter';
const INFLUX_USER = 'client';
const INFLUX_PASSWORD = 'pvY6wQNcT8cqDEfZ';

const READINGS_QUERY = `select last(ts) as ts, last(t_raw) as t_raw, last(t_dew) as t_dew, last(p_sea) as p_sea, last(rh) as rh, last(pm25) as pm25, last(pm10) as pm10, last(gamma_cpm) as gamma_cpm from box where location != 'unknown' and location !~ /^test_/ and time > now() - 2h group by node_id`;

export const READING_FIELDS = [
  { key: 't_raw', label: 'Temperature', unit: '°C' },
  { key: 't_dew', label: 'Dew point', unit: '°C' },
  { key: 'p_sea', label: 'Pressure', unit: 'hPa' },
  { key: 'rh', label: 'Humidity', unit: '%' },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³' },
  { key: 'gamma_cpm', label: 'Radiation', unit: 'CPM' },
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

export async function fetchLatestReadings() {
  const url = `${INFLUX_QUERY_URL}?db=${INFLUX_DB}&u=${INFLUX_USER}&p=${INFLUX_PASSWORD}&q=${encodeURIComponent(READINGS_QUERY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load live readings (${res.status})`);
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
