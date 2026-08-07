/**
 * The "keep listening while the app is closed" opt-in, as the map screen sees
 * it.
 *
 * Two rules shape this hook, both from the Android permission model:
 *
 * - **Ask in context, never at onboarding.** "Allow all the time" cannot be
 *   bundled with the first location prompt; it is a second dialog, and a cold
 *   ask from someone who hasn't used the app yet gets denied.
 * - **Ask once.** A second denial is permanent — the OS stops showing the
 *   dialog at all — so a nagging prompt burns the feature rather than
 *   eventually winning it.
 *
 * So the offer waits until the walker has actually revealed something: they
 * have seen what a reveal is worth, which is the only argument this prompt has.
 */
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import {
  getBackgroundWalkAsked,
  getBackgroundWalkEnabled,
  getNotificationMode,
  getSeenIds,
  setBackgroundWalkAsked,
  setNotificationMode,
} from '../../../services/storage';
import { setBackgroundWalk } from '../../../services/walkEngine';

/** Reveals before the offer is worth making. One is enough to have felt it. */
const MIN_REVEALS = 1;

export interface UseBackgroundWalkResult {
  /** Whether the sheet should be on screen. */
  prompting: boolean;
  /** True while the OS dialog is up. */
  busy: boolean;
  /** True after a permanent denial — the copy has to point at Settings. */
  blocked: boolean;
  enabled: boolean;
  /** Accept: ask the OS, then start the engine. */
  enable: () => Promise<void>;
  /** "Not now" / backdrop. Never asked again from here. */
  dismiss: () => void;
}

export function useBackgroundWalk(): UseBackgroundWalkResult {
  const [prompting, setPrompting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [enabled, setEnabled] = useState(getBackgroundWalkEnabled);

  useEffect(() => {
    if (getBackgroundWalkAsked()) return;
    if (getBackgroundWalkEnabled()) return;
    if (getSeenIds().length < MIN_REVEALS) return;
    // Marked as asked the moment it is shown, not when it is answered: a
    // dismissed sheet has already spent the one ask we get.
    setBackgroundWalkAsked(true);
    setPrompting(true);
  }, []);

  const enable = useCallback(async () => {
    if (blocked) {
      // Nothing left to ask — Android has stopped showing the dialog.
      Linking.openSettings().catch(() => {});
      setPrompting(false);
      return;
    }

    setBusy(true);
    try {
      const result = await setBackgroundWalk(true);
      setEnabled(result.enabled);

      if (result.enabled && getNotificationMode() === 'off') {
        // Watching in the background with hums switched off would burn battery
        // to produce silence. `rare`, not `always`: the sheet the user just
        // agreed to promises "one quiet hum, at most", and turning an opt-in
        // into the loudest setting is how an app earns its notifications being
        // switched back off for good.
        setNotificationMode('rare');
      }

      if (result.permission === 'blocked') {
        // Stay on screen, repointed at Settings — this is the only route left.
        setBlocked(true);
      } else {
        setPrompting(false);
      }
    } finally {
      setBusy(false);
    }
  }, [blocked]);

  const dismiss = useCallback(() => setPrompting(false), []);

  return { prompting, busy, blocked, enabled, enable, dismiss };
}
