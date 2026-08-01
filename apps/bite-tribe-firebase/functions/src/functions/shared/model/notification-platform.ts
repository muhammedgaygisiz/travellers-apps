/**
 * The app stores a release can go out on independently.
 *
 * TestFlight and the Play Console clear a review at different times, so a
 * release announcement is addressed to one store's installations at a time
 * (issue \#1194). `web` is deliberately absent: the web build always serves the
 * current version, so there is nothing to announce there.
 */
export const NOTIFICATION_PLATFORMS = ['ios', 'android'] as const;

export type NotificationPlatform = (typeof NOTIFICATION_PLATFORMS)[number];

export const isNotificationPlatform = (
  value: unknown,
): value is NotificationPlatform =>
  typeof value === 'string' &&
  (NOTIFICATION_PLATFORMS as readonly string[]).includes(value);
