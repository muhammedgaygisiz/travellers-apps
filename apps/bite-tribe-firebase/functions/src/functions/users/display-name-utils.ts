export const DISPLAY_NAMES_COLLECTION = 'displayNames';
export const USERS_COLLECTION = 'users';

/**
 * Maximum byte length Firestore allows for a document id. A normalized display
 * name is used directly as the claim document id, so it must stay within this
 * bound.
 */
const MAX_DISPLAY_NAME_ID_BYTES = 1500;

/**
 * Normalizes a display name for uniqueness checks: trim, then lowercase.
 * The original casing is preserved separately for display.
 */
export const normalizeDisplayName = (value: string): string =>
  value.trim().toLowerCase();

/**
 * A normalized display name is used as the `/displayNames/{normalizedName}`
 * claim document id, so it must be a valid, non-empty Firestore document id.
 */
export const isValidNormalizedDisplayName = (normalized: string): boolean =>
  normalized.length > 0 &&
  Buffer.byteLength(normalized, 'utf8') <= MAX_DISPLAY_NAME_ID_BYTES &&
  !normalized.includes('/') &&
  normalized !== '.' &&
  normalized !== '..';
