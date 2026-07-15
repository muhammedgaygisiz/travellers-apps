export type DisplayNameFailureReason = 'taken' | 'invalid' | 'unknown';

/**
 * Maps a failed `claimDisplayName` callable error onto a stable reason so the UI
 * can show a localized message. The backend throws `HttpsError`s whose messages
 * are `display_name_taken` (already-exists) and `invalid_display_name`
 * (invalid-argument).
 */
export const getDisplayNameFailureReason = (
  error: unknown,
): DisplayNameFailureReason => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : '';
  const errorText = `${code} ${message}`;

  if (errorText.includes('display_name_taken')) {
    return 'taken';
  }

  if (errorText.includes('invalid_display_name')) {
    return 'invalid';
  }

  return 'unknown';
};
