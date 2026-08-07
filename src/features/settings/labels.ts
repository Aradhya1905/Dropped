/**
 * How the retention levers describe themselves on the You screen.
 *
 * Kept out of the screen so the wording of a setting and the wording of its
 * sheet can't drift apart — the row's value and the picked option are the same
 * string, produced once.
 */
import type { Mood } from '../../types';
import type { NotificationMode, QuietHours } from '../../services/storage';

/** `1320` → `22:00`. */
export function clockLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** `22:00–08:00`, or `off` when the user switched the window off. */
export function quietHoursLabel(hours: QuietHours | null): string {
  if (!hours) {
    return 'Off';
  }
  return `${clockLabel(hours.startMin)}–${clockLabel(hours.endMin)}`;
}

export function humModeLabel(mode: NotificationMode): string {
  switch (mode) {
    case 'off':
      return 'Off';
    case 'rare':
      return 'Rare';
    default:
      return 'Always';
  }
}

/** `500 m`, `1 km`. */
export function radiusLabel(meters: number): string {
  return meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;
}

/**
 * `All moods`, `None`, or the moods themselves. Naming them rather than
 * counting them is the point of the row: "2 of 4" doesn't tell you that you
 * muted `ache` three months ago and forgot.
 */
export function moodsLabel(moods: readonly Mood[], total: number): string {
  if (moods.length === 0) {
    return 'None';
  }
  if (moods.length === total) {
    return 'All';
  }
  return moods.join(', ');
}
