import { useEffect, useMemo, useState } from 'react';
import { fetchCameraNodeIds } from '../api/meterApi.js';

export default function CameraGallery({ stations }) {
  const [cameraIds, setCameraIds] = useState(null);
  const [error, setError] = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(null);

  useEffect(() => {
    fetchCameraNodeIds()
      .then(setCameraIds)
      .catch((err) => setError(err.message));
  }, []);

  const cameraStations = useMemo(() => {
    if (!cameraIds) return [];
    const byId = new Map(stations.map((s) => [s.id, s]));
    return cameraIds.map((id) => byId.get(id) ?? { id, name: id }).filter(Boolean);
  }, [cameraIds, stations]);

  if (error) return <div className="camera-gallery__status">Couldn't load camera list: {error}</div>;
  if (!cameraIds) return <div className="camera-gallery__status">Loading cameras…</div>;

  return (
    <div className="camera-gallery">
      <div className="camera-gallery__grid">
        {cameraStations.map((station) => (
          <button key={station.id} type="button" className="camera-card" onClick={() => setActiveVideoId(station.id)}>
            <img
              src={`https://meter.ac/gs/nodes/${station.id}/snap.jpg?t=${Math.floor(Date.now() / 60000)}`}
              alt={`Latest snapshot from ${station.name}`}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
            <span className="camera-card__label">{station.name}</span>
          </button>
        ))}
      </div>

      {activeVideoId && (
        <div className="modal-backdrop" onClick={() => setActiveVideoId(null)}>
          <div className="modal modal--video" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{cameraStations.find((s) => s.id === activeVideoId)?.name}</h2>
              <button type="button" className="modal__close" onClick={() => setActiveVideoId(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <video controls autoPlay src={`https://meter.ac/gs/nodes/${activeVideoId}/snap-video-last-1d.mp4`} />
            <div className="camera-card__label">Last 24h timelapse</div>
          </div>
        </div>
      )}
    </div>
  );
}
