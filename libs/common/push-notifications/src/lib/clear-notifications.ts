import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { isNotificationForSurface } from './notification-surface';

/**
 * Clears the delivered notifications that announced a surface the user is now
 * looking at.
 *
 * Only a tapped notification is dismissed by the OS. Everything reached another
 * way - a Bite opened from the feed, a profile opened from a search - leaves its
 * notification in the drawer for good, which is how an active account arrives at
 * a backlog dozens deep (issue \#1366).
 *
 * The match runs on the collapse key the backend stamped on the notification,
 * which reaches the app as the `tag` on Android and as the `id` on iOS. A
 * notification carrying neither is left alone: it predates the contract, and
 * dismissing something the app cannot identify would clear notifications the
 * user has not seen.
 *
 * Failures are swallowed. This is housekeeping behind a navigation the user
 * asked for, and it must not break that navigation.
 */
export const clearNotificationsForSurface = async (
  platform: Platform,
  surface: string,
): Promise<void> => {
  if (!platform.is('capacitor')) {
    return;
  }

  try {
    const { notifications } =
      await PushNotifications.getDeliveredNotifications();

    const forSurface = notifications.filter((notification) =>
      isNotificationForSurface(notification.tag ?? notification.id, surface),
    );

    if (forSurface.length === 0) {
      return;
    }

    await PushNotifications.removeDeliveredNotifications({
      notifications: forSurface,
    });
  } catch (error) {
    console.warn('Could not clear delivered notifications: ', error);
  }
};
