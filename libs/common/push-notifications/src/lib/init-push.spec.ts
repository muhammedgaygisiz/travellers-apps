import { PushNotifications } from '@capacitor/push-notifications';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import type { NavController, Platform } from '@ionic/angular';
import {
  enablePushOnThisDevice,
  getPushPermissionState,
  hasPushPermission,
  initPushListeners,
  openPushSettings,
  requestPushPermission,
} from './init-push';
import { registerCurrentPushInstallation } from './push-installation';

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
jest.mock('@capacitor/app-launcher', () => ({
  AppLauncher: { openUrl: jest.fn() },
}));
// Token document handling is covered by `push-installation.spec.ts`; here only
// the fact that registration is delegated to it matters.
jest.mock('./push-installation', () => ({
  registerCurrentPushInstallation: jest.fn(),
}));
jest.mock('@ionic/angular', () => ({
  NavController: class {},
  Platform: class {},
}));
jest.mock('utils', () => ({
  PATH: {
    BITE: 'bite',
    PROFILE: 'profile',
    MY_PROFILE: 'my-profile',
    LEADERBOARD: 'leaderboard',
    WEEKLY_BITES: 'weekly-bites',
  },
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
    (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
    (PushNotifications.removeAllListeners as jest.Mock).mockResolvedValue(
      undefined,
    );
    (PushNotifications.register as jest.Mock).mockResolvedValue(undefined);
    (registerCurrentPushInstallation as jest.Mock).mockResolvedValue(true);
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
      it('registers the current installation, preserving its enabled state', async () => {
        // Delegating keeps the login refresh on the same path as the explicit
        // setup action, so neither can re-enable a disabled installation.
        await initPushListeners(
          platformStub(true),
          'user-1',
          navControllerStub(),
        );

        await listenerFor('registration')(undefined);

        expect(registerCurrentPushInstallation).toHaveBeenCalledWith('user-1');
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

      it('opens the badge profile for a follower of the achiever', async () => {
        const navController = await tap({
          type: 'NEW_COUNTRY_BADGE',
          userId: 'user-2',
          countryCode: 'IT',
        });

        expect(navController.navigateForward).toHaveBeenCalledWith([
          'profile',
          'user-2',
        ]);
      });

      it('opens their own profile for the user who earned the badge', async () => {
        // Owner and followers receive the same payload; only the recipient
        // tells the two apart.
        const navController = await tap({
          type: 'NEW_COUNTRY_BADGE',
          userId: 'user-1',
          countryCode: 'IT',
        });

        expect(navController.navigateForward).toHaveBeenCalledWith([
          'my-profile',
        ]);
      });

      it('opens the deep-linked week for a weekly bite summary', async () => {
        const navController = await tap({
          type: 'WEEKLY_BITE_SUMMARY',
          biteCount: '12',
          weekStart: '1752444000000',
          weekEnd: '1753048799999',
        });

        expect(navController.navigateForward).toHaveBeenCalledWith(
          ['weekly-bites'],
          {
            queryParams: {
              weekStart: '1752444000000',
              weekEnd: '1753048799999',
            },
          },
        );
      });

      it('opens the weekly bites page without a range when the payload has none', async () => {
        // Notifications sent before the range shipped still have to land on the
        // page; it falls back to the previous week on its own.
        const navController = await tap({
          type: 'WEEKLY_BITE_SUMMARY',
          biteCount: '12',
        });

        expect(navController.navigateForward).toHaveBeenCalledWith(
          ['weekly-bites'],
          undefined,
        );
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

    it('leaves a registration alone off a device, having nothing to check', async () => {
      await expect(hasPushPermission(platformStub(false))).resolves.toBe(true);
      expect(PushNotifications.checkPermissions).not.toHaveBeenCalled();
    });
  });

  describe(getPushPermissionState.name, () => {
    it.each([
      ['granted', 'granted'],
      ['denied', 'denied'],
      ['prompt', 'prompt'],
      // Android's "ask again with an explanation" still has a prompt to spend,
      // so it must not be reported as the unrecoverable denial.
      ['prompt-with-rationale', 'prompt'],
    ])('maps the OS state %s to %s', async (receive, expected) => {
      grantPermission(receive);

      await expect(getPushPermissionState(platformStub(true))).resolves.toBe(
        expected,
      );
      expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
    });

    it('reports that there is no OS grant to read off a device', async () => {
      await expect(getPushPermissionState(platformStub(false))).resolves.toBe(
        'unsupported',
      );
      expect(PushNotifications.checkPermissions).not.toHaveBeenCalled();
    });

    it('treats a failed check as denied', async () => {
      (PushNotifications.checkPermissions as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(getPushPermissionState(platformStub(true))).resolves.toBe(
        'denied',
      );
    });
  });

  describe(openPushSettings.name, () => {
    it('opens the app settings page on iOS', async () => {
      (AppLauncher.openUrl as jest.Mock).mockResolvedValue({ completed: true });

      await expect(openPushSettings()).resolves.toBe(true);
      expect(AppLauncher.openUrl).toHaveBeenCalledWith({
        url: 'app-settings:',
      });
    });

    it('reports that it could not open the settings page elsewhere', async () => {
      // Android has no App Launcher route to the app's own settings page.
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      await expect(openPushSettings()).resolves.toBe(false);
      expect(AppLauncher.openUrl).not.toHaveBeenCalled();
    });

    it('reports a failed launch instead of throwing', async () => {
      (AppLauncher.openUrl as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(openPushSettings()).resolves.toBe(false);
    });
  });

  describe(enablePushOnThisDevice.name, () => {
    it('registers this installation once the OS grants', async () => {
      (PushNotifications.requestPermissions as jest.Mock).mockResolvedValue({
        receive: 'granted',
      });

      await expect(
        enablePushOnThisDevice(platformStub(true), 'user-1'),
      ).resolves.toBe('granted');
      expect(registerCurrentPushInstallation).toHaveBeenCalledWith('user-1');
    });

    it('registers nothing when the OS denies', async () => {
      (PushNotifications.requestPermissions as jest.Mock).mockResolvedValue({
        receive: 'denied',
      });

      await expect(
        enablePushOnThisDevice(platformStub(true), 'user-1'),
      ).resolves.toBe('denied');
      expect(registerCurrentPushInstallation).not.toHaveBeenCalled();
    });

    it('registers nothing where push is unsupported', async () => {
      await expect(
        enablePushOnThisDevice(platformStub(false), 'user-1'),
      ).resolves.toBe('unsupported');
      expect(registerCurrentPushInstallation).not.toHaveBeenCalled();
    });
  });
});
