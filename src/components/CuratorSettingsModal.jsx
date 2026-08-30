// datetime-local inputs expect "YYYY-MM-DDTHH:MM" in the browser's local
// timezone (no offset suffix), but we store the setting as a UTC ISO string.
// This converts a stored ISO string back to the local-time format the input
// needs for its value attribute.
function toLocalDateTimeString(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export default function CuratorSettingsModal({ settings, onChange, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Curator settings</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal__option-row">
          <label className="modal__option">
            <input
              type="checkbox"
              checked={settings.useTukeyFences}
              onChange={(e) => onChange({ useTukeyFences: e.target.checked })}
            />
            <span className="modal__option-title">Exclude outliers (Tukey&apos;s fences)</span>
          </label>
          <details className="modal__option-details">
            <summary>What does this do?</summary>
            <p className="modal__option-hint">
              On (default): a handful of faulty sensor readings won&apos;t stretch the whole color scale into one
              flat color, and won&apos;t get fed into the map&apos;s interpolated surface either — a broken pressure
              sensor reading e.g. 2000 hPa no longer drags the heatmap/contours around it toward that value. Turn
              off to spot failed sensors instead — every reading, including obviously broken ones, then drives both
              the scale and the interpolation, so a stuck or runaway sensor shows up as an extreme color and visibly
              distorts the surface around it instead of being fenced out.
            </p>
          </details>
        </div>

        <div className="modal__option-row">
          <label className="modal__option">
            <input
              type="checkbox"
              checked={settings.showOfflineCameras}
              onChange={(e) => onChange({ showOfflineCameras: e.target.checked })}
            />
            <span className="modal__option-title">Show offline cameras in the gallery</span>
          </label>
          <details className="modal__option-details">
            <summary>What does this do?</summary>
            <p className="modal__option-hint">
              On (default): cameras with no recent snapshot still appear, dimmed and badged as offline. Turn off to
              hide them entirely and only see cameras that are currently live.
            </p>
          </details>
        </div>

        <div className="modal__option-row">
          <div className="modal__option-title">Map interpolation method</div>
          <span className="modal__radio-row">
            <label>
              <input
                type="radio"
                name="interpolationMethod"
                value="idw"
                checked={settings.interpolationMethod === 'idw'}
                onChange={() => onChange({ interpolationMethod: 'idw' })}
              />
              Inverse Distance Weighting (IDW)
            </label>
            <label>
              <input
                type="radio"
                name="interpolationMethod"
                value="voronoi"
                checked={settings.interpolationMethod === 'voronoi'}
                onChange={() => onChange({ interpolationMethod: 'voronoi' })}
              />
              Voronoi
            </label>
          </span>
          <details className="modal__option-details">
            <summary>What does this do?</summary>
            <p className="modal__option-hint">
              Inverse Distance Weighting (IDW, default) blends every station&apos;s value into a smooth surface,
              weighted by distance. Voronoi instead gives each grid cell its single nearest station&apos;s value
              outright — flat regions with hard edges at the midpoint between stations, but a bad reading can never
              bleed past its own region the way it can with IDW&apos;s smooth, unbounded blending.
            </p>
          </details>
        </div>

        <div className="modal__option-row">
          <label className="modal__option">
            <span className="modal__option-title">Timelapse start time</span>
            <p className="modal__option-hint">
              Defaults to &quot;now&quot; (last 24h ending at the moment of fetch). Set a time to play back
              historical data from a 24h window starting at that moment instead.
            </p>
            <div className="modal__datetime-row">
              <input
                type="datetime-local"
                value={settings.timeLapseStartTime ? toLocalDateTimeString(settings.timeLapseStartTime) : ''}
                onChange={(e) =>
                  onChange({
                    timeLapseStartTime: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
              {settings.timeLapseStartTime && (
                <button
                  type="button"
                  className="modal__clear-button"
                  onClick={() => onChange({ timeLapseStartTime: null })}
                >
                  Clear
                </button>
              )}
            </div>
          </label>
          <details className="modal__option-details">
            <summary>How does this work?</summary>
            <p className="modal__option-hint">
              When set, the timelapse loads the 24-hour window starting at your chosen time instead of the live
              last-24h. The setting persists across reloads. Clear it to return to live behavior.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
