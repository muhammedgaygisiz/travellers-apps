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
  updatedAt?: string;
}
