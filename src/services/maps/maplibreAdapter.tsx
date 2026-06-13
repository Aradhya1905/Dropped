/**
 * MapLibre adapter for the Dropped map service.
 *
 * Implements MapAdapter using @maplibre/maplibre-react-native with Protomaps
 * vector tiles styled to match the app's paper/ink/sage palette.
 *
 * Usage: render <MaplibreView> in the map screen; call the returned adapter
 * methods (flyTo, setMarkers, getCenter) from hooks/features.
 *
 * API key: pass your Protomaps key via the PROTOMAPS_API_KEY env var. In dev
 * you can hard-code a key here temporarily, or use react-native-config.
 */
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  type CameraRef,
  Map,
  type MapRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';

import type { Coordinate } from '../../types';
import { droppedMapStyle } from './droppedStyle';
import type { MapAdapter, MapMarker } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Your Protomaps API key. Sign up free at https://protomaps.com.
 * Replace this with `Config.PROTOMAPS_API_KEY` once react-native-config is set up.
 */
const PROTOMAPS_API_KEY = '';

/** Default center shown before location permission is granted (New York, matching design). */
const DEFAULT_CENTER: Coordinate = { lat: 40.7128, lng: -74.006 };

/** Street-level zoom — matches the density shown in the design. */
const DEFAULT_ZOOM = 15;

// ---------------------------------------------------------------------------
// Adapter hook
// ---------------------------------------------------------------------------

export interface MaplibreAdapterResult {
  /** Bind to the map surface via `adapter` prop or passed to features. */
  adapter: MapAdapter;
  /** Controlled state — markers to render as RN views above the map. */
  markers: MapMarker[];
  /** Render this component as the map background. */
  MaplibreView: React.ComponentType<{ style?: object }>;
}

export function useMaplibreAdapter(
  initialCenter: Coordinate = DEFAULT_CENTER,
): MaplibreAdapterResult {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  // Center is tracked synchronously (updated on every region change) so
  // getCenter() can return without awaiting a native bridge call.
  const centerRef = useRef<Coordinate>(initialCenter);
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  const flyTo = useCallback((coordinate: Coordinate, zoom?: number) => {
    cameraRef.current?.flyTo({
      center: [coordinate.lng, coordinate.lat],
      zoom: zoom ?? DEFAULT_ZOOM,
      duration: 800,
    });
  }, []);

  const setMarkersImpl = useCallback((next: MapMarker[]) => {
    setMarkers(next);
  }, []);

  const getCenter = useCallback((): Coordinate | null => {
    return centerRef.current;
  }, []);

  const onRegionDidChange = useCallback((e: ViewStateChangeEvent) => {
    const [lng, lat] = e.center;
    centerRef.current = { lat, lng };
  }, []);

  const style = droppedMapStyle(PROTOMAPS_API_KEY);

  const MaplibreView = useCallback(
    ({ style: viewStyle }: { style?: object }) => (
      <Map
        ref={mapRef}
        style={[styles.map, viewStyle]}
        mapStyle={style as never}
        onRegionDidChange={onRegionDidChange}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        initialViewState={{
          center: [initialCenter.lng, initialCenter.lat],
          zoom: DEFAULT_ZOOM,
        }}
      >
        <Camera ref={cameraRef} />
      </Map>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const adapter: MapAdapter = { flyTo, setMarkers: setMarkersImpl, getCenter };

  return { adapter, markers, MaplibreView };
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },
});
