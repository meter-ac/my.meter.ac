import { useEffect, useState } from 'react';
import StationMap from './components/StationMap.jsx';
import { fetchStations, fetchLatestReadings } from './api/meterApi.js';

export default function App() {
  const [stations, setStations] = useState(null);
  const [readings, setReadings] = useState(new Map());
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchStations(), fetchLatestReadings()])
      .then(([stationList, readingsMap]) => {
        setStations(stationList);
        setReadings(readingsMap);
      })
      .catch((err) => setError(err.message));
  }, []);

  const onlineCount = stations ? stations.filter((s) => readings.has(s.id)).length : 0;

  return (
    <div className="app">
      <header className="app__header">
        <h1>METER.AC</h1>
        <span className="app__subtitle">
          {stations ? `${onlineCount} of ${stations.length} stations reporting` : 'Loading stations…'}
        </span>
      </header>
      {error && <div className="app__error">Failed to load data: {error}</div>}
      {stations && <StationMap stations={stations} readings={readings} />}
    </div>
  );
}
