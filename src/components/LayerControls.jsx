import { READING_FIELDS } from '../api/meterApi.js';
import { DERIVED_LAYERS } from '../api/derivedLayers.js';
import { SCALE_STOPS } from '../color/colorScale.js';
import PlaybackControls from './PlaybackControls.jsx';

function formatValue(v) {
  if (!Number.isFinite(v)) return '–';
  return Math.round(v * 10) / 10;
}

export default function LayerControls({
  dataMode,
  onSelectDataMode,
  selectedParameter,
  onSelectParameter,
  showHeatmap,
  onToggleHeatmap,
  showContours,
  onToggleContours,
  scale,
  lapseRate,
  timeLapseFrames,
  frameIndex,
  onFrameIndexChange,
  isPlaying,
  onTogglePlaying,
  isLoadingTimeLapse,
  timeLapseError,
}) {
  const gradientCss = `linear-gradient(to right, ${SCALE_STOPS.map(([r, g, b]) => `rgb(${r},${g},${b})`).join(', ')})`;
  const activeField = READING_FIELDS.find((f) => f.key === selectedParameter) ?? DERIVED_LAYERS[selectedParameter];
  const isTimeLapse = dataMode === 'time-lapse';

  return (
    <div className="layer-controls">
      <div className="layer-controls__section">
        <label>Data</label>
        <div className="layer-controls__segmented">
          <button
            type="button"
            className={dataMode === 'current' ? 'is-active' : ''}
            onClick={() => onSelectDataMode('current')}
          >
            Current
          </button>
          <button
            type="button"
            className={dataMode === 'day-average' ? 'is-active' : ''}
            onClick={() => onSelectDataMode('day-average')}
          >
            24h average
          </button>
          <button
            type="button"
            className={isTimeLapse ? 'is-active' : ''}
            onClick={() => onSelectDataMode('time-lapse')}
          >
            Time lapse
          </button>
        </div>
      </div>

      <div className="layer-controls__section">
        <label htmlFor="parameter-select">Layer</label>
        <select
          id="parameter-select"
          value={selectedParameter ?? ''}
          onChange={(e) => onSelectParameter(e.target.value || null)}
        >
          {!isTimeLapse && <option value="">Station status</option>}
          {READING_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
          {!isTimeLapse &&
            Object.values(DERIVED_LAYERS).map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
        </select>
      </div>

      {isTimeLapse && (
        <PlaybackControls
          frames={timeLapseFrames}
          frameIndex={frameIndex}
          onFrameIndexChange={onFrameIndexChange}
          isPlaying={isPlaying}
          onTogglePlaying={onTogglePlaying}
          isLoading={isLoadingTimeLapse}
          error={timeLapseError}
        />
      )}

      {selectedParameter && (
        <>
          <label className="layer-controls__checkbox">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => onToggleHeatmap(e.target.checked)}
            />
            Show interpolated surface
          </label>
          <label className="layer-controls__checkbox">
            <input
              type="checkbox"
              checked={showContours}
              onChange={(e) => onToggleContours(e.target.checked)}
            />
            Show contour lines
          </label>
          {lapseRate && (
            <div className="layer-controls__note">
              Lapse rate: {(lapseRate.slope * 1000).toFixed(1)} °C/km
              {lapseRate.fitted ? ' (fitted)' : ' (standard)'}
            </div>
          )}
          <div className="layer-controls__legend">
            <div className="layer-controls__gradient" style={{ background: gradientCss }} />
            <div className="layer-controls__legend-labels">
              <span>
                {formatValue(scale?.min)} {activeField?.unit}
              </span>
              <span>
                {formatValue(scale?.max)} {activeField?.unit}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
