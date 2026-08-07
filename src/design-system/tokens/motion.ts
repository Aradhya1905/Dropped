/**
 * Motion tokens — whether the app is allowed to move, and when.
 *
 * Two separate questions, deliberately kept apart:
 *
 * - **Reduced motion** is an accessibility contract. When it is on, an ambient
 *   animation must render its *final static value*, not a slower version of
 *   itself. Slowing a loop down is still a loop, and a loop is the thing that
 *   makes some people ill.
 * - **Loop activity** is a performance concern: an off-screen or backgrounded
 *   `Animated.loop` keeps the JS thread and the frame timer busy for nothing.
 *
 * `useLoopsActive()` answers both at once, which is what almost every ambient
 * animation actually wants.
 */
import { useCallback, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

import {
  getReducedMotion,
  onReducedMotionChange,
} from '../../services/storage';

// ---------------------------------------------------------------------------
// Durations (kept here so "how long is a beat?" has one answer)
// ---------------------------------------------------------------------------

export const motion = {
  /** Entrance fades / rises. */
  entrance: 1000,
  /** One idle bob cycle. */
  bob: 9000,
  /** One sonar ring cycle. */
  ring: 4400,
  /** The reveal's held beat — how long a static reveal waits before the text. */
  revealBeat: 900,
} as const;

// ---------------------------------------------------------------------------
// The OS half
// ---------------------------------------------------------------------------

/**
 * Last known OS reduce-motion state, cached synchronously.
 *
 * `AccessibilityInfo.isReduceMotionEnabled()` is a promise, but animations start
 * inside effects that cannot await. Rather than let every loop flicker on for
 * one tick, we read the value once at startup (`initMotion`) and keep it warm.
 * The default is `false` so a device that never answers still animates.
 */
let osReduceMotion = false;
const osListeners = new Set<() => void>();

function setOsReduceMotion(next: boolean): void {
  if (next === osReduceMotion) return;
  osReduceMotion = next;
  for (const listener of osListeners) listener();
}

/**
 * Start tracking the OS reduce-motion setting. Call once, early, from the app
 * shell — before the first screen mounts, so the first frame is already correct.
 * Returns a teardown for tests.
 */
export function initMotion(): () => void {
  AccessibilityInfo.isReduceMotionEnabled()
    .then(setOsReduceMotion)
    .catch(() => {
      /* platform can't say — keep animating rather than freezing the app */
    });
  const sub = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    setOsReduceMotion,
  );
  return () => sub.remove();
}

/**
 * Synchronous "should this animate?" for imperative code that can't use a hook
 * (an `Animated.sequence` assembled inside an effect, a one-shot on a callback).
 * Hooks should prefer {@link useReducedMotion} so they re-render on a change.
 */
export function isReducedMotion(): boolean {
  return osReduceMotion || getReducedMotion();
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Reduced motion: **the OS setting OR the in-app toggle**.
 *
 * The OR is the whole design. The app switch can only ever add reduced motion,
 * never take it away, so a phone already asking for stillness gets it without
 * anyone opening this app's settings.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(isReducedMotion);

  useEffect(() => {
    const sync = () => setReduced(isReducedMotion());
    sync();

    osListeners.add(sync);
    const stored = onReducedMotionChange(sync);
    return () => {
      osListeners.delete(sync);
      stored.remove();
    };
  }, []);

  return reduced;
}

/**
 * Whether the screen this component sits on is the focused one.
 *
 * Deliberately *not* `useIsFocused`: that hook throws outside a navigator, and
 * these primitives are also rendered from sheets, tests and the design-system
 * gallery. No navigator means "assume visible" — the safe answer, since the
 * failure mode of guessing wrong is a paused animation, not a broken screen.
 */
export function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);

  useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const unsubFocus = navigation.addListener('focus', () => setFocused(true));
    const unsubBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  return focused;
}

/** Whether the app itself is foregrounded. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => AppState.currentState === 'active');

  useEffect(() => {
    const onChange = (state: AppStateStatus) => setActive(state === 'active');
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return active;
}

/**
 * Whether ambient loops should be running right now: motion is allowed, this
 * screen is focused, and the app is foregrounded.
 *
 * Note the asymmetry with {@link useReducedMotion} — a loop that is merely
 * *paused* (unfocused, backgrounded) may resume where it left off, but a loop
 * stopped for reduced motion must snap to its resting value and stay there. The
 * primitives in `components/anim` handle that distinction; this hook only says
 * whether the timer should tick.
 */
export function useLoopsActive(): boolean {
  const reduced = useReducedMotion();
  const focused = useScreenFocused();
  const appActive = useAppActive();
  return !reduced && focused && appActive;
}

/**
 * Run `effect` only while loops are active, tearing it down whenever they stop.
 * The teardown returned by `effect` is what stops the animation.
 */
export function useLoopEffect(
  effect: () => (() => void) | void,
  deps: React.DependencyList,
): void {
  const active = useLoopsActive();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's
  const run = useCallback(effect, deps);

  useEffect(() => {
    if (!active) return;
    return run();
  }, [active, run]);
}
