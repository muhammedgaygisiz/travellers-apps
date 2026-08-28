import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { AppSettings } from './app-settings';
import { registerCurrentPushInstallation } from './push-installation';
import {
  NotificationTarget,
  toNotificationTarget,
} from './notification-target';

/**
 * Outcome of an in-context push permission request.
 *
 * `unsupported` means no OS prompt exists to answer — the web build or a
 * signed-out user — and is deliberately distinct from `denied` so callers do
 * not record a refusal the user never made.
 */
export type PushPermissionResult = 'granted' | 'denied' | 'unsupported';

/**
 * Current OS push permission, as reported without prompting.
 *
 * `prompt` still has an unspent OS prompt, so an explicit setup action can
 * recover delivery. `denied` cannot: the OS ignores further requests and the
 * only way back is the system settings page. Callers must branch on the two.
 */
export type PushPermissionState =
  'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * Registers push listeners and, when permission was already granted, refreshes
 * the FCM token. It never shows the OS permission prompt.
 *
 * The prompt is owned by the onboarding notification step
 * ({@link requestPushPermission}), which explains why notifications matter
 * first. Asking here — on every login — would burn the OS's single prompt
 * before the user has any context for the decision (epic #850, issue #1015).
 *
 * `onNotificationTap` receives the surface a tapped notification talks about.
 * The tap is reported rather than navigated here because a tap that launched
 * the app arrives while the app is still starting, and only the caller knows
 * when routing has settled enough to keep the target (issue #1244).
 */
export const initPushListeners = async (
  platform: Platform,
  userUid: string | undefined,
  onNotificationTap: (target: NotificationTarget) => void,
): Promise<void> => {
  if (platform.is('capacitor')) {
    try {
      await PushNotifications.removeAllListeners();
    } catch {
      console.warn('No previous PushNotifications listeners to remove');
    }

    if (!userUid) {
      return;
    }

    PushNotifications.addListener('registration', async () => {
      // Refreshing the token must not resurrect a disabled installation, so the
      // registration inherits the installation's existing `enabled` state
      // (issue #1184).
      await registerCurrentPushInstallation(userUid);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error: ', error);
    });

    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('Push notification received: ', notification);
      },
    );

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('Push notification action performed: ', action);

        const target = toNotificationTarget(action.notification.data, userUid);

        if (!target) {
          // An unroutable type, or a payload missing the id its route needs.
          // Leaving the user where they are is the bounded outcome; guessing a
          // surface the notification never mentioned is not.
          console.warn(
            'Tapped push notification carries no navigable target: ',
            action.notification.data,
          );

          return;
        }

        onNotificationTap(target);
      },
    );

    // Only re-register an existing grant. `checkPermissions` never prompts,
    // so a user who has not decided yet is left untouched until onboarding
    // asks in context.
    const permissions = await PushNotifications.checkPermissions();

    if (permissions.receive !== 'granted') {
      return;
    }

    await PushNotifications.register();
  }
};

/**
 * Whether the OS currently allows delivering push. Never prompts.
 *
 * A registered token records that this installation once asked for delivery,
 * not what the OS allows today: reinstalling the app or turning notifications
 * off in system settings resets the OS grant while the token document survives.
 * Callers must reconcile the two before treating push as live, otherwise they
 * show a working installation whose delivery the OS is dropping.
 *
 * Off-device there is no OS grant to pre-check, so it reports `true` and leaves
 * the outcome to {@link requestPushPermission}, which reports `unsupported`
 * there. That keeps a registration from being second-guessed on a platform that
 * cannot answer the question.
 */
export const hasPushPermission = async (
  platform: Platform,
): Promise<boolean> => {
  if (!platform.is('capacitor')) {
    return true;
  }

  try {
    const permissions = await PushNotifications.checkPermissions();

    return permissions.receive === 'granted';
  } catch (error) {
    console.warn('Push permission check failed: ', error);

    return false;
  }
};

/**
 * Shows the OS push permission prompt and registers for push when it is
 * granted. Call this only after the user has been told what notifications are
 * for; the OS shows its prompt once per install, so a cold ask is spent for
 * good.
 *
 * Returns the outcome so the caller can record the choice. Denial is a normal
 * result, not an error — the onboarding flow continues either way.
 */
export const requestPushPermission = async (
  platform: Platform,
): Promise<PushPermissionResult> => {
  if (!platform.is('capacitor')) {
    return 'unsupported';
  }

  try {
    const permissions = await PushNotifications.requestPermissions();

    if (permissions.receive !== 'granted') {
      return 'denied';
    }

    await PushNotifications.register();

    return 'granted';
  } catch (error) {
    console.error('Push permission request failed: ', error);
    return 'denied';
  }
};

/**
 * Reads the OS permission state without prompting, so a caller can tell a
 * recoverable "never asked" apart from a "denied" that only the system settings
 * page can undo.
 *
 * This describes the current device only. Another installation's delivery is
 * governed by its own OS grant and its own token `enabled` flag, neither of
 * which this device can see or change (issue #1184).
 */
export const getPushPermissionState = async (
  platform: Platform,
): Promise<PushPermissionState> => {
  if (!platform.is('capacitor')) {
    return 'unsupported';
  }

  try {
    const { receive } = await PushNotifications.checkPermissions();

    if (receive === 'granted') {
      return 'granted';
    }

    // `prompt-with-rationale` is Android's "ask again with an explanation", so
    // it still has a prompt left to spend.
    return receive === 'denied' ? 'denied' : 'prompt';
  } catch (error) {
    console.warn('Push permission check failed: ', error);

    return 'denied';
  }
};

/**
 * Opens the app's own notification page in the OS settings, the only route back
 * once the OS stopped allowing delivery.
 *
 * Returns whether the settings page was actually opened, so the caller can keep
 * guiding the user instead of appearing to do nothing. The two platforms get
 * there differently: iOS exposes the app's settings under a URL scheme, while
 * Android has no such URL and needs a native intent, which the Android wrapper
 * supplies through {@link AppSettings} (issue #1386). Neither exists on the
 * web, which has no OS page to open.
 */
export const openPushSettings = async (): Promise<boolean> => {
  const platform = Capacitor.getPlatform();

  try {
    if (platform === 'ios') {
      await AppLauncher.openUrl({ url: 'app-settings:' });

      return true;
    }

    if (platform === 'android') {
      const { opened } = await AppSettings.openNotificationSettings();

      return opened;
    }
  } catch (error) {
    console.warn('Could not open notification settings: ', error);
  }

  return false;
};

/**
 * Turns on notification delivery for the current installation: asks the OS when
 * needed, then registers this installation's token.
 *
 * A grant that was already given returns without a prompt, so the same call
 * covers the granted, never-asked, denied, and unsupported OS states. The token
 * is written explicitly rather than left to the `registration` listener so the
 * caller knows when the installation list is worth reloading.
 */
export const enablePushOnThisDevice = async (
  platform: Platform,
  userUid: string,
): Promise<PushPermissionResult> => {
  const result = await requestPushPermission(platform);

  if (result !== 'granted') {
    return result;
  }

  await registerCurrentPushInstallation(userUid);

  return 'granted';
};
