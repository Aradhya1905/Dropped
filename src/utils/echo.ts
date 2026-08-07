/**
 * echo — when the app is allowed to ask "did anything happen here a year ago?"
 *
 * `/drops/echoes` is location-keyed and gets called from a GPS watch, which is
 * the easiest way in this app to build a battery drain and a chatty client at
 * once. So the rule is deliberately blunt, and it lives here, pure, where it can
 * be tested without a network or a phone:
 *
 * **Ask once per calendar day, and again only after moving 250 m.**
 *
 * A walk around the block re-crosses the same corner dozens of times and must
 * cost nothing. Crossing town is a different place and deserves a look. The
 * distance is measured from the point of the *last check*, not from a grid cell,
 * so a 50 m step can never be a new check just by landing on the far side of a
 * boundary.
 */
import type { Coordinate } from '../types';
import { haversineMeters } from './geo';

/** How far you must move before the app asks again. */
export const ECHO_MIN_MOVE_M = 250;

/** Where and when the app last asked. Persisted — see `services/storage`. */
export interface EchoCheckpoint {
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string;
  lat: number;
  lng: number;
}

/**
 * The local calendar day, as the key the checkpoint is compared against.
 *
 * Local rather than UTC on purpose: "once a day" should mean once per day as
 * the person walking around experiences it, not one that rolls over at 5:30am
 * because of where the prime meridian is.
 */
export function dayKey(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Whether to call the endpoint now. True when the app has never asked, when the
 * day has turned over, or when the device has moved more than
 * {@link ECHO_MIN_MOVE_M} since the last ask.
 */
export function echoCheckDue(
  last: EchoCheckpoint | null,
  coord: Coordinate,
  day: string = dayKey(),
  minMoveMeters: number = ECHO_MIN_MOVE_M,
): boolean {
  if (last === null) return true;
  if (last.day !== day) return true;
  return haversineMeters({ lat: last.lat, lng: last.lng }, coord) > minMoveMeters;
}
