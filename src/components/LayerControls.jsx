import { READING_FIELDS } from '../api/meterApi.js';
import { SCALE_STOPS } from '../color/colorScale.js';

function formatValue(v) {
  if (!Number.isFinite(v)) return '–';
  return Math.round(v * 10) / 10;
}

export default function LayerControls({
  selectedParameter,
  onSelectParameter,
  showHeatmap,
  onToggleHeatmap,
  scale,
}) {
  const gradientCss = `linear-gradient(to right, ${SCALE_STOPS.map(([r, g, b]) => `rgb(${r},${g},${b})`).join(', ')})`;
  const activeField = READING_FIELDS.find((f) => f.key === selectedParameter);

  return (
    <div className="layer-controls">
      <div className="layer-controls__section">
        <label htmlFor="parameter-select">Layer</label>
        <select
          id="parameter-select"
          value={selectedParameter ?? ''}
          onChange={(e) => onSelectParameter(e.target.value || null)}
        >
          <option value="">Station status</option>
          {READING_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

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
