// Mirrors meterac-ui's own tagging (src/_data/nodes.js and the camera
// gallery use this same set: mountain, sofia, plovdiv, sea) rather than an
// invented generic "city" bucket. Tags aren't mutually exclusive — a station
// can match more than one (or none) — so this is a membership test per
// region, not a single classify-to-one-bucket function.
export const REGIONS = [
  { key: 'mountain', label: 'Mountain' },
  { key: 'sofia', label: 'Sofia' },
  { key: 'plovdiv', label: 'Plovdiv' },
  { key: 'sea', label: 'Sea' },
];

export function stationMatchesRegion(station, regionKey) {
  switch (regionKey) {
    case 'mountain':
      return station.altitude >= 930;
    case 'sofia':
      return station.name?.startsWith('Sofia');
    case 'plovdiv':
      return station.name?.startsWith('Plovdiv');
    case 'sea':
      return station.lon >= 27.3 && station.altitude < 200;
    default:
      return false;
  }
}
