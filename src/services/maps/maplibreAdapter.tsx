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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getMapStyle, type MapStyle, setMapStyle as persistMapStyle } from '../storage';
import { droppedMapStyle } from './droppedStyle';
import { FogLayer, type BoundsSubscribe } from './FogLayer';
import type { FogView } from './fog';
import { AUTO_RECHECK_MS, resolveMapStyle, type ResolvedMapStyle } from './nightStyle';
import type { MapAdapter, MapMarker } from './types';

/** A concrete cut the map can render. `auto` is deliberately not one of these. */
export type MapStyleKey = ResolvedMapStyle;

/** What the user picked — a cut, or the `auto` mode. */
export type MapStyleChoice = MapStyle;

export interface MapStyleOption {
  key: MapStyleChoice;
  label: string;
  /** Absent for `auto`, which has no source of its own — it resolves to one. */
  source?: object | string;
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

/**
 * The concrete cuts, in picker order.
 *
 * `droppedNight` is the app's own style after dark — see `droppedStyle`'s NIGHT
 * palette for why it exists alongside Protomaps' stock `dark`, which is a
 * perfectly good map of a different app.
 */
const STYLE_SOURCES: Record<MapStyleKey, object | string> = {
  dropped: droppedMapStyle(PROTOMAPS_API_KEY, MAP_GLYPHS_URL),
  quiet: droppedMapStyle(PROTOMAPS_API_KEY, MAP_GLYPHS_URL, { labels: false }),
  droppedNight: droppedMapStyle(PROTOMAPS_API_KEY, MAP_GLYPHS_URL, { dark: true }),
  dark: `https://api.protomaps.com/styles/v5/dark/en.json?key=${PROTOMAPS_API_KEY}`,
  grayscale: `https://api.protomaps.com/styles/v5/grayscale/en.json?key=${PROTOMAPS_API_KEY}`,
};

const STYLE_OPTIONS: MapStyleOption[] = [
  { key: 'dropped', label: 'Dropped', source: STYLE_SOURCES.dropped },
  { key: 'quiet', label: 'Quiet', source: STYLE_SOURCES.quiet },
  { key: 'droppedNight', label: 'Dropped after dark', source: STYLE_SOURCES.droppedNight },
  // No source: `auto` is a mode that resolves to one of the above at render.
  { key: 'auto', label: 'Follow the sun' },
  { key: 'dark', label: 'Dark', source: STYLE_SOURCES.dark },
  { key: 'grayscale', label: 'Grayscale', source: STYLE_SOURCES.grayscale },
];

/** Display label for a style choice (e.g. for the You-screen settings row). */
export function mapStyleLabel(key: MapStyleChoice): string {
  return STYLE_OPTIONS.find(s => s.key === key)?.label ?? STYLE_OPTIONS[0].label;
}

/** Default center shown before location permission is granted (New York, matching design). */
const DEFAULT_CENTER: Coordinate = { lat: 40.7128, lng: -74.006 };

/** Street-level zoom — matches the density shown in the design. */
const DEFAULT_ZOOM = 15;

// ---------------------------------------------------------------------------
// Adapter hook
// ---------------------------------------------------------------------------

export interface MaplibreAdapterOptions {
  /**
   * Cover unwalked ground in fog and clear it as the user walks (idea 01).
   * Off by default — screens opt in.
   */
  fog?: boolean;
  /** Override the street-level default (e.g. a pulled-back header map). */
  initialZoom?: number;
  /**
   * Render into the RN view hierarchy instead of onto its own surface. Needed
   * whenever the map is a *part* of a screen rather than the whole of it: on
   * Android the default GLSurfaceView punches through sibling z-order, so a
   * card-embedded map would paint over everything below it. Costs a little
   * performance, hence opt-in.
   */
  embedded?: boolean;
}

export interface MaplibreAdapterResult {
  adapter: MapAdapter;
  markers: MapMarker[];
  MaplibreView: React.ComponentType<{ style?: object; children?: React.ReactNode }>;
  /** What the user picked — `auto` included, so the picker can tick that row. */
  activeStyleKey: MapStyleChoice;
  /** What `auto` currently resolves to. Equal to `activeStyleKey` otherwise. */
  renderedStyleKey: MapStyleKey;
  setMapStyle: (key: MapStyleChoice) => void;
  styleOptions: MapStyleOption[];
}

export function useMaplibreAdapter(
  initialCenter: Coordinate = DEFAULT_CENTER,
  {
    fog = false,
    initialZoom = DEFAULT_ZOOM,
    embedded = false,
  }: MaplibreAdapterOptions = {},
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
  const initialZoomRef = useRef<number>(initialZoom);
  initialZoomRef.current = initialZoom;
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  // Restore the persisted *choice* so the map and the You screen agree across
  // mounts. `auto` is kept as `auto` here and resolved below — see nightStyle.
  const [styleChoice, setStyleChoice] = useState<MapStyleChoice>(getMapStyle);
  // Bumped on a timer while `auto` is selected, so an app left open through
  // sunset changes with the sky instead of at the next remount.
  const [sunTick, setSunTick] = useState(0);

  useEffect(() => {
    if (styleChoice !== 'auto') return;
    const id = setInterval(() => setSunTick(n => n + 1), AUTO_RECHECK_MS);
    return () => clearInterval(id);
  }, [styleChoice]);

  const flyTo = useCallback((coordinate: Coordinate, zoom?: number) => {
    cameraRef.current?.flyTo({
      center: [coordinate.lng, coordinate.lat],
      zoom: zoom ?? DEFAULT_ZOOM,
      duration: 800,
    });
  }, []);

  const fitBounds = useCallback((coordinates: Coordinate[], padding = 64) => {
    if (coordinates.length === 0) return;
    let west = coordinates[0].lng;
    let east = coordinates[0].lng;
    let south = coordinates[0].lat;
    let north = coordinates[0].lat;
    for (const c of coordinates) {
      west = Math.min(west, c.lng);
      east = Math.max(east, c.lng);
      south = Math.min(south, c.lat);
      north = Math.max(north, c.lat);
    }
    // Degenerate / near-degenerate — fitBounds on a sub-metre box NaN/over-zooms
    // MapLibre native (hard crash on Android). Once the two points are within a
    // few metres (~5e-5° ≈ 5 m) just centre between them instead.
    const EPSILON_DEG = 5e-5;
    if (east - west < EPSILON_DEG && north - south < EPSILON_DEG) {
      cameraRef.current?.flyTo({
        center: [(west + east) / 2, (south + north) / 2],
        zoom: DEFAULT_ZOOM,
        duration: 600,
      });
      return;
    }
    cameraRef.current?.fitBounds([west, south, east, north], {
      padding: { top: padding, right: padding, bottom: padding, left: padding },
      duration: 600,
    });
  }, []);

  const setMarkersImpl = useCallback((next: MapMarker[]) => {
    setMarkers(next);
  }, []);

  const getCenter = useCallback((): Coordinate | null => {
    return centerRef.current;
  }, []);

  const setMapStyle = useCallback((key: MapStyleChoice) => {
    if (!STYLE_OPTIONS.some(s => s.key === key)) return;
    setStyleChoice(key);
    // Persist the choice verbatim — `auto` stays `auto`. See nightStyle for why
    // resolving before writing would quietly destroy the preference.
    persistMapStyle(key);
  }, []);

  // Resolved at render, against the map's own centre: a couple of hundred
  // kilometres of error moves sunset by minutes, so the tracked centre is a
  // perfectly good stand-in for the device's position and costs no extra
  // permission or subscription.
  const renderedStyleKey = useMemo<MapStyleKey>(
    () => resolveMapStyle(styleChoice, centerRef.current),
    // `sunTick` is the dependency that matters — it is what re-runs this after
    // the clock has moved. eslint can't see that, hence the explicit list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [styleChoice, sunTick],
  );

  const activeStyle = STYLE_SOURCES[renderedStyleKey];

  // Viewport bounds are pushed to subscribers (the fog layer) through a ref
  // rather than state: putting them in state would change `MaplibreView`'s memo
  // deps on every pan and remount the native map.
  const viewRef = useRef<FogView | null>(null);
  const viewListenersRef = useRef(new Set<(v: FogView) => void>());

  const subscribeBounds = useCallback<BoundsSubscribe>(listener => {
    viewListenersRef.current.add(listener);
    if (viewRef.current) listener(viewRef.current);
    return () => {
      viewListenersRef.current.delete(listener);
    };
  }, []);

  const onRegionDidChange = useCallback(
    (e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const [lng, lat] = e.nativeEvent.center;
      centerRef.current = { lat, lng };

      const bounds = e.nativeEvent.bounds;
      if (!bounds) return;
      const [west, south, east, north] = bounds;
      const next = { west, south, east, north };
      viewRef.current = next;
      for (const listener of viewListenersRef.current) listener(next);
    },
    [],
  );

  // Stable element identity, so adding fog never re-creates MaplibreView.
  const fogLayer = useMemo(
    () => (fog ? <FogLayer subscribeBounds={subscribeBounds} /> : null),
    [fog, subscribeBounds],
  );

  const MaplibreView = useCallback(
    ({ style: viewStyle, children }: { style?: object; children?: React.ReactNode }) => (
      <Map
        ref={mapRef}
        style={[styles.map, viewStyle]}
        mapStyle={activeStyle as never}
        androidView={embedded ? 'texture' : 'surface'}
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
            zoom: initialZoomRef.current,
          }}
        />
        {/* Under the markers: pins and the user dot stay legible through fog. */}
        {fogLayer}
        {children}
      </Map>
    ),
    [activeStyle, onRegionDidChange, fogLayer, embedded],
  );

  // Stable identity so consumer effects keyed on the adapter don't re-run every
  // render (the callbacks themselves are already memoized).
  const adapter: MapAdapter = useMemo(
    () => ({ flyTo, fitBounds, setMarkers: setMarkersImpl, getCenter }),
    [flyTo, fitBounds, setMarkersImpl, getCenter],
  );

  return {
    adapter,
    markers,
    MaplibreView,
    activeStyleKey: styleChoice,
    renderedStyleKey,
    setMapStyle,
    styleOptions: STYLE_OPTIONS,
  };
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
