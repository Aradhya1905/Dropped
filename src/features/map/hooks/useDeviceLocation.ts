/**
 * useDeviceLocation — one hook owning the device's location lifecycle:
 * permission, a live position watch, and the reverse-geocoded address.
 *
 * Goes through the `services/location` adapter (the only module that touches
 * the GPS SDK) and `services/maps` for the address — features never import a
 * vendor SDK directly.
 *
 *   const { status, coord, shortAddress, fixing, request, refresh } =
 *     useDeviceLocation();
 *   // request()  → ask permission, then start watching
 *   // refresh()  → one-shot re-fix (e.g. a "recenter" tap)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coordinate } from '../../../types';
import {
  getCurrent,
  requestPermission,
  watch,
  type PermissionStatus,
} from '../../../services/location';
import { useReverseGeocode } from '../../../services/maps';

/** 'unknown' before we've asked; otherwise the OS permission outcome. */
export type LocationStatus = PermissionStatus | 'unknown';

export interface UseDeviceLocationResult {
  status: LocationStatus;
  coord: Coordinate | null;
  /** Resolved street/area line, e.g. "Bedford Ave, Williamsburg". */
  shortAddress: string | null;
  /** True while a one-shot fix or the first watch fix is pending. */
  fixing: boolean;
  /** Ask for permission; on grant, start watching. Returns the outcome. */
  request: () => Promise<PermissionStatus>;
  /** One-shot re-fix without re-prompting. */
  refresh: () => Promise<void>;
}

export function useDeviceLocation(): UseDeviceLocationResult {
  const [status, setStatus] = useState<LocationStatus>('unknown');
  const [coord, setCoord] = useState<Coordinate | null>(null);
  const [fixing, setFixing] = useState(false);

  // Active watch teardown; cleared on stop / unmount.
  const stopWatchRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  const { address } = useReverseGeocode(coord, { debounceMs: 800 });

  const startWatch = useCallback(() => {
    stopWatchRef.current?.(); // never stack two watches
    setFixing(true);
    stopWatchRef.current = watch(
      next => {
        if (!mountedRef.current) return;
        setCoord(next);
        setFixing(false);
      },
      () => {
        if (mountedRef.current) setFixing(false);
      },
    );
  }, []);

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
      if (mountedRef.current) setCoord(next);
    } catch {
      // swallow — a failed fix just leaves the last-known coord in place
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
    };
  }, []);

  return {
    status,
    coord,
    shortAddress: address?.shortAddress ?? null,
    fixing,
    request,
    refresh,
  };
}
