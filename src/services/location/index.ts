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

/** Normalized permission outcome across iOS/Android. */
export type PermissionStatus = 'granted' | 'denied' | 'blocked';

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  accuracy: { android: 'high', ios: 'best' },
} as const;

/** RN position → our Coordinate, at the SDK boundary. */
const toCoordinate = (p: GeoPosition): Coordinate => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
});

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

/** One-shot current position. Rejects with the SDK's GeoError on failure. */
export function getCurrent(): Promise<Coordinate> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      p => resolve(toCoordinate(p)),
      err => reject(err),
      { ...GEO_OPTIONS, timeout: 15000, maximumAge: 10000 },
    );
  });
}

/**
 * Continuously watch position. Calls `onCoordinate` on each fix; returns an
 * unsubscribe that clears the watch. `onError` is optional.
 */
export function watch(
  onCoordinate: (c: Coordinate) => void,
  onError?: (e: unknown) => void,
): () => void {
  const id = Geolocation.watchPosition(
    p => onCoordinate(toCoordinate(p)),
    err => onError?.(err),
    { ...GEO_OPTIONS, distanceFilter: 5 },
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
