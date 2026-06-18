/**
 * MapLibre adapter for the Dropped map service.
 *
 * Implements MapAdapter using @maplibre/maplibre-react-native with Protomaps
 * vector tiles styled to match the app's paper/ink/sage palette.
 *
 * Usage: render <MaplibreView> in the map screen; call the returned adapter
 * methods (flyTo, setMarkers, getCenter) from hooks/features.
 *
 * API key: set PROTOMAPS_API_KEY in `.env` (loaded via react-native-config).
 */
import React, { useCallback, useRef, useState } from 'react';
import Config from 'react-native-config';
import { StyleSheet, type NativeSyntheticEvent } from 'react-native';
import {
  Camera,
  type CameraRef,
  Map,
  type MapRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';

import type { Coordinate } from '../../types';
import { getMapStyle, setMapStyle as persistMapStyle } from '../storage';
import { droppedMapStyle } from './droppedStyle';
import type { MapAdapter, MapMarker } from './types';

export type MapStyleKey = 'dropped' | 'quiet' | 'dark' | 'grayscale';

export interface MapStyleOption {
  key: MapStyleKey;
  label: string;
  source: object | string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Protomaps API key, loaded from `.env` via react-native-config.
 * Sign up free at https://protomaps.com.
 */
const PROTOMAPS_API_KEY = Config.PROTOMAPS_API_KEY;

/**
 * Optional `{fontstack}/{range}.pbf` glyph template for the brand (Geist) font.
 * When set, the Dropped style renders labels in Geist; otherwise it falls back
 * to Noto Sans on the Protomaps CDN. See `droppedMapStyle` for hosting notes.
 */
const MAP_GLYPHS_URL = Config.MAP_GLYPHS_URL;

const STYLE_OPTIONS: MapStyleOption[] = [
  { key: 'dropped', label: 'Dropped', source: droppedMapStyle(PROTOMAPS_API_KEY, MAP_GLYPHS_URL) },
  { key: 'quiet', label: 'Quiet', source: droppedMapStyle(PROTOMAPS_API_KEY, MAP_GLYPHS_URL, { labels: false }) },
  { key: 'dark', label: 'Dark', source: `https://api.protomaps.com/styles/v5/dark/en.json?key=${PROTOMAPS_API_KEY}` },
  { key: 'grayscale', label: 'Grayscale', source: `https://api.protomaps.com/styles/v5/grayscale/en.json?key=${PROTOMAPS_API_KEY}` },
];

/** Display label for a style key (e.g. for the You-screen settings row). */
export function mapStyleLabel(key: MapStyleKey): string {
  return STYLE_OPTIONS.find(s => s.key === key)?.label ?? STYLE_OPTIONS[0].label;
}

/** Default center shown before location permission is granted (New York, matching design). */
const DEFAULT_CENTER: Coordinate = { lat: 40.7128, lng: -74.006 };

/** Street-level zoom — matches the density shown in the design. */
const DEFAULT_ZOOM = 15;

// ---------------------------------------------------------------------------
// Adapter hook
// ---------------------------------------------------------------------------

export interface MaplibreAdapterResult {
  adapter: MapAdapter;
  markers: MapMarker[];
  MaplibreView: React.ComponentType<{ style?: object; children?: React.ReactNode }>;
  activeStyleKey: MapStyleKey;
  setMapStyle: (key: MapStyleKey) => void;
  styleOptions: MapStyleOption[];
}

export function useMaplibreAdapter(
  initialCenter: Coordinate = DEFAULT_CENTER,
): MaplibreAdapterResult {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  // Center is tracked synchronously (updated on every region change) so
  // getCenter() can return without awaiting a native bridge call.
  const centerRef = useRef<Coordinate>(initialCenter);
  // Latest requested initial center, read by the (memoized) MaplibreView when
  // the native <Map> actually mounts — avoids freezing a stale center.
  const initialCenterRef = useRef<Coordinate>(initialCenter);
  initialCenterRef.current = initialCenter;
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  // Restore the persisted choice so the map and the You screen agree across
  // mounts (default is STYLE_OPTIONS[0] — 'dropped').
  const [activeStyle, setActiveStyle] = useState<object | string>(() => {
    const saved = getMapStyle();
    return (STYLE_OPTIONS.find(s => s.key === saved) ?? STYLE_OPTIONS[0]).source;
  });

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

  const setMapStyle = useCallback((key: MapStyleKey) => {
    const opt = STYLE_OPTIONS.find(s => s.key === key);
    if (opt) {
      setActiveStyle(opt.source);
      persistMapStyle(key);
    }
  }, []);

  const onRegionDidChange = useCallback(
    (e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const [lng, lat] = e.nativeEvent.center;
      centerRef.current = { lat, lng };
    },
    [],
  );

  const MaplibreView = useCallback(
    ({ style: viewStyle, children }: { style?: object; children?: React.ReactNode }) => (
      <Map
        ref={mapRef}
        style={[styles.map, viewStyle]}
        mapStyle={activeStyle as never}
        onRegionDidChange={onRegionDidChange}
        logo={false}
        attribution={false}
        compass={false}
        scaleBar={false}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [initialCenterRef.current.lng, initialCenterRef.current.lat],
            zoom: DEFAULT_ZOOM,
          }}
        />
        {children}
      </Map>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeStyle, onRegionDidChange],
  );

  const adapter: MapAdapter = { flyTo, setMarkers: setMarkersImpl, getCenter };

  const activeStyleKey: MapStyleKey =
    STYLE_OPTIONS.find(s => s.source === activeStyle)?.key ?? 'dropped';

  return { adapter, markers, MaplibreView, activeStyleKey, setMapStyle, styleOptions: STYLE_OPTIONS };
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
