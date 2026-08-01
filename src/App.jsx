import { useEffect, useMemo, useState } from 'react';
import StationMap from './components/StationMap.jsx';
import LayerControls from './components/LayerControls.jsx';
import { fetchStations, fetchLatestReadings, READING_FIELDS } from './api/meterApi.js';
import { createColorScale } from './color/colorScale.js';
import { buildValueGrid } from './interpolation/idw.js';

export default function App() {
  const [stations, setStations] = useState(null);
  const [readings, setReadings] = useState(new Map());
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showContours, setShowContours] = useState(false);

  useEffect(() => {
    Promise.all([fetchStations(), fetchLatestReadings()])
      .then(([stationList, readingsMap]) => {
        setStations(stationList);
        setReadings(readingsMap);
      })
      .catch((err) => setError(err.message));
  }, []);

  const stationPoints = useMemo(() => {
    if (!selectedParameter || !stations) return [];
    const points = [];
    for (const station of stations) {
      const reading = readings.get(station.id);
      const value = reading ? reading[selectedParameter] : undefined;
      if (typeof value === 'number' && Number.isFinite(value)) {
        points.push({ lat: station.lat, lon: station.lon, value });
      }
    }
    return points;
  }, [stations, readings, selectedParameter]);

  const colorScale = useMemo(() => {
    if (!selectedParameter) return null;
    return createColorScale(stationPoints.map((p) => p.value));
  }, [selectedParameter, stationPoints]);

  const valueGrid = useMemo(() => {
    if (stationPoints.length === 0) return null;
    return buildValueGrid(stationPoints);
  }, [stationPoints]);

  const activeField = READING_FIELDS.find((f) => f.key === selectedParameter);
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
            valueGrid={valueGrid}
            showHeatmap={showHeatmap}
            showContours={showContours}
            contourStep={activeField?.contourStep}
            contourUnit={activeField?.unit}
          />
          <LayerControls
            selectedParameter={selectedParameter}
            onSelectParameter={setSelectedParameter}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
            showContours={showContours}
            onToggleContours={setShowContours}
            scale={colorScale}
          />
        </div>
      )}
    </div>
  );
}
