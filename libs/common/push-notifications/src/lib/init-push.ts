import { PushNotifications } from '@capacitor/push-notifications';
import { NavController, Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
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
    } catch (error) {
      console.warn('No previous PushNotifications listeners to remove');
    }

    if (!userUid) {
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
