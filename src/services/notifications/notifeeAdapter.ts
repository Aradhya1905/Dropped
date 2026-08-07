/**
 * notifeeAdapter — the only module that touches @notifee/react-native. Powers
 * the "quiet hum": a local notification when the GPS watch senses an
 * undiscovered secret nearby. Provider-agnostic via NotificationAdapter so
 * features never import notifee directly.
 */
import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
} from '@notifee/react-native';

import type { NearbyNotification, NotificationAdapter } from './types';

/** Android requires a channel; created lazily before the first display. */
const CHANNEL_ID = 'nearby-secrets';
const CHANNEL_NAME = 'Nearby secrets';

/**
 * The walk engine's foreground service lives on its own channel so someone can
 * silence the persistent "watching" notification without also silencing the
 * hums — on Android the two are separate settings, and conflating them would
 * mean the only way to hide the service notification is to lose the feature.
 */
const WALK_CHANNEL_ID = 'walk-engine';
const WALK_CHANNEL_NAME = 'Watching for secrets';

/** Notification id of the foreground service. Exported for the background handler. */
export const WALK_SERVICE_NOTIFICATION_ID = 'walk-engine';

let channelReady: Promise<string> | null = null;
let walkChannelReady: Promise<string> | null = null;

function ensureChannel(): Promise<string> {
  if (!channelReady) {
    channelReady = notifee.createChannel({
      id: CHANNEL_ID,
      name: CHANNEL_NAME,
      // "Quiet hum" — present but unobtrusive: no heads-up, no loud sound.
      importance: AndroidImportance.LOW,
    });
  }
  return channelReady;
}

function ensureWalkChannel(): Promise<string> {
  if (!walkChannelReady) {
    walkChannelReady = notifee.createChannel({
      id: WALK_CHANNEL_ID,
      name: WALK_CHANNEL_NAME,
      // MIN keeps it out of the shade's top section — it's a legal requirement
      // and an honesty signal, not something to interrupt anyone with.
      importance: AndroidImportance.MIN,
    });
  }
  return walkChannelReady;
}

/** The drop id carried by a hum, if this notification is one. */
function secretIdOf(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as { secretId?: unknown }).secretId;
  return typeof id === 'string' ? id : null;
}

/** Round to a friendly "X m away" figure for the body copy. */
function metersLabel(m: number): string {
  return `${Math.round(m / 10) * 10} m away`;
}

export const notifeeAdapter: NotificationAdapter = {
  async requestPermission(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  },

  async notifyNearbySecret(n: NearbyNotification): Promise<void> {
    await ensureChannel();
    await notifee.displayNotification({
      // Keyed by secret so the same nearby drop won't stack duplicates.
      id: `nearby-${n.secretId}`,
      title: 'A secret is near',
      body: `Someone left something ${metersLabel(n.distanceM)}. Walk closer to read it.`,
      data: { secretId: n.secretId },
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.LOW,
        pressAction: { id: 'default' },
      },
    });
  },

  async cancelAll(): Promise<void> {
    await notifee.cancelAllNotifications();
  },

  async startWalkService(): Promise<void> {
    // iOS keeps the app alive through UIBackgroundModes: location — there is
    // no service to start, and no notification to justify showing.
    if (Platform.OS !== 'android') return;
    await ensureWalkChannel();
    await notifee.displayNotification({
      id: WALK_SERVICE_NOTIFICATION_ID,
      title: 'Listening for secrets nearby',
      // Says what it costs, in the place someone will actually read it.
      body: 'Dropped is using your location in the background. Tap to turn this off.',
      data: { walkService: 'true' },
      android: {
        channelId: WALK_CHANNEL_ID,
        importance: AndroidImportance.MIN,
        asForegroundService: true,
        ongoing: true,
        // Not `autoCancel`: dismissing it would kill the service silently.
        pressAction: { id: 'default' },
      },
    });
  },

  async stopWalkService(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await notifee.stopForegroundService();
  },

  onNotificationPress(handler: (secretId: string) => void): () => void {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.PRESS) return;
      const id = secretIdOf(detail.notification?.data);
      if (id) handler(id);
    });
  },

  async getInitialSecretId(): Promise<string | null> {
    const initial = await notifee.getInitialNotification();
    return secretIdOf(initial?.notification?.data);
  },
};

/**
 * Register the foreground-service task and the background event handler.
 *
 * **Must be called from `index.js`, at module scope, before the app renders.**
 * Notifee dispatches both of these into a headless JS context that has no React
 * tree, so registering them from a component would mean they don't exist in the
 * one situation they're for — the app closed.
 *
 * The service task never resolves on purpose: notifee keeps the foreground
 * service alive exactly as long as the returned promise is pending, and the
 * whole point is to outlive the UI. `stopForegroundService()` is what ends it.
 */
export function registerWalkService(): void {
  if (Platform.OS !== 'android') return;

  notifee.registerForegroundService(
    () =>
      new Promise(() => {
        // Deliberately never resolves — see above.
      }),
  );

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    // A tap that arrives while the app is closed can't navigate — the tree
    // isn't mounted. notifee relaunches the app and the same notification comes
    // back through getInitialNotification(), which is where it gets handled.
    // Dismissing the service notification is the one thing worth acting on.
    if (
      type === EventType.DISMISSED &&
      detail.notification?.id === WALK_SERVICE_NOTIFICATION_ID
    ) {
      await notifee.stopForegroundService();
    }
  });
}
