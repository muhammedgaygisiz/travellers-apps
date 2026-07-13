// GA4 string parameter values are capped at 100 characters.
const MAX_GA4_PARAM_LENGTH = 100;

/**
 * Normalizes an upload callback error into a compact, GA4-safe code string.
 *
 * Firebase Storage errors expose a `code` such as `storage/unauthenticated`,
 * `storage/unauthorized`, `storage/retry-limit-exceeded` or `storage/canceled`;
 * we prefer that so failure types stay distinguishable in analytics, falling
 * back to the message and finally `'unknown'`.
 */
export const toUploadErrorCode = (err: unknown): string => {
  const source =
    typeof err === 'object' && err !== null
      ? (err as { code?: unknown; message?: unknown })
      : undefined;

  const candidate = source ? (source.code ?? source.message) : err;

  const code =
    typeof candidate === 'string'
      ? candidate
      : typeof candidate === 'number'
        ? String(candidate)
        : '';

  return (code.trim() || 'unknown').slice(0, MAX_GA4_PARAM_LENGTH);
};
