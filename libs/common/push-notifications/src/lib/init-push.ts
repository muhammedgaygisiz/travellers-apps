import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

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

export const initPush = async (
  platform: Platform,
  userUid: string | undefined,
): Promise<void> => {
  if (platform.is('capacitor')) {
    console.log('INITIALIZING PUSH NOTIFICATIONS WITH USER UID:', userUid);

    if (!userUid) {
      return;
    }

    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);

      await upsertToken(userUid, token.value);
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

    console.log('Push notification permissions: ', permissions);
    if (permissions.receive !== 'granted') {
      return;
    }

    await PushNotifications.register();
  }
};
