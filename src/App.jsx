import { useEffect, useMemo, useState } from 'react';
import StationMap from './components/StationMap.jsx';
import LayerControls from './components/LayerControls.jsx';
import { fetchStations, fetchLatestReadings } from './api/meterApi.js';
import { createColorScale } from './color/colorScale.js';

export default function App() {
  const [stations, setStations] = useState(null);
  const [readings, setReadings] = useState(new Map());
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    Promise.all([fetchStations(), fetchLatestReadings()])
      .then(([stationList, readingsMap]) => {
        setStations(stationList);
        setReadings(readingsMap);
      })
      .catch((err) => setError(err.message));
  }, []);

  const colorScale = useMemo(() => {
    if (!selectedParameter) return null;
    const values = [];
    readings.forEach((reading) => {
      const value = reading[selectedParameter];
      if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
    });
    return createColorScale(values);
  }, [selectedParameter, readings]);

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
      {stations && (
        <div className="app__map-wrap">
          <StationMap
            stations={stations}
            readings={readings}
            selectedParameter={selectedParameter}
            colorScale={colorScale}
            showHeatmap={showHeatmap}
          />
          <LayerControls
            selectedParameter={selectedParameter}
            onSelectParameter={setSelectedParameter}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
            scale={colorScale}
          />
        </div>
      )}
    </div>
  );
}
