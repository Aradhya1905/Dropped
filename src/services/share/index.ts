/**
 * share — the only module that touches `react-native-share`.
 *
 * RN's built-in `Share` can hand someone a sentence, which is all
 * `navigation/linking.shareSpot` ever needs. It cannot hand them a *file*: on
 * Android it builds a `text/plain` intent and drops any `url` on the floor. The
 * city constellation is an image, so it needs this.
 *
 * Everything here degrades to `false` rather than throwing. A share sheet that
 * was dismissed, a native module that isn't linked yet (a JS install without a
 * rebuild), and a genuine failure are all "it didn't go anywhere" as far as a
 * caller is concerned — none of them is worth an error dialog over a keepsake.
 */

/** What the caller wants to send: a PNG it rendered, and a sentence with it. */
export interface ShareImageOptions {
  /** Raw base64 PNG — no `data:` prefix. */
  base64Png: string;
  /** Suggested filename, without extension. */
  filename: string;
  /** Optional accompanying text. Never a secret body. */
  message?: string;
  /** iOS share-sheet subject line (used by Mail). */
  title?: string;
}

// `undefined` = not looked up yet, `null` = looked up and unavailable.
type NativeShare = {
  open: (options: Record<string, unknown>) => Promise<unknown>;
};
let native: NativeShare | null | undefined;

function nativeShare(): NativeShare | null {
  if (native !== undefined) return native;
  try {
    const mod = require('react-native-share');
    native = (mod?.default ?? mod) as NativeShare;
  } catch {
    native = null;
  }
  return native;
}

/**
 * Open the system share sheet with a PNG attached.
 *
 * The image is passed as a `data:` URL: the library writes it to a temp file
 * and shares that, which keeps this module free of a filesystem dependency and
 * means nothing of the user's is left lying in app storage afterwards.
 *
 * `failOnCancel: false` — a dismissed sheet resolves rather than rejects, so
 * "the user changed their mind" never reaches a catch block as an error.
 *
 * Returns whether the sheet was opened at all.
 */
export async function shareImage(options: ShareImageOptions): Promise<boolean> {
  const share = nativeShare();
  if (!share) return false;

  try {
    await share.open({
      url: `data:image/png;base64,${options.base64Png}`,
      type: 'image/png',
      filename: options.filename,
      failOnCancel: false,
      ...(options.message ? { message: options.message } : {}),
      ...(options.title ? { title: options.title, subject: options.title } : {}),
    });
    return true;
  } catch {
    return false;
  }
}
