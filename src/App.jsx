import { useEffect, useMemo, useRef, useState } from 'react';
import StationMap from './components/StationMap.jsx';
import LayerControls from './components/LayerControls.jsx';
import TableView from './components/TableView.jsx';
import CameraGallery from './components/CameraGallery.jsx';
import NodeDetailPage from './components/NodeDetailPage.jsx';
import {
  fetchStations,
  fetchLatestReadings,
  fetchDayAverageReadings,
  fetchParameterTimeSeries,
  fetchCameraNodeIds,
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

const TAB_VIEWS = ['map', 'table', 'cameras'];

// No router dependency — just enough history/URL syncing to give each node
// its own shareable/bookmarkable link (?node=ID) and make browser back/
// forward work, since the app only has this one real "page" concept.
function readLocation() {
  const params = new URLSearchParams(window.location.search);
  const nodeId = params.get('node');
  if (nodeId) return { view: 'node', nodeId };
  const v = params.get('view');
  return { view: TAB_VIEWS.includes(v) ? v : 'map', nodeId: null };
}

export default function App() {
  const [stations, setStations] = useState(null);
  const [currentReadings, setCurrentReadings] = useState(new Map());
  const [dayAverageReadings, setDayAverageReadings] = useState(new Map());
  const [cameraIds, setCameraIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showContours, setShowContours] = useState(false);
  const [dataMode, setDataMode] = useState('current'); // 'current' | 'day-average' | 'time-lapse'
  const [view, setView] = useState('map'); // 'map' | 'table' | 'cameras' | 'node'
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [timeLapseFrames, setTimeLapseFrames] = useState([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTimeLapse, setIsLoadingTimeLapse] = useState(false);
  const [timeLapseError, setTimeLapseError] = useState(null);
  const frameGridCache = useRef(new Map());

  useEffect(() => {
    Promise.all([fetchStations(), fetchLatestReadings(), fetchDayAverageReadings(), fetchCameraNodeIds()])
      .then(([stationList, latest, dayAverage, cameraList]) => {
        setStations(stationList);
        setCurrentReadings(latest);
        setDayAverageReadings(dayAverage);
        setCameraIds(new Set(cameraList));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    function sync() {
      const { view: v, nodeId } = readLocation();
      setView(v);
      setSelectedNodeId(nodeId);
    }
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  function navigateToNode(nodeId) {
    setView('node');
    setSelectedNodeId(nodeId);
    window.history.pushState({ node: nodeId }, '', `?node=${nodeId}`);
  }

  function navigateToView(nextView) {
    setView(nextView);
    setSelectedNodeId(null);
    window.history.pushState({ view: nextView }, '', nextView === 'map' ? window.location.pathname : `?view=${nextView}`);
  }

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
        <nav className="app__tabs">
          {[
            ['map', 'Map'],
            ['table', 'Table'],
            ['cameras', 'Cameras'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={view === key ? 'is-active' : ''}
              onClick={() => navigateToView(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        {view === 'map' && <span className="app__subtitle">{subtitle}</span>}
      </header>
      {error && <div className="app__error">Failed to load data: {error}</div>}
      {stations && view === 'map' && (
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
            onOpenNode={navigateToNode}
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
      {stations && view === 'table' && (
        <TableView stations={stations} readings={currentReadings} cameraIds={cameraIds} onOpenNode={navigateToNode} />
      )}
      {stations && view === 'cameras' && (
        <CameraGallery stations={stations} cameraIds={cameraIds} onOpenNode={navigateToNode} />
      )}
      {stations && view === 'node' && selectedNodeId && (
        <NodeDetailPage
          nodeId={selectedNodeId}
          stations={stations}
          currentReadings={currentReadings}
          cameraIds={cameraIds}
          onBack={() => navigateToView('map')}
        />
      )}
    </div>
  );
}
