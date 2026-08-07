export type { NotificationAdapter, NearbyNotification } from './types';
export { noopAdapter } from './noopAdapter';
export { notifeeAdapter } from './notifeeAdapter';

/** The active adapter. Features schedule nothing through it directly — see below. */
export { notifications } from './active';

/**
 * The gate, and the one function allowed to fire a walk-by hum. Anything that
 * wants to notify goes through `humNearbySecret`; `shouldNotify` is exported
 * for tests and for surfacing "why was I not notified" in dev builds.
 */
export {
  ALWAYS_COOLDOWN_MS,
  RARE_COOLDOWN_MS,
  cooldownFor,
  inQuietHours,
  minutesOfDay,
  shouldNotify,
} from './gate';
export type { GateInput, GateVerdict } from './gate';
export { humNearbySecret } from './hum';
export type { HumRequest } from './hum';
