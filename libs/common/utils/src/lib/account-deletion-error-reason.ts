export type AccountDeletionFailureReason = 'reauth-required' | 'unknown';

/**
 * Maps a failed `deleteOwnAccount` callable error onto a stable reason so the UI
 * can react. The backend throws `reauth_required` (failed-precondition) when the
 * caller's sign-in is older than the allowed window, which the app answers with
 * a fresh provider login rather than an error message.
 */
export const getAccountDeletionFailureReason = (
  error: unknown,
): AccountDeletionFailureReason => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : '';

  return `${code} ${message}`.includes('reauth_required')
    ? 'reauth-required'
    : 'unknown';
};
