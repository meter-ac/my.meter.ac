import { useMemo, useState } from 'react';
import { isCameraOnline } from '../api/meterApi.js';
import { timeAgo } from '../utils/format.js';
import { REGIONS, stationMatchesRegion } from '../utils/regions.js';

export default function CameraGallery({ stations, cameraIds, cameraLastSeen, showOffline = true, onOpenNode }) {
  const [region, setRegion] = useState('all');

  const cameraStations = useMemo(() => {
    const byId = new Map(stations.map((s) => [s.id, s]));
    let list = Array.from(cameraIds)
      .map((id) => byId.get(id) ?? { id, name: id })
      .filter(Boolean);
    if (!showOffline) list = list.filter((station) => isCameraOnline(cameraLastSeen?.get(station.id)));
    if (region !== 'all') list = list.filter((station) => stationMatchesRegion(station, region));
    return list;
  }, [cameraIds, stations, showOffline, cameraLastSeen, region]);

  return (
    <div className="camera-gallery">
      <div className="layer-controls__segmented camera-gallery__regions">
        <button type="button" className={region === 'all' ? 'is-active' : ''} onClick={() => setRegion('all')}>
          All
        </button>
        {REGIONS.map((r) => (
          <button key={r.key} type="button" className={region === r.key ? 'is-active' : ''} onClick={() => setRegion(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      {cameraStations.length === 0 ? (
        <div className="camera-gallery__status">
          {showOffline ? 'No cameras found.' : 'No live cameras right now — try showing offline cameras in curator settings.'}
        </div>
      ) : (
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
      )}
    </div>
  );
}
