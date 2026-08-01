import { useMemo } from 'react';
import { ImageOverlay } from 'react-leaflet';
import { renderHeatmapImage } from '../interpolation/idw.js';

export default function HeatmapOverlay({ valueGrid, getColorForValue }) {
  const image = useMemo(() => {
    if (!valueGrid) return null;
    return renderHeatmapImage(valueGrid, getColorForValue);
  }, [valueGrid, getColorForValue]);

  if (!image) return null;

  return <ImageOverlay url={image.dataUrl} bounds={image.bounds} opacity={0.6} />;
}
