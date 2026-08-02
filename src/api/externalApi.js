const NIGGG_URL = 'https://meter.ac/gs/niggg/earthquakes.txt';
const EEA_URL = 'https://meter.ac/gs/eea/gamma-radiation.txt';

// Some rows quote a field that contains a comma, e.g.
// `4222073,36.86,23.7,85,5.0,2020-08-17 07:26:35,"CRETE, GREECE"` — a plain
// split(',') mangles those (wrong location, fields shifted). Doesn't handle
// escaped quotes within a field since this file never uses them.
function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function quantile(sortedValues, p) {
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * (idx - lo);
}

function boxStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
    count: sorted.length,
  };
}

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
      const [id, lat, lon, depth, magnitude, time, location] = splitCsvLine(line);
      return { id, lat: Number(lat), lon: Number(lon), depth: Number(depth), magnitude: Number(magnitude), time, location };
    });
}

// Box-and-whisker per region (45 distinct location values — country/sea
// names, not one-off unique places, matching meterac-ui's own summary page
// shape) for a chosen recent window. This is a static file with full history
// (not a live query), so the whole thing is fetched once and filtered/
// grouped client-side rather than queried per-period.
export async function fetchEarthquakeLocationStats(days, statKey = 'magnitude') {
  const res = await fetch(NIGGG_URL);
  if (!res.ok) throw new Error(`Failed to load earthquake data (${res.status})`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // The source file spells some region names inconsistently over the years
  // (e.g. "Aegean Sea" vs "AEGEAN SEA") — group by a case-insensitive key so
  // those don't split into separate near-duplicate boxes, but keep whichever
  // exact spelling occurs most often within a group as the display label.
  const byLocation = new Map();
  for (const line of lines) {
    const [, , , depth, magnitude, time, location] = splitCsvLine(line);
    const t = new Date(`${time.replace(' ', 'T')}Z`).getTime();
    if (!Number.isFinite(t) || t < cutoff) continue;
    const value = Number(statKey === 'depth' ? depth : magnitude);
    if (!Number.isFinite(value)) continue;
    if (!location || !location.trim()) continue;
    const key = location.trim().toUpperCase();
    if (!byLocation.has(key)) byLocation.set(key, { values: [], labelCounts: new Map() });
    const group = byLocation.get(key);
    group.values.push(value);
    group.labelCounts.set(location, (group.labelCounts.get(location) ?? 0) + 1);
  }

  return Array.from(byLocation.values(), ({ values, labelCounts }) => {
    const label = Array.from(labelCounts, ([text, count]) => [text, count]).sort((a, b) => b[1] - a[1])[0][0];
    return { label, ...boxStats(values) };
  }).sort((a, b) => a.label.localeCompare(b.label));
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

// Full history for all 26 locations in one fetch — callers slice out
// whichever location's column they need without re-fetching per selection
// (the file is small, ~12 years of daily data, no reason to fetch it once
// per location change). The source file has ~90 duplicate date rows (a data
// quality issue upstream, not something we caused) — deduped here (last
// occurrence wins) since a calendar grid keyed by date can't render two
// cells for the same day.
export async function fetchEeaHistory() {
  const res = await fetch(EEA_URL);
  if (!res.ok) throw new Error(`Failed to load EEA radiation data (${res.status})`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const locations = lines[0].split(',').slice(1);
  const byDate = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    byDate.set(cells[0], cells);
  }
  const rows = Array.from(byDate.values()).sort((a, b) => a[0].localeCompare(b[0]));
  return { locations, rows };
}
