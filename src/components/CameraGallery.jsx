import { useMemo } from 'react';
import { isCameraOnline } from '../api/meterApi.js';
import { timeAgo } from '../utils/format.js';

export default function CameraGallery({ stations, cameraIds, cameraLastSeen, onOpenNode }) {
  const cameraStations = useMemo(() => {
    const byId = new Map(stations.map((s) => [s.id, s]));
    return Array.from(cameraIds)
      .map((id) => byId.get(id) ?? { id, name: id })
      .filter(Boolean);
  }, [cameraIds, stations]);

  if (cameraStations.length === 0) return <div className="camera-gallery__status">No cameras found.</div>;

  return (
    <div className="camera-gallery">
      <div className="camera-gallery__grid">
        {cameraStations.map((station) => {
          const lastSeen = cameraLastSeen?.get(station.id);
          const online = isCameraOnline(lastSeen);
          return (
            <button
              key={station.id}
              type="button"
              className={online ? 'camera-card' : 'camera-card camera-card--offline'}
              onClick={() => onOpenNode(station.id)}
            >
              <img
                src={`https://meter.ac/gs/nodes/${station.id}/snap.jpg?t=${Math.floor(Date.now() / 60000)}`}
                alt={`Latest snapshot from ${station.name}`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden';
                }}
              />
              {!online && (
                <span className="camera-card__badge">
                  Offline{lastSeen ? ` · last seen ${timeAgo(lastSeen.getTime() / 1000)}` : ''}
                </span>
              )}
              <span className="camera-card__label">{station.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
