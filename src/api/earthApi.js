import { parseCsv } from '../utils/csv.js';

const EARTH_TXT_URL = 'https://meter.ac/gs/earth/earth.txt';
const INFLUX_QUERY_URL = 'https://meter.uni-plovdiv.net/query';
const INFLUX_DB = 'meter';
const INFLUX_USER = 'client';
const INFLUX_PASSWORD = 'pvY6wQNcT8cqDEfZ';

export const EARTH_FIELDS = [
  { key: 'rn_value_bqm3', label: 'Radon', unit: 'Bq/m³' },
  { key: 't_raw', label: 'Temperature', unit: '°C' },
  { key: 'p_raw', label: 'Pressure', unit: 'hPa' },
  { key: 'rh', label: 'Humidity', unit: '%' },
  { key: 'sbm20_cpm', label: 'Radiation', unit: 'CPM' },
];

export async function fetchEarthStations() {
  const res = await fetch(EARTH_TXT_URL);
  if (!res.ok) throw new Error(`Failed to load earth station list (${res.status})`);
  const rows = parseCsv(await res.text());
  return rows
    .map((row) => ({
      id: row.EarthStationID,
      name: row.Location,
      altitude: Number(row.Altitude),
      lat: Number(row.Latitude),
      lon: Number(row.Longitude),
    }))
    .filter((s) => s.id && Number.isFinite(s.lat) && Number.isFinite(s.lon));
}

// earth.txt's station IDs (E01) don't match InfluxDB's rn_id tag (Rn01) —
// same numeric suffix, different prefix — so the returned map is re-keyed to
// the E-prefixed scheme to line up with fetchEarthStations()'s ids. A few
// rn_id values (e.g. "M93") don't fit the pattern and are dropped — no
// matching earth.txt station to join them to anyway.
export async function fetchEarthReadings() {
  const query = `select last(ts) as ts, last(rn_value_bqm3) as rn_value_bqm3, last(t_raw) as t_raw, last(p_raw) as p_raw, last(rh) as rh, last(sbm20_cpm) as sbm20_cpm from radon where time > now() - 2h group by rn_id`;
  const url = `${INFLUX_QUERY_URL}?db=${INFLUX_DB}&u=${INFLUX_USER}&p=${INFLUX_PASSWORD}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load earth readings (${res.status})`);
  const data = await res.json();
  const series = data?.results?.[0]?.series ?? [];
  const byEarthId = new Map();
  for (const s of series) {
    const rnId = s.tags?.rn_id;
    if (!rnId || !/^Rn\d+$/i.test(rnId)) continue;
    const row = {};
    s.columns.forEach((col, i) => {
      row[col] = s.values[0][i];
    });
    byEarthId.set(rnId.replace(/^Rn/i, 'E'), row);
  }
  return byEarthId;
}
