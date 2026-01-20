import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

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

export const initPush = async (
  platform: Platform,
  userUid: string | undefined,
): Promise<void> => {
  if (platform.is('capacitor')) {
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
      },
    );

    const permissions = await PushNotifications.requestPermissions();

    if (permissions.receive !== 'granted') {
      return;
    }

    await PushNotifications.register();
  }
};
