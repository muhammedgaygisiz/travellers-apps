import { PushNotifications } from '@capacitor/push-notifications';
import { NavController, Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { PATH } from 'utils';
import { registerCurrentPushInstallation } from './push-installation';

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
 * Turns the week bounds of a weekly summary payload into navigation query
 * params. Push data arrives as strings, and a payload without a complete range
 * yields no params at all so the page can pick its own default week.
 */
const toWeekRangeOptions = (
  data: Record<string, string> | undefined,
): { queryParams: { weekStart: string; weekEnd: string } } | undefined => {
  const weekStart = data?.['weekStart'];
  const weekEnd = data?.['weekEnd'];

  if (!weekStart || !weekEnd) {
    return undefined;
  }

  return { queryParams: { weekStart, weekEnd } };
};

/**
 * Registers push listeners and, when permission was already granted, refreshes
 * the FCM token. It never shows the OS permission prompt.
 *
 * The prompt is owned by the onboarding notification step
 * ({@link requestPushPermission}), which explains why notifications matter
 * first. Asking here — on every login — would burn the OS's single prompt
 * before the user has any context for the decision (epic #850, issue #1015).
 */
export const initPushListeners = async (
  platform: Platform,
  userUid: string | undefined,
  navController: NavController,
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
        const data = action.notification.data;

        if (data?.type === 'NEW_BITE' && data?.biteId) {
          navController.navigateForward([PATH.BITE, data.biteId]);
        }

        if (data?.type === 'NEW_BITE_REVIEW' && data?.biteId) {
          navController.navigateForward([PATH.BITE, data.biteId]);
        }

        if (data?.type === 'NEW_BITE_LIKE' && data?.biteId) {
          navController.navigateForward([PATH.BITE, data.biteId]);
        }

        if (data?.type === 'NEW_FOLLOWER' && data?.followerUid) {
          navController.navigateForward([PATH.PROFILE, data.followerUid]);
        }

        if (data?.type === 'LEADERBOARD_RANK_CHANGE') {
          navController.navigateForward([PATH.LEADERBOARD]);
        }

        if (data?.type === 'NEW_COUNTRY_BADGE' && data?.userId) {
          // The badge lives on the profile of whoever earned it. The same
          // payload reaches the achiever and their followers, so the achiever
          // is sent to their own profile page rather than to a read-only view
          // of themselves.
          navController.navigateForward(
            data.userId === userUid
              ? [PATH.MY_PROFILE]
              : [PATH.PROFILE, data.userId],
          );
        }

        if (data?.type === 'WEEKLY_BITE_SUMMARY') {
          // The summary counts one specific week, so carry its bounds into the
          // page instead of dropping the user on the home feed. Older payloads
          // have no bounds; the page then falls back to the previous week.
          navController.navigateForward(
            [PATH.WEEKLY_BITES],
            toWeekRangeOptions(data),
          );
        }
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
 * Opens the app's own page in the OS settings, the only route back once
 * notifications were denied — the OS silently ignores further permission
 * requests.
 *
 * Returns whether the settings page was actually opened, so the caller can keep
 * guiding the user instead of appearing to do nothing. iOS exposes the app's
 * settings under a URL scheme; Android has no equivalent that App Launcher can
 * open, so it reports `false` there and needs a native settings plugin.
 */
export const openPushSettings = async (): Promise<boolean> => {
  if (Capacitor.getPlatform() !== 'ios') {
    return false;
  }

  try {
    await AppLauncher.openUrl({ url: 'app-settings:' });

    return true;
  } catch (error) {
    console.warn('Could not open notification settings: ', error);

    return false;
  }
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
