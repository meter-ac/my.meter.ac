import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { READING_FIELDS } from '../api/meterApi.js';
import { timeAgo, formatReading } from '../utils/format.js';
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

function StationPopup({ station, reading, isDayAverage, isTimeLapse, onViewHistory }) {
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
      <div className="station-popup__links">
        <button type="button" className="station-popup__link station-popup__link--button" onClick={() => onViewHistory(station)}>
          View history
        </button>
        <a
          className="station-popup__link"
          href={`https://meter.ac/gs/nodes/${station.id}/history.html`}
          target="_blank"
          rel="noreferrer"
        >
          Full history on meter.ac →
        </a>
      </div>
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
  onViewHistory,
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
              <StationPopup
                station={station}
                reading={reading}
                isDayAverage={isDayAverage}
                isTimeLapse={isTimeLapse}
                onViewHistory={onViewHistory}
              />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
