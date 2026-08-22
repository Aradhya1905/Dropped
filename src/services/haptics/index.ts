/**
 * haptics — the only module that touches the vibration API.
 *
 * Named after moments in the core loop, not durations, so screens ask for
 * "the seal cracked" rather than "vibrate 40ms". Built on React Native's
 * built-in `Vibration` (no extra dependency); Android honours the patterns,
 * iOS collapses them to its single system buzz.
 */
import { Vibration } from 'react-native';

import { getHapticsEnabled } from '../storage';

function buzz(pattern: number | number[]): void {
  if (!getHapticsEnabled()) return;
  try {
    Vibration.vibrate(pattern);
  } catch {
    // A device with no vibrator must never take a screen down with it.
  }
}

/** A light acknowledgement — toggles, chips, selections. */
export const tap = () => buzz(12);

/** The wax cracking open: two beats, the second heavier. */
export const sealBreak = () => buzz([0, 24, 60, 70]);

/** Crossing into the 50 m unlock zone — the "you're warm" moment. */
export const crossedIntoRange = () => buzz([0, 18, 90, 18]);

/** A secret has been committed to a spot, for good. */
export const dropped = () => buzz([0, 45, 70, 25]);

/** Something failed and the screen is about to say so. */
export const failed = () => buzz([0, 18, 80, 18, 80, 18]);

/** Stop anything still running (screen teardown). */
export const cancel = () => {
  try {
    Vibration.cancel();
  } catch {
    /* no vibrator */
  }
};
