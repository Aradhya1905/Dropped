/**
 * Fog of war — the map starts covered in unopened paper and the streets the
 * user has physically walked stay cleared, permanently. Rendered as one
 * MapLibre fill layer whose polygon is the world with the walked cells punched
 * out as holes (see `fog.ts` for the geometry).
 *
 * Foreground only: cells are recorded by the GPS watch in `LocationContext`,
 * which lives in the React tree. Nothing is painted while the app is closed —
 * copy that surfaces this must not imply otherwise.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { colors } from '../../design-system/tokens';
import { getWalkedCells, onWalkedCellsChange } from '../storage';
import { cellsToRects, fogFeature, padView, type FogView } from './fog';

/**
 * Colour of unwalked ground. A dulled, slightly cool paper — the design is
 * paper/ink/sage, so fog reads as an unopened page, never as video-game black.
 */
const FOG_COLOR = colors.paperDeep;
const FOG_OPACITY = 0.88;

/** Repaint at most this often while panning. */
const REGION_DEBOUNCE_MS = 120;

/** Draw a margin of off-screen cells so a small pan doesn't flash bare fog. */
const VIEW_PAD_FACTOR = 0.35;

export type BoundsSubscribe = (listener: (view: FogView) => void) => () => void;

export interface FogLayerProps {
  /** Pushes the map's visible bounds; supplied by the MapLibre adapter. */
  subscribeBounds: BoundsSubscribe;
}

export function FogLayer({ subscribeBounds }: FogLayerProps) {
  const [view, setView] = useState<FogView | null>(null);
  const [cells, setCells] = useState<Set<string>>(() => getWalkedCells());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Viewport, debounced — panning fires this continuously.
  useEffect(() => {
    const unsubscribe = subscribeBounds(next => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setView(next), REGION_DEBOUNCE_MS);
    });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubscribe();
    };
  }, [subscribeBounds]);

  // The walked set grows while the user stands still and the map never moves,
  // so the layer has to follow storage, not only the viewport.
  useEffect(() => {
    const sub = onWalkedCellsChange(() => setCells(getWalkedCells()));
    return () => sub.remove();
  }, []);

  const feature = useMemo(
    () => fogFeature(cellsToRects(cells, view ? padView(view, VIEW_PAD_FACTOR) : null)),
    [cells, view],
  );

  return (
    <GeoJSONSource id="fog-of-war" data={feature as never}>
      <Layer
        id="fog-of-war-fill"
        type="fill"
        paint={{
          'fill-color': FOG_COLOR,
          'fill-opacity': FOG_OPACITY,
          // Adjacent cleared blocks share exact edges. With antialiasing on,
          // each side contributes partial coverage to the shared pixel and the
          // leftover reads as a hairline seam; off, the boundary is binary.
          'fill-antialias': false,
        }}
      />
    </GeoJSONSource>
  );
}
