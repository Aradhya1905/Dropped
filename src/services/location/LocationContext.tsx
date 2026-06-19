import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type { Coordinate } from '../../types';
import {
  getCurrent,
  hasPermission,
  requestPermission,
  watch,
  type PermissionStatus,
} from './index';
import { useReverseGeocode } from '../maps';

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

  const { address, refetch: refetchGeocode } = useReverseGeocode(coord, { debounceMs: 800 });
  refetchGeocodeRef.current = refetchGeocode;

  const startWatch = useCallback(() => {
    stopWatchRef.current?.();
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
    };
  }, []);

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
