import { useEffect, useMemo, useRef, useState } from 'react';
import StationMap from './components/StationMap.jsx';
import LayerControls from './components/LayerControls.jsx';
import {
  fetchStations,
  fetchLatestReadings,
  fetchDayAverageReadings,
  fetchParameterTimeSeries,
  READING_FIELDS,
} from './api/meterApi.js';
import { DERIVED_LAYERS } from './api/derivedLayers.js';
import { createColorScale } from './color/colorScale.js';
import { buildValueGrid } from './interpolation/idw.js';
import { buildAltitudeCorrectedGrid } from './interpolation/altitudeCorrection.js';

function formatFrameTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const [stations, setStations] = useState(null);
  const [currentReadings, setCurrentReadings] = useState(new Map());
  const [dayAverageReadings, setDayAverageReadings] = useState(new Map());
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showContours, setShowContours] = useState(false);
  const [dataMode, setDataMode] = useState('current'); // 'current' | 'day-average' | 'time-lapse'

  const [timeLapseFrames, setTimeLapseFrames] = useState([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTimeLapse, setIsLoadingTimeLapse] = useState(false);
  const [timeLapseError, setTimeLapseError] = useState(null);
  const frameGridCache = useRef(new Map());

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
  const isTimeLapse = dataMode === 'time-lapse';

  // Time-lapse only covers the 8 raw backend fields (no derived layers, no
  // "station status") — fetch (or re-fetch on parameter change) whenever
  // that mode is active.
  useEffect(() => {
    if (!isTimeLapse) return;
    const param = DERIVED_LAYERS[selectedParameter] ? 't_raw' : (selectedParameter ?? 't_raw');
    if (param !== selectedParameter) {
      setSelectedParameter(param);
      return;
    }
    setIsPlaying(false);
    setIsLoadingTimeLapse(true);
    setTimeLapseError(null);
    fetchParameterTimeSeries(param)
      .then((frames) => {
        frameGridCache.current = new Map();
        setTimeLapseFrames(frames);
        setFrameIndex(0);
      })
      .catch((err) => setTimeLapseError(err.message))
      .finally(() => setIsLoadingTimeLapse(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeLapse, selectedParameter]);

  useEffect(() => {
    if (!isPlaying || timeLapseFrames.length === 0) return;
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % timeLapseFrames.length);
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying, timeLapseFrames.length]);

  const currentFrame = isTimeLapse ? timeLapseFrames[frameIndex] : null;
  const readings = isTimeLapse ? (currentFrame?.readings ?? new Map()) : isDayAverage ? dayAverageReadings : currentReadings;

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

  // Fixed across the whole animation (pooled from every frame) so colors
  // don't rescale frame-to-frame during playback.
  const colorScale = useMemo(() => {
    if (!selectedParameter) return null;
    if (isTimeLapse) {
      const allValues = [];
      for (const frame of timeLapseFrames) {
        frame.readings.forEach((r) => {
          const v = r[selectedParameter];
          if (typeof v === 'number' && Number.isFinite(v)) allValues.push(v);
        });
      }
      return createColorScale(allValues);
    }
    return createColorScale(stationPoints.map((p) => p.value));
  }, [selectedParameter, stationPoints, isTimeLapse, timeLapseFrames]);

  const altitudeCorrected = useMemo(() => {
    if (!derivedLayer || stationPoints.length === 0) return null;
    return buildAltitudeCorrectedGrid(stationPoints);
  }, [derivedLayer, stationPoints]);

  const valueGrid = useMemo(() => {
    if (derivedLayer) return altitudeCorrected?.grid ?? null;
    if (stationPoints.length === 0) return null;
    if (isTimeLapse) {
      if (frameGridCache.current.has(frameIndex)) return frameGridCache.current.get(frameIndex);
      const grid = buildValueGrid(stationPoints);
      frameGridCache.current.set(frameIndex, grid);
      return grid;
    }
    return buildValueGrid(stationPoints);
  }, [derivedLayer, altitudeCorrected, stationPoints, isTimeLapse, frameIndex]);

  const onlineCount = stations ? stations.filter((s) => readings.has(s.id)).length : 0;

  let subtitle = 'Loading stations…';
  if (stations) {
    if (isTimeLapse) {
      if (isLoadingTimeLapse) subtitle = 'Loading 24h history…';
      else if (timeLapseError) subtitle = `Couldn't load history: ${timeLapseError}`;
      else if (currentFrame) {
        subtitle = `${activeField?.label ?? ''} · ${formatFrameTime(currentFrame.timestamp)} (${frameIndex + 1}/${timeLapseFrames.length})`;
      } else {
        subtitle = 'No history available';
      }
    } else {
      subtitle = `${onlineCount} of ${stations.length} stations ${isDayAverage ? 'reported in the last 24h' : 'reporting'}`;
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>METER.AC</h1>
        <span className="app__subtitle">{subtitle}</span>
      </header>
      {error && <div className="app__error">Failed to load data: {error}</div>}
      {stations && (
        <div className="app__map-wrap">
          <StationMap
            stations={stations}
            readings={readings}
            isDayAverage={isDayAverage}
            isTimeLapse={isTimeLapse}
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
            timeLapseFrames={timeLapseFrames}
            frameIndex={frameIndex}
            onFrameIndexChange={(i) => {
              setIsPlaying(false);
              setFrameIndex(i);
            }}
            isPlaying={isPlaying}
            onTogglePlaying={setIsPlaying}
            isLoadingTimeLapse={isLoadingTimeLapse}
            timeLapseError={timeLapseError}
          />
        </div>
      )}
    </div>
  );
}
