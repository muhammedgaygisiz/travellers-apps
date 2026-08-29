import { registerPlugin } from '@capacitor/core';

/**
 * Native routes into the OS pages that own this app's permissions.
 *
 * Only Android needs one. iOS reaches its app settings through the
 * `app-settings:` URL scheme and App Launcher, and the web build has no OS
 * page to open; Android has no such URL, which is why a revoked
 * `POST_NOTIFICATIONS` had no route back at all before issue #1386.
 *
 * The implementation is part of the Android wrapper rather than an npm plugin:
 * `apps/bite-tribe-android/android/app/src/main/java/com/bitetribe/app/AppSettingsPlugin.java`.
 * Calling it on any other platform rejects, so callers branch on the platform
 * first.
 *
 * It lived in `push-notifications` while notifications were its only caller.
 * Media location is the second - `ACCESS_MEDIA_LOCATION` has the same Android
 * gap - so the proxy moved into a library of its own rather than making one
 * permission's library a dependency of another's.
 */
export interface AppSettingsPlugin {
  /**
   * Opens this app's notification settings.
   *
   * Resolves whether a page actually opened, so a caller can keep guiding the
   * user instead of appearing to do nothing.
   */
  openNotificationSettings(): Promise<{ opened: boolean }>;

  /**
   * Opens this app's details page, where its permission list lives.
   *
   * This is the route for permissions with no page of their own. Notifications
   * have one and should keep using {@link openNotificationSettings}; a media
   * permission does not, and the details page is the closest the OS offers.
   */
  openAppDetailsSettings(): Promise<{ opened: boolean }>;
}

export const AppSettings = registerPlugin<AppSettingsPlugin>('AppSettings');
