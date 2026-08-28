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
 * Location has the same Android gap and is the obvious second caller. This
 * proxy moves out of `push-notifications` when it gets one; until then it lives
 * next to its only user rather than in a library with one export.
 */
export interface AppSettingsPlugin {
  /**
   * Opens this app's notification settings.
   *
   * Resolves whether a page actually opened, so a caller can keep guiding the
   * user instead of appearing to do nothing.
   */
  openNotificationSettings(): Promise<{ opened: boolean }>;
}

export const AppSettings = registerPlugin<AppSettingsPlugin>('AppSettings');
