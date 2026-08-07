/**
 * location — the only module that touches the GPS SDK. Wraps
 * `react-native-geolocation-service` and normalizes everything to our
 * `Coordinate {lat,lng}` shape and a single permission enum. Distance / unlock
 * math is delegated to `utils/geo` (the heart of the core loop).
 *
 * NOTE: this service only *requests* OS permission. The manifest strings
 * (ACCESS_FINE_LOCATION / NSLocationWhenInUseUsageDescription) still need to be
 * added in AndroidManifest.xml / Info.plist — see remaining-work §5; they can't
 * be set from here.
 */
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation, {
  type GeoPosition,
} from 'react-native-geolocation-service';

import type { Coordinate } from '../../types';
import { haversineMeters, isWithin } from '../../utils/geo';
import { REVEAL_RADIUS_M } from '../../types';
import { getBatteryMode } from '../storage';

/** Normalized permission outcome across iOS/Android. */
export type PermissionStatus = 'granted' | 'denied' | 'blocked';

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  accuracy: { android: 'high', ios: 'best' },
} as const;

/**
 * Battery mode: the same watch, asked for less.
 *
 * Not "GPS off" — fog of war and warmth haptics both ride this stream and the
 * app stops meaning anything without it. What changes is how often the radio
 * wakes up: a coarser accuracy class and a 25 m movement threshold instead of
 * 5 m, so a walk still records but standing still costs almost nothing. The
 * visible cost is a dot that catches up in longer steps.
 */
const BATTERY_GEO_OPTIONS = {
  enableHighAccuracy: false,
  accuracy: { android: 'balanced', ios: 'hundredMeters' },
} as const;

/** Metres of movement before the OS bothers to tell us, per mode. */
const DISTANCE_FILTER_M = 5;
const BATTERY_DISTANCE_FILTER_M = 25;

/**
 * The GPS cadence a watch would start with right now. Exported so the setting's
 * effect is assertable without a GPS mock.
 */
export function watchOptions(batteryMode: boolean = getBatteryMode()): {
  enableHighAccuracy: boolean;
  accuracy: { android: string; ios: string };
  distanceFilter: number;
} {
  return batteryMode
    ? { ...BATTERY_GEO_OPTIONS, distanceFilter: BATTERY_DISTANCE_FILTER_M }
    : { ...GEO_OPTIONS, distanceFilter: DISTANCE_FILTER_M };
}

/**
 * Reject fixes coarser than this (meters). A cold GPS often emits an early
 * network/cell fix with 1000m+ error before the satellites warm up; accepting
 * it shows the user the wrong spot. We hold out for a GPS-grade fix instead.
 */
const ACCURACY_FLOOR_M = 100;

/**
 * ...but never leave the user with nothing. If no fix beats the floor within
 * this window, accept the best one we've seen so the map can still center.
 */
const ACCURACY_GRACE_MS = 12_000;

/** RN position → our Coordinate, at the SDK boundary. */
const toCoordinate = (p: GeoPosition): Coordinate => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
});

/**
 * A watch fix: where we are, plus how much we trust it. Consumers that paint
 * something permanent from GPS (the fog-of-war trail) need the accuracy to
 * reject smeared fixes — `watch` only applies its own floor during cold-start
 * acquisition and streams everything after that, so the filtering has to happen
 * on the consumer side.
 */
export interface Fix {
  coordinate: Coordinate;
  /** Horizontal accuracy radius in meters. `Infinity` when the OS omits it. */
  accuracy: number;
}

const toFix = (p: GeoPosition): Fix => ({
  coordinate: toCoordinate(p),
  // Treat a missing accuracy as untrustworthy rather than perfect, so an
  // accuracy-gated consumer fails closed.
  accuracy: p.coords.accuracy ?? Number.POSITIVE_INFINITY,
});

/**
 * Whether a fix is precise enough to record permanently (fog cells). Pure and
 * exported so the threshold behaviour is testable without a GPS mock.
 */
export function shouldRecordFix(accuracy: number, max: number): boolean {
  return Number.isFinite(accuracy) && accuracy <= max;
}

/**
 * Ask for "while using the app" location permission. Maps both platforms'
 * results onto `granted | denied | blocked` ("blocked" = denied with
 * never-ask-again / Settings re-prompt required).
 */
export async function requestPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    switch (result) {
      case PermissionsAndroid.RESULTS.GRANTED:
        return 'granted';
      case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
        return 'blocked';
      default:
        return 'denied';
    }
  }

  const result = await Geolocation.requestAuthorization('whenInUse');
  switch (result) {
    case 'granted':
      return 'granted';
    case 'restricted':
    case 'disabled':
      return 'blocked';
    default:
      return 'denied';
  }
}

/**
 * Silent permission probe — never prompts. Used at app start to decide whether
 * the live watch can begin without re-asking (onboarding already granted it).
 * Android checks the OS grant directly; iOS has no silent check API, so we
 * optimistically return true and let the watch's `onError` no-op if not
 * authorized.
 */
export async function hasPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
  }
  return true;
}

/**
 * One-shot current position. Forces a fresh fix (`maximumAge: 0`, supported on
 * the one-shot API) so we never echo a stale cached location. Rejects with the
 * SDK's GeoError on failure.
 */
export function getCurrent(): Promise<Coordinate> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      p => resolve(toCoordinate(p)),
      err => reject(err),
      { ...GEO_OPTIONS, timeout: 15000, maximumAge: 0 },
    );
  });
}

/**
 * Continuously watch position. Calls `onFix` with the coordinate *and* its
 * accuracy on each fix; returns an unsubscribe that clears the watch.
 * `onError` is optional.
 */
export function watch(
  onFix: (f: Fix) => void,
  onError?: (e: unknown) => void,
): () => void {
  const startedAt = Date.now();
  let best: GeoPosition | null = null;
  // The accuracy floor is a *cold-start* gate only: it suppresses the junky
  // network/cell fix GPS emits before satellites warm up. Once we've delivered
  // a first fix we stream every subsequent one — a coarse fix at the user's new
  // position still tracks movement better than a precise fix frozen at the old
  // one (which is what pinned the dot in place before).
  let acquired = false;

  const id = Geolocation.watchPosition(
    p => {
      if (acquired) {
        onFix(toFix(p));
        return;
      }

      // Acquisition phase: track the most accurate fix seen so far.
      if (!best || p.coords.accuracy < best.coords.accuracy) best = p;

      const accurate = p.coords.accuracy <= ACCURACY_FLOOR_M;
      const graceExpired = Date.now() - startedAt >= ACCURACY_GRACE_MS;

      if (accurate) {
        acquired = true;
        onFix(toFix(p));
      } else if (graceExpired && best) {
        // No GPS-grade fix arrived in time; surface the best we got, then start
        // streaming so the dot keeps up even where accuracy stays coarse.
        acquired = true;
        onFix(toFix(best));
      }
      // else: coarse early fix, still within grace — wait for a better one.
    },
    err => onError?.(err),
    // Read once, here: the SDK bakes these in at `watchPosition` time, so a
    // later flip of battery mode can only take effect by restarting the watch
    // (which `LocationContext` does, via `onBatteryModeChange`).
    watchOptions() as never,
  );
  return () => Geolocation.clearWatch(id);
}

// --- distance / unlock (delegates to utils/geo) ------------------------------

/** Meters between the walker (`from`) and a drop. */
export function distanceTo(drop: Coordinate, from: Coordinate): number {
  return haversineMeters(from, drop);
}

/** Whether the walker is inside the unlock radius of a drop (default 50 m). */
export function isWithinDrop(
  drop: Coordinate,
  from: Coordinate,
  meters: number = REVEAL_RADIUS_M,
): boolean {
  return isWithin(from, drop, meters);
}
