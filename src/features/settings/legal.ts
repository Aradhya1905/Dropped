/**
 * Where a person goes when they want a human, not a button.
 *
 * **Both of these are unset, and the rows that use them stay hidden until they
 * aren't.** A trust screen with a dead privacy-policy link is worse than one
 * with no link at all — it's the exact page someone opens when they've started
 * to doubt the app. Fill these in before store submission; Google Play and the
 * App Store both require a reachable policy URL and a data-deletion contact for
 * a location + UGC app anyway.
 */

/** e.g. 'https://dropped.example/privacy'. */
export const PRIVACY_POLICY_URL: string | null = null;

/** Erasure and appeal requests. e.g. 'privacy@dropped.example'. */
export const DATA_CONTACT_EMAIL: string | null = null;
