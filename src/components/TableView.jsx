import { useEffect, useRef, useState } from 'react';
import StationTable from './StationTable.jsx';
import EarthquakeTable from './EarthquakeTable.jsx';
import RadiationTable from './RadiationTable.jsx';
import { READING_FIELDS } from '../api/meterApi.js';
import { METEO_FIELDS, fetchMeteoStations, fetchMeteoReadings } from '../api/meteoApi.js';
import { EARTH_FIELDS, fetchEarthStations, fetchEarthReadings } from '../api/earthApi.js';
import { fetchRecentEarthquakes, fetchLatestEeaRadiation } from '../api/externalApi.js';

const CATEGORIES = [
  ['nodes', 'Nodes'],
  ['meteo', 'Meteo'],
  ['earth', 'Earth'],
  ['earthquakes', 'Earthquakes'],
  ['radiation', 'Radiation'],
];

async function loadCategory(category) {
  if (category === 'meteo') {
    const stations = await fetchMeteoStations();
    const readings = await fetchMeteoReadings(stations.map((s) => s.id));
    return { stations, readings };
  }
  if (category === 'earth') {
    const [stations, readings] = await Promise.all([fetchEarthStations(), fetchEarthReadings()]);
    return { stations, readings };
  }
  if (category === 'earthquakes') return fetchRecentEarthquakes(50);
  if (category === 'radiation') return fetchLatestEeaRadiation();
  return null;
}

export default function TableView({ stations, readings, cameraIds, onOpenNode }) {
  const [category, setCategory] = useState('nodes');
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Fetch each category at most once (per app session) — switching tabs
  // back and forth just reuses what's already in `cache`.
  const loadedRef = useRef(new Set(['nodes']));

  useEffect(() => {
    if (loadedRef.current.has(category)) return;
    loadedRef.current.add(category);
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadCategory(category)
      .then((result) => {
        if (!cancelled) setCache((prev) => ({ ...prev, [category]: result }));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          loadedRef.current.delete(category); // allow retry on next visit
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <div className="table-view-container">
      <div className="layer-controls__segmented table-view__categories">
        {CATEGORIES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={category === key ? 'is-active' : ''}
            onClick={() => setCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {category === 'nodes' && (
        <StationTable
          stations={stations}
          readings={readings}
          fields={READING_FIELDS}
          cameraIds={cameraIds}
          onOpenNode={onOpenNode}
        />
      )}

      {category !== 'nodes' && loading && <div className="table-view__status">Loading…</div>}
      {category !== 'nodes' && error && <div className="table-view__status">Couldn't load: {error}</div>}

      {category === 'meteo' && cache.meteo && (
        <StationTable stations={cache.meteo.stations} readings={cache.meteo.readings} fields={METEO_FIELDS} />
      )}
      {category === 'earth' && cache.earth && (
        <StationTable stations={cache.earth.stations} readings={cache.earth.readings} fields={EARTH_FIELDS} />
      )}
      {category === 'earthquakes' && cache.earthquakes && <EarthquakeTable earthquakes={cache.earthquakes} />}
      {category === 'radiation' && cache.radiation && (
        <RadiationTable date={cache.radiation.date} readings={cache.radiation.readings} />
      )}
    </div>
  );
}
