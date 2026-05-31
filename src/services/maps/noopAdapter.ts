import type { Coordinate } from '../../types';
import type { MapAdapter, MapMarker } from './types';

/**
 * No-op MapAdapter. Lets the app compile and run before a real map provider
 * is chosen/installed. Swap for a Mapbox/MapLibre impl later.
 */
export const noopAdapter: MapAdapter = {
  flyTo(_coordinate: Coordinate, _zoom?: number): void {},
  setMarkers(_markers: MapMarker[]): void {},
  getCenter(): Coordinate | null {
    return null;
  },
};
