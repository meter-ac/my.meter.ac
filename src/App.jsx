import { useEffect, useMemo, useRef, useState } from 'react';
import StationMap from './components/StationMap.jsx';
import LayerControls from './components/LayerControls.jsx';
import TableView from './components/TableView.jsx';
import CameraGallery from './components/CameraGallery.jsx';
import NodeDetailPage from './components/NodeDetailPage.jsx';
import OverviewView from './components/OverviewView.jsx';
import AboutPage from './components/AboutPage.jsx';
import CuratorSettingsModal from './components/CuratorSettingsModal.jsx';
import {
  fetchStations,
  fetchLatestReadings,
  fetchDayAverageReadings,
  fetchParameterTimeSeries,
  fetchCameraNodeIds,
  fetchCameraLastSeen,
  READING_FIELDS,
} from './api/meterApi.js';
import { DERIVED_LAYERS } from './api/derivedLayers.js';
import { createColorScale, createFixedColorScale, filterTukeyOutliers } from './color/colorScale.js';
import { isAqiParameter, createAqiColorScale } from './color/aqiScale.js';
import { fixedRangeFor } from './color/fixedRanges.js';
import { buildValueGrid, buildVoronoiGrid } from './interpolation/idw.js';
import { buildAltitudeCorrectedGrid } from './interpolation/altitudeCorrection.js';
import { getFavoriteStation, setFavoriteStation, clearFavoriteStation } from './utils/favoriteStation.js';
import { getCuratorSettings, setCuratorSettings } from './utils/curatorSettings.js';

function formatFrameTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TAB_VIEWS = ['map', 'table', 'cameras', 'overview', 'about'];

// No router dependency — just enough history/URL syncing to give each node
// its own shareable/bookmarkable link (?node=ID) and make browser back/
// forward work, since the app only has this one real "page" concept.
function readLocation() {
  const params = new URLSearchParams(window.location.search);
  const nodeId = params.get('node');
  if (nodeId) return { view: 'node', nodeId };
  const v = params.get('view');
  if (TAB_VIEWS.includes(v)) return { view: v, nodeId: null };
  // Bare URL (no params) — land on the favorite station if one is set,
  // instead of always defaulting to the map. Applies on fresh load and
  // whenever the user navigates back to "/", not just the first visit.
  const favorite = getFavoriteStation();
  if (favorite) return { view: 'node', nodeId: favorite };
  return { view: 'map', nodeId: null };
}

export default function App() {
  const [stations, setStations] = useState(null);
  const [currentReadings, setCurrentReadings] = useState(new Map());
  const [dayAverageReadings, setDayAverageReadings] = useState(new Map());
  const [cameraIds, setCameraIds] = useState(new Set());
  const [cameraLastSeen, setCameraLastSeen] = useState(new Map());
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showContours, setShowContours] = useState(false);
  const [dataMode, setDataMode] = useState('current'); // 'current' | 'day-average' | 'time-lapse'
  const [view, setView] = useState('map'); // 'map' | 'table' | 'cameras' | 'node'
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [favoriteStationId, setFavoriteStationId] = useState(() => getFavoriteStation());
  const [curatorSettings, setCuratorSettingsState] = useState(() => getCuratorSettings());
  const [showCuratorSettings, setShowCuratorSettings] = useState(false);

  const [timeLapseFrames, setTimeLapseFrames] = useState([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTimeLapse, setIsLoadingTimeLapse] = useState(false);
  const [timeLapseError, setTimeLapseError] = useState(null);
  const frameGridCache = useRef(new Map());

  // Cached per-frame grids were built under whatever outlier-fencing/
  // interpolation-method/start-time setting was active at the time — stale
  // once any of those changes, so drop them rather than show an old setting's grid.
  useEffect(() => {
    frameGridCache.current = new Map();
  }, [curatorSettings.useTukeyFences, curatorSettings.interpolationMethod, curatorSettings.timeLapseStartTime]);

  useEffect(() => {
    Promise.all([fetchStations(), fetchLatestReadings(), fetchDayAverageReadings(), fetchCameraNodeIds()])
      .then(([stationList, latest, dayAverage, cameraList]) => {
        setStations(stationList);
        setCurrentReadings(latest);
        setDayAverageReadings(dayAverage);
        setCameraIds(new Set(cameraList));
        // Separate, non-blocking: each camera's own liveness (HEAD +
        // Last-Modified) shouldn't hold up everything else rendering.
        fetchCameraLastSeen(cameraList)
          .then(setCameraLastSeen)
          .catch(() => {});
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

  function toggleFavorite(nodeId) {
    if (favoriteStationId === nodeId) {
      clearFavoriteStation();
      setFavoriteStationId(null);
    } else {
      setFavoriteStation(nodeId);
      setFavoriteStationId(nodeId);
    }
  }

  function navigateToView(nextView) {
    setView(nextView);
    setSelectedNodeId(null);
    window.history.pushState({ view: nextView }, '', nextView === 'map' ? window.location.pathname : `?view=${nextView}`);
  }

  function updateCuratorSettings(patch) {
    setCuratorSettingsState((prev) => {
      const next = { ...prev, ...patch };
      setCuratorSettings(next);
      return next;
    });
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
    fetchParameterTimeSeries(param, curatorSettings.timeLapseStartTime)
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

  // What actually feeds the interpolated surface (heatmap/contours) — same
  // fence as the color scale, but applied to the points themselves rather
  // than just the color range, so a broken sensor (e.g. a pressure reading
  // in the thousands of hPa) can't drag the whole surface around it toward
  // an impossible value. Markers still use stationPoints directly above, so
  // a fenced-out station's real (wrong) reading is still visible on its own
  // marker — only the smoothed/blended surface treats it as absent.
  const interpolationPoints = useMemo(() => {
    if (!curatorSettings.useTukeyFences) return stationPoints;
    return filterTukeyOutliers(stationPoints);
  }, [stationPoints, curatorSettings.useTukeyFences]);

  const buildGrid = curatorSettings.interpolationMethod === 'voronoi' ? buildVoronoiGrid : buildValueGrid;

  // The real data spread — fixed across the whole animation (pooled from
  // every frame) so contour levels don't rescale frame-to-frame during
  // playback. Always computed, even for AQI-banded parameters below, since
  // contour line levels need the actual value range, not the fixed bands.
  const valueRange = useMemo(() => {
    if (!selectedParameter) return null;
    const scaleOptions = { useTukeyFences: curatorSettings.useTukeyFences };
    if (isTimeLapse) {
      const allValues = [];
      for (const frame of timeLapseFrames) {
        frame.readings.forEach((r) => {
          const v = r[selectedParameter];
          if (typeof v === 'number' && Number.isFinite(v)) allValues.push(v);
        });
      }
      return createColorScale(allValues, scaleOptions);
    }
    return createColorScale(
      stationPoints.map((p) => p.value),
      scaleOptions,
    );
  }, [selectedParameter, stationPoints, isTimeLapse, timeLapseFrames, curatorSettings.useTukeyFences]);

  // PM2.5/PM10 have official EAQI health-threshold bands, and temperature
  // gets a fixed -30…45°C anchor (standard weather-map convention) — both so
  // their marker/heatmap/legend colors reflect the actual reading instead of
  // this dataset's own min/max, where a uniformly mild/moderate day would
  // otherwise still paint blue-to-red just because that's today's spread.
  // Checked against sourceField (not selectedParameter) so the
  // altitude-corrected temperature layer — same °C quantity, different
  // interpolation — gets the same fixed anchor as raw temperature.
  const colorScale = useMemo(() => {
    if (!selectedParameter) return null;
    if (isAqiParameter(sourceField)) return createAqiColorScale(sourceField);
    const fixedRange = fixedRangeFor(sourceField);
    if (fixedRange) return createFixedColorScale(fixedRange.min, fixedRange.max);
    return valueRange;
  }, [selectedParameter, sourceField, valueRange]);

  const altitudeCorrected = useMemo(() => {
    if (!derivedLayer || interpolationPoints.length === 0) return null;
    return buildAltitudeCorrectedGrid(interpolationPoints, buildGrid);
  }, [derivedLayer, interpolationPoints, buildGrid]);

  const valueGrid = useMemo(() => {
    if (derivedLayer) return altitudeCorrected?.grid ?? null;
    if (interpolationPoints.length === 0) return null;
    if (isTimeLapse) {
      if (frameGridCache.current.has(frameIndex)) return frameGridCache.current.get(frameIndex);
      const grid = buildGrid(interpolationPoints);
      frameGridCache.current.set(frameIndex, grid);
      return grid;
    }
    return buildGrid(interpolationPoints);
  }, [derivedLayer, altitudeCorrected, interpolationPoints, isTimeLapse, frameIndex, buildGrid]);

  const onlineCount = stations ? stations.filter((s) => readings.has(s.id)).length : 0;

  let subtitle = 'Loading stations…';
  if (stations) {
    if (isTimeLapse) {
      if (isLoadingTimeLapse) subtitle = 'Loading 24h history…';
      else if (timeLapseError) subtitle = `Couldn't load history: ${timeLapseError}`;
      else if (currentFrame) {
        subtitle = `${activeField?.label ?? ''} · ${formatFrameTime(currentFrame.timestamp)} (${frameIndex + 1}/${timeLapseFrames.length})${curatorSettings.timeLapseStartTime ? ' · historical' : ''}`;
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
            ['overview', 'Overview'],
            ['about', 'About'],
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
          {favoriteStationId && (
            <button
              type="button"
              className={view === 'node' && selectedNodeId === favoriteStationId ? 'is-active' : ''}
              onClick={() => navigateToNode(favoriteStationId)}
            >
              ★ My Station
            </button>
          )}
        </nav>
        {view === 'map' && <span className="app__subtitle">{subtitle}</span>}
        <button
          type="button"
          className="app__settings-button"
          onClick={() => setShowCuratorSettings(true)}
          title="Curator settings"
          aria-label="Curator settings"
        >
          ⚙
        </button>
      </header>
      {showCuratorSettings && (
        <CuratorSettingsModal
          settings={curatorSettings}
          onChange={updateCuratorSettings}
          onClose={() => setShowCuratorSettings(false)}
        />
      )}
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
            valueRange={valueRange}
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
        <TableView
          stations={stations}
          readings={currentReadings}
          cameraIds={cameraIds}
          cameraLastSeen={cameraLastSeen}
          onOpenNode={navigateToNode}
        />
      )}
      {stations && view === 'cameras' && (
        <CameraGallery
          stations={stations}
          cameraIds={cameraIds}
          cameraLastSeen={cameraLastSeen}
          showOffline={curatorSettings.showOfflineCameras}
          onOpenNode={navigateToNode}
        />
      )}
      {stations && view === 'overview' && (
        <OverviewView stations={stations} currentReadings={currentReadings} onOpenNode={navigateToNode} />
      )}
      {view === 'about' && <AboutPage />}
      {stations && view === 'node' && selectedNodeId && (
        <NodeDetailPage
          nodeId={selectedNodeId}
          stations={stations}
          currentReadings={currentReadings}
          cameraIds={cameraIds}
          cameraLastSeen={cameraLastSeen}
          onBack={() => navigateToView('map')}
          isFavorite={favoriteStationId === selectedNodeId}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
