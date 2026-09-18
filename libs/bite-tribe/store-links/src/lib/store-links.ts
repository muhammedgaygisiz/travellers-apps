/**
 * The identities the two store listings are reached by.
 *
 * Both were fixed by the soft launch on 31 August 2026 (GitHub issue #912) and
 * neither can change without a new listing, so they are constants rather than
 * configuration. They are also what `tools/generate-store-qr-codes.mjs` encodes
 * into the committed codes: change one here and the code beside it still points
 * at the old listing until that script is re-run.
 */
export const APP_STORE_APP_ID = '6746098595';

/** The Play listing's package name, which is also the native application id. */
export const GOOGLE_PLAY_PACKAGE = 'com.bitetribe.app';

/** The App Store listing, without a locale segment so Apple picks the user's. */
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_APP_ID}`;

/** The Play listing. */
export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${GOOGLE_PLAY_PACKAGE}`;

/**
 * The width below which a QR code is the wrong control.
 *
 * A code is scanned by a second device pointed at the first one, which is a
 * thing a person does at a desk and not a thing they can do holding the screen
 * the code is on. Below this the component shows the store badges instead, so a
 * phone-web visitor gets a link they can tap rather than a square they cannot
 * use. See GitHub issue #1453.
 */
export const STORE_BADGE_MAX_WIDTH_PX = 600;
