import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { READING_FIELDS } from '../api/meterApi.js';

const BULGARIA_CENTER = [42.5, 25.4];

function makeIcon(online) {
  return L.divIcon({
    className: '',
    html: `<span class="station-dot ${online ? 'station-dot--online' : 'station-dot--offline'}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
}

const onlineIcon = makeIcon(true);
const offlineIcon = makeIcon(false);

function timeAgo(unixSeconds) {
  if (!unixSeconds) return 'unknown';
  const seconds = Math.max(0, Math.round(Date.now() / 1000 - unixSeconds));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}

function StationPopup({ station, reading }) {
  const fields = reading
    ? READING_FIELDS.filter((f) => reading[f.key] !== null && reading[f.key] !== undefined)
    : [];
  return (
    <div className="station-popup">
      <h3>{station.name}</h3>
      <div className="station-popup__meta">
        {station.id} · {Number.isFinite(station.altitude) ? `${station.altitude} m asl` : ''}
      </div>
      {reading ? (
        <>
          <ul className="station-popup__readings">
            {fields.map((f) => (
              <li key={f.key}>
                <span>{f.label}</span>
                <strong>
                  {reading[f.key]} {f.unit}
                </strong>
              </li>
            ))}
          </ul>
          <div className="station-popup__updated">Updated {timeAgo(reading.ts)}</div>
        </>
      ) : (
        <div className="station-popup__offline">No recent readings</div>
      )}
      <a
        className="station-popup__link"
        href={`https://meter.ac/gs/nodes/${station.id}/history.html`}
        target="_blank"
        rel="noreferrer"
      >
        Full history →
      </a>
    </div>
  );
}

export default function StationMap({ stations, readings }) {
  return (
    <MapContainer center={BULGARIA_CENTER} zoom={7} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stations.map((station) => {
        const reading = readings.get(station.id);
        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lon]}
            icon={reading ? onlineIcon : offlineIcon}
          >
            <Popup>
              <StationPopup station={station} reading={reading} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
