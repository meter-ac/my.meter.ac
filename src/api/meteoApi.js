import { parseCsv } from '../utils/csv.js';

const METEO_TXT_URL = 'https://meter.ac/gs/meteo/meteo.txt';
const METEO_DATA_FIELDS = ['t_raw', 't_dew', 'p', 'rh', 'wind_dir', 'wind_speed', 'rainfall', 'solar', 'gamma'];

export const METEO_FIELDS = [
  { key: 't_raw', label: 'Temperature', unit: '°C' },
  { key: 't_dew', label: 'Dew point', unit: '°C' },
  { key: 'p', label: 'Pressure', unit: 'hPa' },
  { key: 'rh', label: 'Humidity', unit: '%' },
  { key: 'wind_dir', label: 'Wind dir.', unit: '°' },
  { key: 'wind_speed', label: 'Wind speed', unit: 'm/s' },
  { key: 'rainfall', label: 'Rainfall', unit: 'mm' },
  { key: 'solar', label: 'Solar', unit: 'W/m²' },
  { key: 'gamma', label: 'Radiation', unit: 'CPM' },
];

export async function fetchMeteoStations() {
  const res = await fetch(METEO_TXT_URL);
  if (!res.ok) throw new Error(`Failed to load meteo station list (${res.status})`);
  const rows = parseCsv(await res.text());
  return rows
    .map((row) => ({
      id: row.MeteoID,
      name: row.Location,
      altitude: Number(row.Altitude),
      lat: Number(row.Latitude),
      lon: Number(row.Longitude),
    }))
    .filter((s) => s.id && Number.isFinite(s.lat) && Number.isFinite(s.lon));
}

function parseDataCurrentLine(text) {
  const cells = text.trim().split(',');
  const row = {};
  METEO_DATA_FIELDS.forEach((key, i) => {
    const value = Number(cells[i]);
    row[key] = cells[i] === '-' || !Number.isFinite(value) ? null : value;
  });
  const unix = Number(cells[METEO_DATA_FIELDS.length]);
  row.ts = Number.isFinite(unix) ? unix : null;
  return row;
}

// No bulk query exists for meteo stations — they're not in InfluxDB at all.
// Each station's current reading is its own small text file, so this fetches
// all of them in parallel (~39 stations, ~0.25s each sequentially - too slow
// one at a time, fine in parallel).
export async function fetchMeteoReadings(stationIds) {
  const entries = await Promise.all(
    stationIds.map(async (id) => {
      try {
        const res = await fetch(`https://meter.ac/gs/meteo/${id}/data.current`);
        if (!res.ok) return null;
        return [id, parseDataCurrentLine(await res.text())];
      } catch {
        return null;
      }
    }),
  );
  const byId = new Map();
  for (const entry of entries) {
    if (entry) byId.set(entry[0], entry[1]);
  }
  return byId;
}
