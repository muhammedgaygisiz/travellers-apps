import type { DietaryChoice } from './dietary-choice';

/**
 * Account-wide preferences.
 *
 * Notification delivery is deliberately absent: it is installation-specific and
 * lives on each push token's `enabled` flag, so an account-wide switch could
 * never be a truthful control for a user with several registered installations
 * (issue #1184). Documents written before that still carry a
 * `pushNotifications` field; it is ignored legacy data.
 */
export interface Settings {
  /** Whether the user granted the OS location permission in onboarding (#1023). */
  location: boolean;
  emailUpdates: boolean;
  theme: 'light' | 'dark';
  currency: string;
  favoriteCurrencies?: string[];
  nearby?: number;
  language: string;
  /**
   * When the home follow-suggestions card was last dismissed. It stays away
   * for a week after that (GitHub issue #1708).
   */
  followSuggestionsDismissedAt?: string;
  /**
   * What the member eats or avoids, set by the member only and never inferred
   * (GitHub issue #2196, `RD-DC-3`). Private, as the whole document is: no
   * other account reads it, and it reaches neither analytics nor an ad network.
   * Read it through `dietaryChoicesOf`, which drops a religion or health choice
   * that has no consent behind it.
   */
  dietaryChoices?: DietaryChoice[];
  /**
   * When the member consented to religion and health choices being stored, or
   * `null` once they withdrew it. The rules refuse a sensitive choice without
   * it, and withdrawing it removes those choices in the same write.
   */
  dietaryConsentAt?: string | null;
  updatedAt?: string;
}
