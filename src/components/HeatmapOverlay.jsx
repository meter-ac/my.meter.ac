import { useMemo } from 'react';
import { ImageOverlay } from 'react-leaflet';
import { buildHeatmapImage } from '../interpolation/idw.js';

export default function HeatmapOverlay({ stations, readings, parameterKey, getColorForValue }) {
  const image = useMemo(() => {
    const points = [];
    for (const station of stations) {
      const reading = readings.get(station.id);
      const value = reading ? reading[parameterKey] : undefined;
      if (typeof value === 'number' && Number.isFinite(value)) {
        points.push({ lat: station.lat, lon: station.lon, value });
      }
    }
    return buildHeatmapImage(points, getColorForValue);
  }, [stations, readings, parameterKey, getColorForValue]);

  if (!image) return null;

  return <ImageOverlay url={image.dataUrl} bounds={image.bounds} opacity={0.6} />;
}
