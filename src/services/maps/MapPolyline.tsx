/**
 * A geographic line on the map (e.g. the dashed ink line joining a trail's
 * stops). Wraps MapLibre's GeoJSON source + line layer so features don't touch
 * the SDK. Render it as a child of `MaplibreView`.
 */
import React, { useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import type { Coordinate } from '../../types';

export function MapPolyline({
  id,
  coordinates,
  color,
  width = 2.2,
  dashArray,
  opacity = 1,
}: {
  /** Unique per line on the map (source + layer ids derive from it). */
  id: string;
  coordinates: Coordinate[];
  color: string;
  width?: number;
  /** MapLibre `line-dasharray`, in multiples of the line width. */
  dashArray?: number[];
  opacity?: number;
}) {
  const data = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: coordinates.map(c => [c.lng, c.lat]),
      },
    }),
    [coordinates],
  );

  if (coordinates.length < 2) return null;

  return (
    <GeoJSONSource id={`${id}-src`} data={data}>
      <Layer
        id={`${id}-line`}
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': color,
          'line-width': width,
          'line-opacity': opacity,
          ...(dashArray ? { 'line-dasharray': dashArray } : {}),
        }}
      />
    </GeoJSONSource>
  );
}
