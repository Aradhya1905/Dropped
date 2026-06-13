import type { Coordinate } from '../../types';

/** A "quiet hum" nudge when an undiscovered secret is sensed nearby. */
export interface NearbyNotification {
  secretId: string;
  /** Approx distance to the drop, meters (for the body copy). */
  distanceM: number;
  /** Where the walker was when sensed (not the drop's exact coordinate). */
  near: Coordinate;
}

/**
 * Provider-agnostic local-notification surface. A concrete impl (notifee /
 * react-native-push-notification) sits behind this so features never import a
 * vendor SDK directly.
 */
export interface NotificationAdapter {
  /** Ask for OS notification permission. Resolves true if granted. */
  requestPermission(): Promise<boolean>;
  /** Fire the "quiet hum" nudge for a nearby undiscovered secret. */
  notifyNearbySecret(n: NearbyNotification): Promise<void>;
  /** Clear any scheduled/visible notifications. */
  cancelAll(): Promise<void>;
}
