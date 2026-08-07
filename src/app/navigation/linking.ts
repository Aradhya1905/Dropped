/**
 * Share-a-spot deep links — `dropped://d/<uuid>`.
 *
 * A link points at a *place*, never at a secret: opening one lands the
 * recipient on Walk-closer (screen 05) for that drop, and they still have to
 * walk within 50 m to read anything. The link carries an id and nothing else;
 * the body lives only behind a server-verified reveal.
 *
 * ## Why this is imperative rather than a React Navigation `linking` config
 *
 * `linking` resolves a URL into the container's *initial* navigation state,
 * which is wrong for this app in two ways:
 *
 * 1. It would skip onboarding. A fresh install has no location permission, so
 *    landing straight on a walk screen shows a compass pointing nowhere.
 * 2. It would leave SecretDetail as the only route on the stack, so Android
 *    back exits the app instead of falling into the map.
 *
 * So the URL is captured into a module-level ref (not React state — it has to
 * survive from before the tree mounts) and consumed at the app's own handoff
 * points, resetting to `[Main, SecretDetail]` so back always lands on the map.
 */
import { Linking, Share } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';

import { getOnboardingComplete } from '../../services/storage';
import type { RootStackParamList } from './types';

/** Custom scheme, registered in AndroidManifest.xml and Info.plist. */
export const SHARE_LINK_SCHEME = 'dropped';

/**
 * https origin for the shareable form. Empty until there is a real domain with
 * `.well-known/assetlinks.json` and a non-placeholder iOS bundle id — see the
 * plan. {@link parseSpotLink} already accepts the https shape, so turning it on
 * is a one-constant change plus the native App Links entries.
 */
export const SHARE_WEB_ORIGIN = '';

/** `dropped://d/<uuid>` or `https://<host>/d/<uuid>`, capturing the id. */
const SPOT_LINK_RE = new RegExp(
  `(?:^${SHARE_LINK_SCHEME}://|^https?://[^/]+/)d/([^/?#]+)`,
  'i',
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The link to hand someone. Always the id — never the body, never a coordinate. */
export function spotLink(dropId: string): string {
  return SHARE_WEB_ORIGIN
    ? `${SHARE_WEB_ORIGIN}/d/${dropId}`
    : `${SHARE_LINK_SCHEME}://d/${dropId}`;
}

/**
 * The drop id in a share URL, or `null` for anything else.
 *
 * The uuid check is not decoration: without it a malformed link would navigate
 * to SecretDetail with garbage and the screen would sit on a permanent
 * "locating…", which reads as a bug rather than as a bad link.
 */
export function parseSpotLink(url: string | null | undefined): string | null {
  if (!url) return null;
  const id = SPOT_LINK_RE.exec(url.trim())?.[1];
  return id && UUID_RE.test(id) ? id : null;
}

/**
 * Hand this place to someone. Lives here, next to {@link spotLink}, so the URL
 * shape and the sentence wrapped around it stay in one file — both the reveal
 * screen and the just-dropped screen call this rather than each assembling
 * their own message.
 *
 * The message names the place and never the secret. If the copy ever needs the
 * body to be tempting, that is the wrong instinct: the pull is supposed to be
 * "there is something here", not the confession itself.
 */
export async function shareSpot(
  dropId: string,
  placeLabel?: string,
): Promise<void> {
  const where = placeLabel ? `at ${placeLabel}` : 'somewhere in the city';
  try {
    await Share.share({
      message:
        `Someone left a secret ${where}. ` +
        `You have to go stand on it to read it.\n\n${spotLink(dropId)}`,
    });
  } catch {
    // A failed or dismissed share sheet is not worth interrupting anyone over.
  }
}

// --- the pending link ---------------------------------------------------------

/**
 * Module-level, deliberately: a cold-start URL arrives before any component
 * mounts, so React state cannot hold it.
 */
let pendingSpotId: string | null = null;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Park a link until the app is somewhere it can sensibly be opened. */
export function rememberPendingSpot(dropId: string): void {
  pendingSpotId = dropId;
}

/** Read without consuming — for tests and for debugging a cold start. */
export function peekPendingSpot(): string | null {
  return pendingSpotId;
}

/** Drop a parked link without navigating (onboarding restart, sign-out-ish wipes). */
export function clearPendingSpot(): void {
  pendingSpotId = null;
}

/** Jump to a spot with the map underneath, so back lands on the map. */
function openSpot(dropId: string): void {
  navigationRef.reset({
    index: 1,
    routes: [{ name: 'Main' }, { name: 'SecretDetail', params: { secretId: dropId } }],
  });
}

/**
 * Navigate to a parked link if the app is ready for it, and clear it.
 *
 * Returns whether it navigated, so a caller that owns a handoff (Splash's
 * intro, the last onboarding screen) can skip its own `reset` instead of
 * racing this one. The link is cleared only on success — an early call while
 * onboarding is unfinished parks it for the next handoff rather than losing it.
 */
export function consumePendingSpot(): boolean {
  if (!pendingSpotId) return false;
  if (!getOnboardingComplete()) return false;
  if (!navigationRef.isReady()) return false;

  const id = pendingSpotId;
  pendingSpotId = null;
  openSpot(id);
  return true;
}

/**
 * Start listening for share links. Call once, from the app shell.
 *
 * Handles the cold start (`getInitialURL`) and every warm tap (`url` event)
 * through the same park-then-consume path, so a link opened twice in a row
 * resets to the same two-route stack rather than stacking screens.
 */
export function startSpotLinks(): () => void {
  const handle = (url: string | null): void => {
    const id = parseSpotLink(url);
    if (!id) return;
    rememberPendingSpot(id);

    // While the splash intro is still playing it owns the next navigation —
    // consuming here would be undone by its own reset a moment later. It calls
    // consumePendingSpot() itself at the end of the intro.
    if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'Splash') {
      return;
    }
    consumePendingSpot();
  };

  Linking.getInitialURL()
    .then(handle)
    .catch(() => {});
  const sub = Linking.addEventListener('url', ({ url }) => handle(url));
  return () => sub.remove();
}
