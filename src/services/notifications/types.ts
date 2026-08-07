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

  /**
   * Start the persistent notification that keeps the process alive while the
   * app is closed (Android foreground service; a no-op on iOS, where
   * `UIBackgroundModes` does the same job without a visible notification).
   *
   * Android will kill a backgrounded GPS watch without one of these, so this is
   * not decoration — it is the thing that makes the walk engine work. It is
   * also the user's only always-visible sign that the app is watching, which is
   * a feature, not a cost.
   */
  startWalkService(): Promise<void>;
  /** Stop it. Safe to call when it isn't running. */
  stopWalkService(): Promise<void>;

  /**
   * Called with a drop id when the user taps a hum. Returns an unsubscribe.
   *
   * Covers foreground taps only; a tap that launched the app from cold is
   * reported by {@link getInitialSecretId} instead, because the event fires
   * before any JS listener could exist.
   */
  onNotificationPress(handler: (secretId: string) => void): () => void;

  /**
   * The drop id of the notification that launched the app, if one did.
   * Resolves `null` on an ordinary launch. Consume once, at start-up.
   */
  getInitialSecretId(): Promise<string | null>;
}
