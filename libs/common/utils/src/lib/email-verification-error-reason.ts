export type EmailVerificationFailureReason =
  | 'rate_limited'
  | 'already_verified'
  | 'unsupported_provider'
  | 'send_failed'
  | 'unknown';

export const getEmailVerificationFailureReason = (
  error: unknown,
): EmailVerificationFailureReason => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : '';
  const errorText = `${code} ${message}`;

  if (errorText.includes('rate_limited')) {
    return 'rate_limited';
  }

  if (errorText.includes('already_verified')) {
    return 'already_verified';
  }

  if (errorText.includes('unsupported_provider')) {
    return 'unsupported_provider';
  }

  if (errorText.includes('send_failed')) {
    return 'send_failed';
  }

  return 'unknown';
};
