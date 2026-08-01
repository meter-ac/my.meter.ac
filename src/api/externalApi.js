const NIGGG_URL = 'https://meter.ac/gs/niggg/earthquakes.txt';
const EEA_URL = 'https://meter.ac/gs/eea/gamma-radiation.txt';

// No header, chronological ascending: id,lat,lon,depth,magnitude,datetime,location.
export async function fetchRecentEarthquakes(limit = 50) {
  const res = await fetch(NIGGG_URL);
  if (!res.ok) throw new Error(`Failed to load earthquake data (${res.status})`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines
    .slice(-limit)
    .reverse()
    .map((line) => {
      const [id, lat, lon, depth, magnitude, time, location] = line.split(',');
      return { id, lat: Number(lat), lon: Number(lon), depth: Number(depth), magnitude: Number(magnitude), time, location };
    });
}

// Daily reference data (Date,<26 location columns>), not a live feed — the
// file's own latest row was already over a year old when checked, so callers
// must show the returned date rather than implying this is current.
export async function fetchLatestEeaRadiation() {
  const res = await fetch(EEA_URL);
  if (!res.ok) throw new Error(`Failed to load EEA radiation data (${res.status})`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(',');
  const lastRow = lines[lines.length - 1].split(',');
  const readings = header
    .slice(1)
    .map((location, i) => ({ location, value: Number(lastRow[i + 1]) }))
    .filter((r) => Number.isFinite(r.value));
  return { date: lastRow[0], readings };
}
