import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import type { NavController, Platform } from '@ionic/angular';
import {
  hasPushPermission,
  initPushListeners,
  requestPushPermission,
} from './init-push';

// Automocking these packages yields undefined members, and the module under
// test pulls Angular in through `@ionic/angular` and the `utils` barrel — none
// of it reachable from the functions here — so stub the packages outright
// rather than transforming their ESM for a permission check.
jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn(),
    register: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));
jest.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: jest.fn(() => 'ios') },
}));
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: { setDocument: jest.fn() },
}));
jest.mock('@capacitor-firebase/messaging', () => ({
  FirebaseMessaging: { getToken: jest.fn() },
}));
jest.mock('@ionic/angular', () => ({
  NavController: class {},
  Platform: class {},
}));
jest.mock('utils', () => ({
  PATH: { BITE: 'bite', PROFILE: 'profile', LEADERBOARD: 'leaderboard' },
}));

/** Only `is()` is consulted, so the rest of Platform stays out of the way. */
const platformStub = (isCapacitor: boolean): Platform =>
  ({ is: jest.fn(() => isCapacitor) }) as unknown as Platform;

const navControllerStub = (): NavController =>
  ({ navigateForward: jest.fn() }) as unknown as NavController;

type Listener = (payload: unknown) => Promise<void> | void;

/** The handler `initPushListeners` registered for a given push event. */
const listenerFor = (event: string): Listener => {
  const call = (PushNotifications.addListener as jest.Mock).mock.calls.find(
    ([registeredEvent]) => registeredEvent === event,
  );

  if (!call) {
    throw new Error(`No listener registered for "${event}"`);
  }

  return call[1] as Listener;
};

const grantPermission = (receive: string): void => {
  (PushNotifications.checkPermissions as jest.Mock).mockResolvedValue({
    receive,
  });
};

describe('init-push', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    grantPermission('granted');
    (PushNotifications.removeAllListeners as jest.Mock).mockResolvedValue(
      undefined,
    );
    (PushNotifications.register as jest.Mock).mockResolvedValue(undefined);
    (FirebaseFirestore.setDocument as jest.Mock).mockResolvedValue(undefined);
    (FirebaseMessaging.getToken as jest.Mock).mockResolvedValue({
      token: 'fcm-token',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe(initPushListeners.name, () => {
    it('does nothing off a device build', async () => {
      await initPushListeners(
        platformStub(false),
        'user-1',
        navControllerStub(),
      );

      expect(PushNotifications.removeAllListeners).not.toHaveBeenCalled();
      expect(PushNotifications.addListener).not.toHaveBeenCalled();
      expect(PushNotifications.register).not.toHaveBeenCalled();
    });

    it('stops before registering listeners when there is no signed-in user', async () => {
      await initPushListeners(
        platformStub(true),
        undefined,
        navControllerStub(),
      );

      expect(PushNotifications.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(PushNotifications.addListener).not.toHaveBeenCalled();
      expect(PushNotifications.register).not.toHaveBeenCalled();
    });

    it('carries on when there are no previous listeners to remove', async () => {
      (PushNotifications.removeAllListeners as jest.Mock).mockRejectedValue(
        new Error('nothing to remove'),
      );

      await initPushListeners(
        platformStub(true),
        'user-1',
        navControllerStub(),
      );

      expect(PushNotifications.addListener).toHaveBeenCalled();
      expect(PushNotifications.register).toHaveBeenCalledTimes(1);
    });

    it('registers for push when permission was already granted', async () => {
      await initPushListeners(
        platformStub(true),
        'user-1',
        navControllerStub(),
      );

      expect(PushNotifications.register).toHaveBeenCalledTimes(1);
    });

    it.each(['denied', 'prompt', 'prompt-with-rationale'])(
      'does not register, or prompt, when permission is %s',
      async (receive) => {
        // Registering here would spend the OS prompt that onboarding owns.
        grantPermission(receive);

        await initPushListeners(
          platformStub(true),
          'user-1',
          navControllerStub(),
        );

        expect(PushNotifications.register).not.toHaveBeenCalled();
        expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
      },
    );

    describe('on registration', () => {
      it('stores the FCM token against the user and the reverse index', async () => {
        await initPushListeners(
          platformStub(true),
          'user-1',
          navControllerStub(),
        );

        await listenerFor('registration')(undefined);

        expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            reference: 'users/user-1/pushTokens/fcm-token',
            merge: true,
            data: expect.objectContaining({ platform: 'ios', enabled: true }),
          }),
        );
        expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            reference: 'pushTokens/fcm-token',
            merge: true,
            data: expect.objectContaining({
              userUid: 'user-1',
              platform: 'ios',
            }),
          }),
        );
      });

      it.each([[''], ['   '], [null]])(
        'stores nothing when the token comes back as %p',
        async (token) => {
          (FirebaseMessaging.getToken as jest.Mock).mockResolvedValue({
            token,
          });

          await initPushListeners(
            platformStub(true),
            'user-1',
            navControllerStub(),
          );
          await listenerFor('registration')(undefined);

          expect(FirebaseFirestore.setDocument).not.toHaveBeenCalled();
        },
      );

      it('stores nothing when the token cannot be read', async () => {
        (FirebaseMessaging.getToken as jest.Mock).mockRejectedValue(
          new Error('boom'),
        );

        await initPushListeners(
          platformStub(true),
          'user-1',
          navControllerStub(),
        );
        await listenerFor('registration')(undefined);

        expect(FirebaseFirestore.setDocument).not.toHaveBeenCalled();
      });
    });

    it('surfaces a registration error without throwing', async () => {
      await initPushListeners(
        platformStub(true),
        'user-1',
        navControllerStub(),
      );

      expect(() =>
        listenerFor('registrationError')({ error: 'boom' }),
      ).not.toThrow();
    });

    it('accepts a received notification without navigating', async () => {
      const navController = navControllerStub();
      await initPushListeners(platformStub(true), 'user-1', navController);

      listenerFor('pushNotificationReceived')({ title: 'hi' });

      expect(navController.navigateForward).not.toHaveBeenCalled();
    });

    describe('on notification tap', () => {
      const tap = async (
        data: Record<string, string>,
      ): Promise<NavController> => {
        const navController = navControllerStub();
        await initPushListeners(platformStub(true), 'user-1', navController);

        listenerFor('pushNotificationActionPerformed')({
          notification: { data },
        });

        return navController;
      };

      it.each(['NEW_BITE', 'NEW_BITE_REVIEW', 'NEW_BITE_LIKE'])(
        'opens the bite for a %s notification',
        async (type) => {
          const navController = await tap({ type, biteId: 'bite-1' });

          expect(navController.navigateForward).toHaveBeenCalledWith([
            'bite',
            'bite-1',
          ]);
        },
      );

      it('opens the follower profile for a NEW_FOLLOWER notification', async () => {
        const navController = await tap({
          type: 'NEW_FOLLOWER',
          followerUid: 'user-2',
        });

        expect(navController.navigateForward).toHaveBeenCalledWith([
          'profile',
          'user-2',
        ]);
      });

      it('opens the leaderboard for a rank change', async () => {
        const navController = await tap({ type: 'LEADERBOARD_RANK_CHANGE' });

        expect(navController.navigateForward).toHaveBeenCalledWith([
          'leaderboard',
        ]);
      });

      it('stays put for an unknown notification type', async () => {
        const navController = await tap({ type: 'SOMETHING_ELSE' });

        expect(navController.navigateForward).not.toHaveBeenCalled();
      });

      it('stays put when the payload is missing its target id', async () => {
        // A malformed payload must not navigate to a half-built route.
        const navController = await tap({ type: 'NEW_BITE' });

        expect(navController.navigateForward).not.toHaveBeenCalled();
      });

      it('stays put when the notification carries no data at all', async () => {
        const navController = navControllerStub();
        await initPushListeners(platformStub(true), 'user-1', navController);

        listenerFor('pushNotificationActionPerformed')({ notification: {} });

        expect(navController.navigateForward).not.toHaveBeenCalled();
      });
    });
  });

  describe(requestPushPermission.name, () => {
    it('registers for push once the user grants', async () => {
      (PushNotifications.requestPermissions as jest.Mock).mockResolvedValue({
        receive: 'granted',
      });

      await expect(requestPushPermission(platformStub(true))).resolves.toBe(
        'granted',
      );
      expect(PushNotifications.register).toHaveBeenCalledTimes(1);
    });

    it('reports a denial without registering', async () => {
      (PushNotifications.requestPermissions as jest.Mock).mockResolvedValue({
        receive: 'denied',
      });

      await expect(requestPushPermission(platformStub(true))).resolves.toBe(
        'denied',
      );
      expect(PushNotifications.register).not.toHaveBeenCalled();
    });

    it('treats a failed request as a denial', async () => {
      (PushNotifications.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(requestPushPermission(platformStub(true))).resolves.toBe(
        'denied',
      );
    });

    it('reports that there is no OS prompt to answer off a device', async () => {
      await expect(requestPushPermission(platformStub(false))).resolves.toBe(
        'unsupported',
      );
      expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
    });
  });

  describe(hasPushPermission.name, () => {
    it('reports the grant without ever prompting', async () => {
      grantPermission('granted');

      await expect(hasPushPermission(platformStub(true))).resolves.toBe(true);
      expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
    });

    it.each(['denied', 'prompt', 'prompt-with-rationale'])(
      'reports no permission when the OS says %s',
      async (receive) => {
        // A stored preference can outlive the OS grant (reinstall, or switching
        // notifications off), so anything short of "granted" reads as dead.
        grantPermission(receive);

        await expect(hasPushPermission(platformStub(true))).resolves.toBe(
          false,
        );
      },
    );

    it('treats a failed check as no permission', async () => {
      (PushNotifications.checkPermissions as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(hasPushPermission(platformStub(true))).resolves.toBe(false);
    });

    it('leaves a stored preference alone off a device, having nothing to check', async () => {
      await expect(hasPushPermission(platformStub(false))).resolves.toBe(true);
      expect(PushNotifications.checkPermissions).not.toHaveBeenCalled();
    });
  });
});
