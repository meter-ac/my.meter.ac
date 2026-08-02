import { READING_FIELDS, isCameraOnline } from '../api/meterApi.js';
import { timeAgo, formatReading } from '../utils/format.js';
import NodeHistoryPanel from './NodeHistoryPanel.jsx';

export default function NodeDetailPage({
  nodeId,
  stations,
  currentReadings,
  cameraIds,
  cameraLastSeen,
  onBack,
  isFavorite,
  onToggleFavorite,
}) {
  const station = stations.find((s) => s.id === nodeId);
  const reading = currentReadings.get(nodeId);
  const hasCamera = cameraIds.has(nodeId);
  const cameraSeenAt = cameraLastSeen?.get(nodeId);
  const cameraOnline = isCameraOnline(cameraSeenAt);

  if (!station) {
    return (
      <div className="node-page">
        <button type="button" className="node-page__back" onClick={onBack}>
          ← Back
        </button>
        <p>Unknown station "{nodeId}".</p>
      </div>
    );
  }

  const fields = reading
    ? READING_FIELDS.filter((f) => reading[f.key] !== null && reading[f.key] !== undefined)
    : [];

  return (
    <div className="node-page">
      <button type="button" className="node-page__back" onClick={onBack}>
        ← Back to map
      </button>

      <div className="node-page__header">
        <div className="node-page__title-row">
          <h1>{station.name}</h1>
          <button type="button" className="node-page__favorite" onClick={() => onToggleFavorite(nodeId)}>
            {isFavorite ? '★ Favorite' : '☆ Set as favorite'}
          </button>
        </div>
        <div className="node-page__meta">
          {station.id}
          {Number.isFinite(station.altitude) ? ` · ${station.altitude} m asl` : ''} · {station.lat.toFixed(4)},{' '}
          {station.lon.toFixed(4)}
        </div>
        <div className="node-page__status">
          {reading ? (
            <>
              <span className="status-dot status-dot--online" /> Reporting · updated {timeAgo(reading.ts)}
            </>
          ) : (
            <>
              <span className="status-dot status-dot--offline" /> No recent readings
            </>
          )}
        </div>
      </div>

      {fields.length > 0 && (
        <ul className="node-page__readings">
          {fields.map((f) => (
            <li key={f.key}>
              <span>{f.label}</span>
              <strong>
                {formatReading(reading[f.key])} {f.unit}
              </strong>
            </li>
          ))}
        </ul>
      )}

      {hasCamera && (
        <div className="node-page__section">
          <h2>Camera</h2>
          {!cameraOnline && (
            <div className="node-page__camera-offline">
              ⚠ No recent snapshot
              {cameraSeenAt ? ` — last seen ${timeAgo(cameraSeenAt.getTime() / 1000)}` : ''}. Showing the last image
              received.
            </div>
          )}
          <img
            className={cameraOnline ? 'node-page__camera-image' : 'node-page__camera-image node-page__camera-image--offline'}
            src={`https://meter.ac/gs/nodes/${nodeId}/snap.jpg?t=${Math.floor(Date.now() / 60000)}`}
            alt={`Latest snapshot from ${station.name}`}
          />
          <a href={`https://meter.ac/gs/nodes/${nodeId}/snap-video-last-1d.mp4`} target="_blank" rel="noreferrer">
            Watch 24h timelapse ↗
          </a>
        </div>
      )}

      <div className="node-page__section">
        <h2>History</h2>
        <NodeHistoryPanel nodeId={nodeId} />
      </div>

      <div className="node-page__external-links">
        <a href={`https://meter.ac/gs/nodes/${nodeId}/history.html`} target="_blank" rel="noreferrer">
          Full history on meter.ac ↗
        </a>
        <a href={`https://meter.ac/gs/nodes/${nodeId}/gauge.html`} target="_blank" rel="noreferrer">
          Gauge view on meter.ac ↗
        </a>
      </div>
    </div>
  );
}
