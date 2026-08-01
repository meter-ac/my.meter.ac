import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { READING_FIELDS } from '../api/meterApi.js';
import HeatmapOverlay from './HeatmapOverlay.jsx';
import ContourLayer from './ContourLayer.jsx';

const BULGARIA_CENTER = [42.5, 25.4];
const OFFLINE_COLOR = '#9aa5ad';
const ONLINE_DEFAULT_COLOR = '#2e9e4f';

function iconForColor(color) {
  return L.divIcon({
    className: '',
    html: `<span class="station-dot" style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
}

function timeAgo(unixSeconds) {
  if (!unixSeconds) return 'unknown';
  const seconds = Math.max(0, Math.round(Date.now() / 1000 - unixSeconds));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}

function formatReading(value) {
  return Math.round(value * 10) / 10;
}

function StationPopup({ station, reading, isDayAverage, isTimeLapse }) {
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
                  {formatReading(reading[f.key])} {f.unit}
                </strong>
              </li>
            ))}
          </ul>
          {/* Time-lapse frames share one timestamp across all stations,
              already shown in the header — no per-station line needed. */}
          {!isTimeLapse && (
            <div className="station-popup__updated">
              {isDayAverage ? `24h average · ${reading.sample_count ?? '?'} samples` : `Updated ${timeAgo(reading.ts)}`}
            </div>
          )}
        </>
      ) : (
        <div className="station-popup__offline">
          {isTimeLapse ? 'No data at this time' : isDayAverage ? 'No data in last 24h' : 'No recent readings'}
        </div>
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

export default function StationMap({
  stations,
  readings,
  isDayAverage,
  isTimeLapse,
  selectedParameter,
  markerValueKey,
  colorScale,
  valueGrid,
  showHeatmap,
  showContours,
  contourStep,
  contourUnit,
}) {
  return (
    <MapContainer center={BULGARIA_CENTER} zoom={7} className="map" preferCanvas>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showHeatmap && selectedParameter && colorScale && (
        <HeatmapOverlay valueGrid={valueGrid} getColorForValue={colorScale.getColorForValue} />
      )}
      {showContours && selectedParameter && colorScale && (
        <ContourLayer
          valueGrid={valueGrid}
          min={colorScale.min}
          max={colorScale.max}
          step={contourStep}
          unit={contourUnit}
        />
      )}
      {stations.map((station) => {
        const reading = readings.get(station.id);
        let color = OFFLINE_COLOR;
        if (reading) {
          const value = markerValueKey ? reading[markerValueKey] : undefined;
          if (selectedParameter && colorScale) {
            color = typeof value === 'number' && Number.isFinite(value) ? colorScale.getColor(value) : OFFLINE_COLOR;
          } else if (!selectedParameter) {
            color = ONLINE_DEFAULT_COLOR;
          }
        }
        return (
          <Marker key={station.id} position={[station.lat, station.lon]} icon={iconForColor(color)}>
            <Popup>
              <StationPopup station={station} reading={reading} isDayAverage={isDayAverage} isTimeLapse={isTimeLapse} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
