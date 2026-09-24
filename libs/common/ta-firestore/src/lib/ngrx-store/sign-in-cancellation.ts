/**
 * Firebase codes a provider sign-in carries when the user walked away from it.
 *
 * The web SDK reports its popup this way, and the iOS plugin maps the Firebase
 * web-context errors onto the same two codes, so one set covers both.
 */
const CANCELLATION_CODES: ReadonlySet<string> = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

/**
 * What the native provider SDKs say when the user dismissed their sheet.
 *
 * These arrive **without a Firebase code**: the provider SDK refused before
 * Firebase was asked anything, and `@capacitor-firebase/authentication` only
 * maps Firebase's own errors onto `auth/*`. So the message is all there is.
 *
 * - `cancel` covers Google Sign-In on iOS (*The user canceled the sign-in
 *   flow.*), the Android authorization intent (*Authorization canceled.*) and
 *   Credential Manager's user cancellation on Android.
 * - Sign in with Apple on iOS reports `ASAuthorizationError.canceled` as
 *   *…AuthorizationError error 1001.*, and never uses the word.
 * - The legacy Google Sign-In client on Android reports status `12501`,
 *   `SIGN_IN_CANCELLED`, as the leading number of its message.
 */
const NATIVE_CANCELLATION_MESSAGES: readonly RegExp[] = [
  /cancel/i,
  /AuthorizationError error 1001/,
  /^12501\b/,
];

/**
 * Whether a provider sign-in ended because the user dismissed it, rather than
 * because anything refused them (issue #1622).
 *
 * The two used to produce the same silence. A dismissal should: the user knows
 * what they did. A rejection should not, because a login page that looks
 * exactly as it did before reads as "the button did nothing", and on 16
 * September that took a full investigation to tell apart from a sign-in that
 * had worked.
 *
 * **A Firebase code decides it when there is one.** Only a code outside the
 * cancellation set means Firebase looked at the attempt and refused it, and a
 * message that happens to mention cancelling does not overrule that. The
 * message is read only for the native errors that carry no code.
 */
export const isSignInCancellation = (error: unknown): boolean => {
  const code = getSignInErrorCode(error);

  if (code) {
    return CANCELLATION_CODES.has(code);
  }

  const message = (error as { message?: unknown } | null)?.message;

  return (
    typeof message === 'string' &&
    NATIVE_CANCELLATION_MESSAGES.some((pattern) => pattern.test(message))
  );
};

/** The Firebase error code a sign-in failure carries, when it carries one. */
export const getSignInErrorCode = (error: unknown): string | undefined => {
  const code = (error as { code?: unknown } | null)?.code;

  return typeof code === 'string' && code ? code : undefined;
};
