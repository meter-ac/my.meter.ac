import { feature } from 'topojson-client';
import topology from '../assets/bulgaria.topo.json';

const objectKey = Object.keys(topology.objects)[0];
const geo = feature(topology, topology.objects[objectKey]);

const polygons = (() => {
  const geometries = geo.type === 'FeatureCollection' ? geo.features.map((f) => f.geometry) : [geo.geometry];
  const out = [];
  for (const g of geometries) {
    if (!g) continue;
    if (g.type === 'Polygon') out.push(g.coordinates);
    else if (g.type === 'MultiPolygon') out.push(...g.coordinates);
  }
  return out;
})();

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon, lat, rings) {
  if (!pointInRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lon, lat, rings[i])) return false;
  }
  return true;
}

export function isInsideBulgaria(lat, lon) {
  return polygons.some((rings) => pointInPolygon(lon, lat, rings));
}

export const bulgariaBounds = (() => {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const rings of polygons) {
    for (const [lon, lat] of rings[0]) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
  }
  return { minLat, maxLat, minLon, maxLon };
})();
