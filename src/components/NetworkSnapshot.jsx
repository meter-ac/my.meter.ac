import { READING_FIELDS } from '../api/meterApi.js';
import { formatReading } from '../utils/format.js';

const LEADERBOARD_SPECS = [
  { key: 't_raw', label: 'Hottest', direction: 'max' },
  { key: 't_raw', label: 'Coldest', direction: 'min' },
  { key: 'pm25', label: 'Highest PM2.5', direction: 'max' },
  { key: 'gamma_cpm', label: 'Highest radiation', direction: 'max' },
];

function findExtreme(stations, readings, key, direction) {
  let best = null;
  let bestValue = null;
  for (const station of stations) {
    const value = readings.get(station.id)?.[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    if (bestValue === null || (direction === 'max' ? value > bestValue : value < bestValue)) {
      bestValue = value;
      best = station;
    }
  }
  return best ? { station: best, value: bestValue } : null;
}

export default function NetworkSnapshot({ stations, currentReadings, onOpenNode }) {
  const onlineCount = stations.filter((s) => currentReadings.has(s.id)).length;

  return (
    <div className="network-snapshot">
      <div className="network-snapshot__stat">
        <strong>{onlineCount}</strong> of {stations.length} nodes reporting right now
      </div>
      <div className="network-snapshot__leaderboard">
        {LEADERBOARD_SPECS.map((spec) => {
          const field = READING_FIELDS.find((f) => f.key === spec.key);
          const extreme = findExtreme(stations, currentReadings, spec.key, spec.direction);
          return (
            <div key={spec.label} className="leaderboard-card">
              <div className="leaderboard-card__label">{spec.label}</div>
              {extreme ? (
                <>
                  <button
                    type="button"
                    className="leaderboard-card__station"
                    onClick={() => onOpenNode(extreme.station.id)}
                  >
                    {extreme.station.name}
                  </button>
                  <div className="leaderboard-card__value">
                    {formatReading(extreme.value)} {field.unit}
                  </div>
                </>
              ) : (
                <div className="leaderboard-card__value">No data</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
