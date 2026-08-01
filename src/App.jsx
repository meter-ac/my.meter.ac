import { useEffect, useMemo, useState } from 'react';
import StationMap from './components/StationMap.jsx';
import LayerControls from './components/LayerControls.jsx';
import { fetchStations, fetchLatestReadings, fetchDayAverageReadings, READING_FIELDS } from './api/meterApi.js';
import { DERIVED_LAYERS } from './api/derivedLayers.js';
import { createColorScale } from './color/colorScale.js';
import { buildValueGrid } from './interpolation/idw.js';
import { buildAltitudeCorrectedGrid } from './interpolation/altitudeCorrection.js';

export default function App() {
  const [stations, setStations] = useState(null);
  const [currentReadings, setCurrentReadings] = useState(new Map());
  const [dayAverageReadings, setDayAverageReadings] = useState(new Map());
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showContours, setShowContours] = useState(false);
  const [dataMode, setDataMode] = useState('current'); // 'current' | 'day-average'

  useEffect(() => {
    Promise.all([fetchStations(), fetchLatestReadings(), fetchDayAverageReadings()])
      .then(([stationList, latest, dayAverage]) => {
        setStations(stationList);
        setCurrentReadings(latest);
        setDayAverageReadings(dayAverage);
      })
      .catch((err) => setError(err.message));
  }, []);

  const isDayAverage = dataMode === 'day-average';
  const readings = isDayAverage ? dayAverageReadings : currentReadings;

  const derivedLayer = DERIVED_LAYERS[selectedParameter];
  const activeField = READING_FIELDS.find((f) => f.key === selectedParameter) ?? derivedLayer;
  // Markers always show the real backend reading, even for a derived layer —
  // only the interpolated surface/contours reflect the correction.
  const sourceField = derivedLayer?.sourceField ?? selectedParameter;

  const stationPoints = useMemo(() => {
    if (!selectedParameter || !stations) return [];
    const points = [];
    for (const station of stations) {
      const reading = readings.get(station.id);
      const value = reading ? reading[sourceField] : undefined;
      if (typeof value === 'number' && Number.isFinite(value)) {
        points.push({ lat: station.lat, lon: station.lon, altitude: station.altitude, value });
      }
    }
    return points;
  }, [stations, readings, sourceField, selectedParameter]);

  const colorScale = useMemo(() => {
    if (!selectedParameter) return null;
    return createColorScale(stationPoints.map((p) => p.value));
  }, [selectedParameter, stationPoints]);

  const altitudeCorrected = useMemo(() => {
    if (!derivedLayer || stationPoints.length === 0) return null;
    return buildAltitudeCorrectedGrid(stationPoints);
  }, [derivedLayer, stationPoints]);

  const valueGrid = useMemo(() => {
    if (derivedLayer) return altitudeCorrected?.grid ?? null;
    if (stationPoints.length === 0) return null;
    return buildValueGrid(stationPoints);
  }, [derivedLayer, altitudeCorrected, stationPoints]);

  const onlineCount = stations ? stations.filter((s) => readings.has(s.id)).length : 0;

  return (
    <div className="app">
      <header className="app__header">
        <h1>METER.AC</h1>
        <span className="app__subtitle">
          {stations
            ? `${onlineCount} of ${stations.length} stations ${isDayAverage ? 'reported in the last 24h' : 'reporting'}`
            : 'Loading stations…'}
        </span>
      </header>
      {error && <div className="app__error">Failed to load data: {error}</div>}
      {stations && (
        <div className="app__map-wrap">
          <StationMap
            stations={stations}
            readings={readings}
            isDayAverage={isDayAverage}
            selectedParameter={selectedParameter}
            markerValueKey={sourceField}
            colorScale={colorScale}
            valueGrid={valueGrid}
            showHeatmap={showHeatmap}
            showContours={showContours}
            contourStep={activeField?.contourStep}
            contourUnit={activeField?.unit}
          />
          <LayerControls
            dataMode={dataMode}
            onSelectDataMode={setDataMode}
            selectedParameter={selectedParameter}
            onSelectParameter={setSelectedParameter}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
            showContours={showContours}
            onToggleContours={setShowContours}
            scale={colorScale}
            lapseRate={altitudeCorrected?.trend}
          />
        </div>
      )}
    </div>
  );
}
