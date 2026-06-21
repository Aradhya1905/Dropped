/**
 * splash — adapter over `react-native-bootsplash` (the native launch screen,
 * generated on warm paper `#F1EBDE`). Features never import the SDK directly;
 * they call `hideNativeSplash()` once the JS SplashScreen has painted, so the
 * paper-on-paper handoff is seamless (no flash).
 */
import BootSplash from 'react-native-bootsplash';

/** Fade the native (paper) bootsplash out. Resolves when the fade completes. */
export function hideNativeSplash(): Promise<void> {
  return BootSplash.hide({ fade: true });
}
