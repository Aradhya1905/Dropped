import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Coordinate } from '../../types';
import {
  getCurrent,
  hasPermission,
  requestPermission,
  shouldRecordFix,
  watch,
  type PermissionStatus,
} from './index';
import { useReverseGeocode } from '../maps';
import { addWalkedCells, onBatteryModeChange } from '../storage';
import { cellIdFor } from '../../utils/geo';

/**
 * Fog cells are only recorded from fixes at least this precise (meters). A
 * coarse fix would smear the cleared path across streets the user never walked,
 * and the trail is permanent — better to miss a block than to paint a lie.
 */
const FOG_ACCURACY_MAX_M = 25;

/** Flush buffered cells after this many fixes… */
const FOG_FLUSH_EVERY_FIXES = 10;
/** …or this long, whichever comes first — so a slow walk still persists. */
const FOG_FLUSH_EVERY_MS = 15_000;

export type LocationStatus = PermissionStatus | 'unknown';

export interface UseDeviceLocationResult {
  status: LocationStatus;
  coord: Coordinate | null;
  shortAddress: string | null;
  city: string | null;
  fixing: boolean;
  request: () => Promise<PermissionStatus>;
  refresh: () => Promise<void>;
}

const LocationContext = createContext<UseDeviceLocationResult>({
  status: 'unknown',
  coord: null,
  shortAddress: null,
  city: null,
  fixing: false,
  request: async () => 'denied',
  refresh: async () => {},
});

function useLocationImpl(): UseDeviceLocationResult {
  const [status, setStatus] = useState<LocationStatus>('unknown');
  const [coord, setCoord] = useState<Coordinate | null>(null);
  const [fixing, setFixing] = useState(false);

  const stopWatchRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const refetchGeocodeRef = useRef<(() => void) | null>(null);

  // Fog-of-war capture buffer. Batched so a walk isn't one MMKV write per
  // second; see FUN_TODOs/01-fog-of-war.md. Foreground only — the watch lives
  // in the React tree, so nothing is recorded while the app is closed.
  const cellBufferRef = useRef<string[]>([]);
  const lastFlushRef = useRef(Date.now());

  const flushCells = useCallback(() => {
    if (cellBufferRef.current.length === 0) return;
    addWalkedCells(cellBufferRef.current);
    cellBufferRef.current = [];
    lastFlushRef.current = Date.now();
  }, []);

  const recordCell = useCallback(
    (coordinate: Coordinate, accuracy: number) => {
      if (!shouldRecordFix(accuracy, FOG_ACCURACY_MAX_M)) return;
      const id = cellIdFor(coordinate);
      // Standing still re-emits the same cell — don't buffer it repeatedly.
      const buffer = cellBufferRef.current;
      if (buffer[buffer.length - 1] !== id) buffer.push(id);
      if (
        buffer.length >= FOG_FLUSH_EVERY_FIXES ||
        Date.now() - lastFlushRef.current >= FOG_FLUSH_EVERY_MS
      ) {
        flushCells();
      }
    },
    [flushCells],
  );

  const { address, refetch: refetchGeocode } = useReverseGeocode(coord, { debounceMs: 800 });
  refetchGeocodeRef.current = refetchGeocode;

  const startWatch = useCallback(() => {
    stopWatchRef.current?.();
    setFixing(true);
    stopWatchRef.current = watch(
      fix => {
        if (!mountedRef.current) return;
        recordCell(fix.coordinate, fix.accuracy);
        setCoord(fix.coordinate);
        setFixing(false);
      },
      () => {
        if (mountedRef.current) setFixing(false);
      },
    );
  }, [recordCell]);

  const request = useCallback(async (): Promise<PermissionStatus> => {
    const result = await requestPermission();
    if (!mountedRef.current) return result;
    setStatus(result);
    if (result === 'granted') startWatch();
    return result;
  }, [startWatch]);

  const refresh = useCallback(async () => {
    setFixing(true);
    try {
      const next = await getCurrent();
      if (mountedRef.current) {
        setCoord(next);
        refetchGeocodeRef.current?.();
      }
    } catch {
      // leave last-known coord in place
    } finally {
      if (mountedRef.current) setFixing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopWatchRef.current?.();
      stopWatchRef.current = null;
      // Don't lose the tail of a walk that ended under the batch threshold.
      flushCells();
    };
  }, [flushCells]);

  // The provider outlives every screen, so its unmount cleanup may never run on
  // a force-stop. Persist the buffered cells the moment we lose the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') flushCells();
    });
    return () => sub.remove();
  }, [flushCells]);

  // Battery mode changes the watch's accuracy class and distance filter, and
  // the SDK fixes both at `watchPosition` time — so applying a flip means
  // tearing the watch down and starting a fresh one. Only while we actually
  // have a watch running: restarting one that was never started would prompt.
  useEffect(() => {
    const sub = onBatteryModeChange(() => {
      if (mountedRef.current && stopWatchRef.current) startWatch();
    });
    return () => sub.remove();
  }, [startWatch]);

  // Onboarding grants OS permission but lives on a different screen; once we're
  // back in the app, start the live watch immediately if permission is already
  // held — no prompt — so the dot streams without waiting on any screen to ask.
  useEffect(() => {
    let cancelled = false;
    hasPermission().then(granted => {
      if (cancelled || !mountedRef.current || !granted) return;
      setStatus('granted');
      startWatch();
    });
    return () => {
      cancelled = true;
    };
  }, [startWatch]);

  return {
    status,
    coord,
    shortAddress: address?.shortAddress ?? null,
    city: address?.parts.city ?? null,
    fixing,
    request,
    refresh,
  };
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const value = useLocationImpl();
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useDeviceLocation(): UseDeviceLocationResult {
  return useContext(LocationContext);
}
