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
        <label className="modal__option">
          <input
            type="checkbox"
            checked={settings.useTukeyFences}
            onChange={(e) => onChange({ useTukeyFences: e.target.checked })}
          />
          <span>
            <span className="modal__option-title">Exclude outliers from map color scale (Tukey&apos;s fences)</span>
            <span className="modal__option-hint">
              On (default): a handful of faulty sensor readings won&apos;t stretch the whole color scale into one
              flat color for everyone else. Turn off to spot failed sensors — every reading, including obviously
              broken ones, then drives the scale, so a stuck or runaway sensor shows up as an extreme color instead
              of being fenced out and clamped to a normal-looking end color.
            </span>
          </span>
        </label>
        <label className="modal__option">
          <input
            type="checkbox"
            checked={settings.showOfflineCameras}
            onChange={(e) => onChange({ showOfflineCameras: e.target.checked })}
          />
          <span>
            <span className="modal__option-title">Show offline cameras in the gallery</span>
            <span className="modal__option-hint">
              On (default): cameras with no recent snapshot still appear, dimmed and badged as offline. Turn off to
              hide them entirely and only see cameras that are currently live.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
