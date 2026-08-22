/**
 * locationStore — the app's single source of truth for "where am I".
 *
 * Before this store every screen called `useDeviceLocation()` and got its own
 * permission state, its own GPS watch and its own reverse-geocode request, so
 * screens that never explicitly warmed their instance (Opening, SecretDetail,
 * Walk) sat at `coord === null` forever. One store, one watch, one address
 * lookup — every screen reads the same fix.
 *
 * Talks to `services/location` (GPS) and `services/maps` (address) only; those
 * remain the modules that touch the vendor SDKs.
 */
import { create } from 'zustand';

import type { Coordinate } from '../types';
import {
  checkPermission,
  getCurrent,
  requestPermission,
  watch,
  type PermissionStatus,
} from '../services/location';
import { getAddressFromCoords } from '../services/maps/reverseGeocode';
import { getLastCoord, setLastCoord } from '../services/storage';

/** 'unknown' before we've asked; otherwise the OS permission outcome. */
export type LocationStatus = PermissionStatus | 'unknown';

interface LocationState {
  status: LocationStatus;
  /** Best known position: a live fix, or the persisted last-known one at boot. */
  coord: Coordinate | null;
  /** True once `coord` came from this session's GPS (not the persisted cache). */
  live: boolean;
  shortAddress: string | null;
  city: string | null;
  /** True while a one-shot fix or the first watch fix is pending. */
  fixing: boolean;
  /** ms epoch of the last live fix. */
  lastFixAt: number | null;

  /** Ask for permission; on grant, start watching. Returns the outcome. */
  request: () => Promise<PermissionStatus>;
  /** One-shot re-fix without re-prompting. */
  refresh: () => Promise<void>;
  /** Start the shared watch if permission is already granted. Idempotent. */
  ensureWatching: () => void;
  /** Stop the shared watch (app backgrounded / tests). */
  stopWatching: () => void;
}

// --- module-level singletons (never per-component) ---------------------------

let stopWatch: (() => void) | null = null;
let geocodeTimer: ReturnType<typeof setTimeout> | null = null;
let geocodedKey: string | null = null;

/** ~11 m of precision — jitter in one spot must not re-geocode. */
const addressKey = (c: Coordinate) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;

const GEOCODE_DEBOUNCE_MS = 800;

export const useLocationStore = create<LocationState>((set, get) => {
  /** Apply a fresh fix: store it, persist it, and refresh the address. */
  const applyFix = (next: Coordinate, { force = false } = {}) => {
    set({ coord: next, live: true, fixing: false, lastFixAt: Date.now() });
    setLastCoord(next);
    resolveAddress(next, force);
  };

  const resolveAddress = (coord: Coordinate, force: boolean) => {
    const key = addressKey(coord);
    if (!force && key === geocodedKey) return;
    geocodedKey = key;
    if (geocodeTimer) clearTimeout(geocodeTimer);
    geocodeTimer = setTimeout(() => {
      getAddressFromCoords(coord)
        .then(address => {
          // Ignore a response the user has already walked away from.
          if (addressKey(get().coord ?? coord) !== key) return;
          set({ shortAddress: address.shortAddress, city: address.parts.city ?? null });
        })
        .catch(() => {
          // Address is decoration — a failed lookup keeps the last label.
        });
    }, GEOCODE_DEBOUNCE_MS);
  };

  return {
    status: 'unknown',
    // Seed from the persisted last-known fix so a cold start can render a map
    // instead of an indefinite loader.
    coord: getLastCoord(),
    live: false,
    shortAddress: null,
    city: null,
    fixing: false,
    lastFixAt: null,

    async request() {
      const result = await requestPermission();
      set({ status: result });
      if (result === 'granted') get().ensureWatching();
      return result;
    },

    async refresh() {
      set({ fixing: true });
      try {
        applyFix(await getCurrent(), { force: true });
      } catch {
        // A failed fix leaves the last-known coord in place.
        set({ fixing: false });
      }
    },

    ensureWatching() {
      if (stopWatch) return;
      set({ fixing: true });
      stopWatch = watch(
        next => applyFix(next),
        () => set({ fixing: false }),
      );
    },

    stopWatching() {
      stopWatch?.();
      stopWatch = null;
    },
  };
});

/**
 * Called once at app start. Reads the standing permission *without* prompting
 * (someone who chose "Not now" during onboarding must not be re-asked just for
 * opening the app) and starts the shared watch when it's already granted.
 */
export async function bootstrapLocation(): Promise<void> {
  const status = await checkPermission().catch(() => 'denied' as PermissionStatus);
  useLocationStore.setState({ status });
  if (status === 'granted') useLocationStore.getState().ensureWatching();
}
