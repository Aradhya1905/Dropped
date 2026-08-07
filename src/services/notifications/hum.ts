/**
 * hum — the only way a walk-by notification reaches the OS.
 *
 * `gate.shouldNotify` is the decision; this is the wiring around it: read the
 * user's levers from storage, ask the gate, and only then touch the adapter.
 * Nothing else in the app may call `notifications.notifyNearbySecret` directly
 * — that is the whole point of routing through one function, and it is cheap to
 * hold to because this ships *before* the first caller exists (the walk engine,
 * FUN_TODOs/16).
 *
 * Returns the verdict rather than a boolean so a caller (or a dev build) can
 * say which lever swallowed the hum.
 */
import type { Coordinate, Mood } from '../../types';
import { isInsideAnyZone } from '../location/privacyZones';
import {
  getHumLastFiredAt,
  getPrivacyZones,
  getNotificationMode,
  getNotifyRadiusM,
  getOnlyWhenMoving,
  getQuietHours,
  getSubscribedMoods,
  setHumLastFiredAt,
} from '../storage';
import { notifications } from './active';
import { minutesOfDay, shouldNotify, type GateVerdict } from './gate';
import type { NearbyNotification } from './types';

/** A sensed drop, plus the one fact the gate can't read off disk. */
export interface HumRequest extends NearbyNotification {
  mood: Mood;
  /** From `services/location/movement.isSustainedMovement`. */
  isMoving: boolean;
  /**
   * Where the walker is. Used for one thing only — asking whether they're
   * inside a privacy zone — and never sent anywhere. Omit it and the hum is
   * suppressed: a caller that can't say where you are can't prove you aren't
   * home, and this gate has to fail closed.
   */
  at?: Coordinate;
  /** ms epoch; injectable for tests. */
  now?: number;
}

/**
 * Hum about a nearby secret — if every lever agrees. The cooldown clock is
 * stamped only when one actually fires, so a hum suppressed by quiet hours
 * doesn't spend the user's next few hours of eligibility.
 */
export async function humNearbySecret(req: HumRequest): Promise<GateVerdict> {
  const now = req.now ?? Date.now();
  const zones = getPrivacyZones();
  const verdict = shouldNotify({
    // No coordinate = treat as inside. The only caller that legitimately has no
    // fix is one that also has no business humming about a distance it measured
    // from somewhere.
    inPrivacyZone: zones.length > 0 && (!req.at || isInsideAnyZone(req.at, zones)),
    mode: getNotificationMode(),
    onlyWhenMoving: getOnlyWhenMoving(),
    isMoving: req.isMoving,
    quietHours: getQuietHours(),
    nowMin: minutesOfDay(now),
    distanceM: req.distanceM,
    notifyRadiusM: getNotifyRadiusM(),
    subscribedMoods: getSubscribedMoods(),
    dropMood: req.mood,
    lastFiredAt: getHumLastFiredAt(),
    now,
  });

  if (verdict !== 'fire') {
    return verdict;
  }

  await notifications.notifyNearbySecret({
    secretId: req.secretId,
    distanceM: req.distanceM,
    near: req.near,
  });
  setHumLastFiredAt(now);
  return verdict;
}
