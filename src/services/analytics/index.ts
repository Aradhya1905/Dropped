/**
 * Crash reporting adapter — Firebase Crashlytics behind the `services/*` seam so
 * features never touch the vendor SDK directly. Uses the modular (v9-style) API.
 * Android only for now; iOS is not configured yet.
 */
import {
  getCrashlytics,
  setUserId,
  log,
  recordError,
  setCrashlyticsCollectionEnabled,
  crash,
} from '@react-native-firebase/crashlytics';

const crashlytics = getCrashlytics();

/** Tag crash reports with the anonymous device id (no PII). Called from App. */
export function identifyDevice(deviceId: string): void {
  setUserId(crashlytics, deviceId);
}

/** Add a breadcrumb to the next crash report. */
export function logBreadcrumb(message: string): void {
  log(crashlytics, message);
}

/** Report a caught (non-fatal) error with its stack trace. */
export function reportError(error: Error): void {
  recordError(crashlytics, error);
}

/** Opt the device in/out of crash collection. */
export function setCrashReportingEnabled(enabled: boolean): void {
  setCrashlyticsCollectionEnabled(crashlytics, enabled);
}

/** Dev-only: force a native crash to confirm the reporting pipeline. */
export function forceTestCrash(): void {
  crash(crashlytics);
}
