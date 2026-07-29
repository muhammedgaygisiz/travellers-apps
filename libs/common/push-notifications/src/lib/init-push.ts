import { PushNotifications } from '@capacitor/push-notifications';
import { NavController, Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { AppLauncher } from '@capacitor/app-launcher';
import { PATH } from 'utils';

const upsertToken = async (
  userUid: string,
  tokenValue: string,
): Promise<void> => {
  const platform = Capacitor.getPlatform();
  const appVersion = 'tbd-xxx';
  const deviceId = 'tbd-xxx';

  const userTokenRef = `users/${userUid}/pushTokens/${tokenValue}`;

  const now = Date.now();
  await FirebaseFirestore.setDocument({
    reference: userTokenRef,
    data: {
      platform,
      appVersion,
      deviceId,
      enabled: true,
      createdAt: now,
      lastSeenAt: now,
    },
    merge: true,
  });

  // reverse index
  const indexRef = `pushTokens/${tokenValue}`;

  await FirebaseFirestore.setDocument({
    reference: indexRef,
    data: {
      userUid,
      platform,
      createdAt: now,
      lastSeenAt: now,
    },
    merge: true,
  });
};

const getFcmToken = async (): Promise<string | null> => {
  const platform = Capacitor.getPlatform();

  try {
    const { token } = await FirebaseMessaging.getToken();

    if (!token || token.trim().length === 0) {
      console.warn('Firebase Messaging returned empty token');
      return null;
    }
    return token;
  } catch (e) {
    console.error(
      'Failed to get FCM token for Firebase Messaging on platform:',
      platform,
      e,
    );
    return null;
  }
};

/**
 * Outcome of an in-context push permission request.
 *
 * `unsupported` means no OS prompt exists to answer — the web build or a
 * signed-out user — and is deliberately distinct from `denied` so callers do
 * not record a refusal the user never made.
 */
export type PushPermissionResult = 'granted' | 'denied' | 'unsupported';
export type PushPermissionState = PushPermissionResult | 'prompt' | 'checking';

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
  enabled = true,
): Promise<void> => {
  if (platform.is('capacitor')) {
    try {
      await PushNotifications.removeAllListeners();
    } catch {
      console.warn('No previous PushNotifications listeners to remove');
    }

    if (!userUid || !enabled) {
      return;
    }

    PushNotifications.addListener('registration', async () => {
      const fcmToken = await getFcmToken();

      if (!fcmToken) {
        console.error('No FCM token available, cannot upsert push token');
        return;
      }

      await upsertToken(userUid, fcmToken);
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
 * A stored `settings.pushNotifications` flag records what the user once chose,
 * not what the OS allows today: reinstalling the app or turning notifications
 * off in system settings resets the OS grant while the stored preference
 * survives. Callers must reconcile the two before treating push as enabled,
 * otherwise they show a "granted" state for a permission that no longer exists.
 *
 * Off-device there is no OS grant to pre-check, so it reports `true` and leaves
 * the outcome to {@link requestPushPermission}, which reports `unsupported`
 * there. That keeps a stored preference from being second-guessed on a platform
 * that cannot answer the question.
 */
export const hasPushPermission = async (
  platform: Platform,
): Promise<boolean> => {
  const state = await getPushPermissionState(platform);

  return state === 'granted' || state === 'unsupported';
};

/**
 * Reads the OS push permission state without prompting. This lets Settings
 * distinguish an unspent prompt from a denial that needs system recovery.
 */
export const getPushPermissionState = async (
  platform: Platform,
): Promise<Exclude<PushPermissionState, 'checking'>> => {
  if (!platform.is('capacitor')) {
    return 'unsupported';
  }

  try {
    const { receive } = await PushNotifications.checkPermissions();

    if (receive === 'granted') {
      return 'granted';
    }

    return receive === 'denied' ? 'denied' : 'prompt';
  } catch (error) {
    console.warn('Push permission check failed: ', error);

    return 'denied';
  }
};

/**
 * Opens this app's settings page on iOS, where a denied notification grant can
 * be restored. App Launcher has no Android equivalent for the notification
 * settings intent, so Android callers retain manual recovery guidance.
 */
export const openPushNotificationSettings = async (): Promise<boolean> => {
  if (Capacitor.getPlatform() !== 'ios') {
    return false;
  }

  try {
    await AppLauncher.openUrl({ url: 'app-settings:' });

    return true;
  } catch (error) {
    console.warn('Could not open push notification settings: ', error);

    return false;
  }
};

/**
 * Enables push from an explicit user action in Settings.
 *
 * A granted device is registered immediately, an unspent prompt is shown only
 * after listeners are ready to persist the resulting FCM token, and a denial
 * is returned without making a request the OS will ignore.
 */
export const enablePushNotifications = async (
  platform: Platform,
  userUid: string | undefined,
  navController: NavController,
): Promise<PushPermissionResult> => {
  const state = await getPushPermissionState(platform);

  if (state === 'denied' || state === 'unsupported') {
    return state;
  }

  await initPushListeners(platform, userUid, navController, true);

  if (state === 'granted') {
    return 'granted';
  }

  return requestPushPermission(platform);
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
