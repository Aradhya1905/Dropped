import type { Coordinate, Secret } from '../../types';

/** A pin rendered on the map for an (as-yet-locked) secret. */
export interface MapMarker {
  id: string;
  coordinate: Coordinate;
  /** Locked secrets render as a generic dot; revealed ones may differ. */
  locked: boolean;
}

/**
 * Provider-agnostic map surface. Concrete impls (Mapbox / MapLibre / Google)
 * sit behind this so features never import a vendor SDK directly.
 */
export interface MapAdapter {
  /** Center + zoom the camera on a coordinate. */
  flyTo(coordinate: Coordinate, zoom?: number): void;
  /** Replace the rendered markers. */
  setMarkers(markers: MapMarker[]): void;
  /** Last known map center (e.g. to query secrets in view). */
  getCenter(): Coordinate | null;
}

export const secretToMarker = (secret: Secret, locked: boolean): MapMarker => ({
  id: secret.id,
  coordinate: secret.drop.coordinate,
  locked,
});
