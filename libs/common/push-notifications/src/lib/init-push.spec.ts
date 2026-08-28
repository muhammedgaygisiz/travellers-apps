import { PushNotifications } from '@capacitor/push-notifications';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { AppSettings } from './app-settings';
import type { Platform } from '@ionic/angular';
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
// The Android settings route is a native intent fired by the app's own
// Capacitor plugin, so there is nothing to exercise here beyond the fact that
// the platform branch reaches it and honours what it reports.
jest.mock('./app-settings', () => ({
  AppSettings: { openNotificationSettings: jest.fn() },
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

/** Receives the surface a tapped notification asked for. */
const onTapStub = (): jest.Mock => jest.fn();

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
      await initPushListeners(platformStub(false), 'user-1', onTapStub());

      expect(PushNotifications.removeAllListeners).not.toHaveBeenCalled();
      expect(PushNotifications.addListener).not.toHaveBeenCalled();
      expect(PushNotifications.register).not.toHaveBeenCalled();
    });

    it('stops before registering listeners when there is no signed-in user', async () => {
      await initPushListeners(platformStub(true), undefined, onTapStub());

      expect(PushNotifications.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(PushNotifications.addListener).not.toHaveBeenCalled();
      expect(PushNotifications.register).not.toHaveBeenCalled();
    });

    it('carries on when there are no previous listeners to remove', async () => {
      (PushNotifications.removeAllListeners as jest.Mock).mockRejectedValue(
        new Error('nothing to remove'),
      );

      await initPushListeners(platformStub(true), 'user-1', onTapStub());

      expect(PushNotifications.addListener).toHaveBeenCalled();
      expect(PushNotifications.register).toHaveBeenCalledTimes(1);
    });

    it('registers for push when permission was already granted', async () => {
      await initPushListeners(platformStub(true), 'user-1', onTapStub());

      expect(PushNotifications.register).toHaveBeenCalledTimes(1);
    });

    it.each(['denied', 'prompt', 'prompt-with-rationale'])(
      'does not register, or prompt, when permission is %s',
      async (receive) => {
        // Registering here would spend the OS prompt that onboarding owns.
        grantPermission(receive);

        await initPushListeners(platformStub(true), 'user-1', onTapStub());

        expect(PushNotifications.register).not.toHaveBeenCalled();
        expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
      },
    );

    describe('on registration', () => {
      it('registers the current installation, preserving its enabled state', async () => {
        // Delegating keeps the login refresh on the same path as the explicit
        // setup action, so neither can re-enable a disabled installation.
        await initPushListeners(platformStub(true), 'user-1', onTapStub());

        await listenerFor('registration')(undefined);

        expect(registerCurrentPushInstallation).toHaveBeenCalledWith('user-1');
      });
    });

    it('surfaces a registration error without throwing', async () => {
      await initPushListeners(platformStub(true), 'user-1', onTapStub());

      expect(() =>
        listenerFor('registrationError')({ error: 'boom' }),
      ).not.toThrow();
    });

    it('accepts a received notification without reporting a target', async () => {
      const onTap = onTapStub();
      await initPushListeners(platformStub(true), 'user-1', onTap);

      listenerFor('pushNotificationReceived')({ title: 'hi' });

      expect(onTap).not.toHaveBeenCalled();
    });

    describe('on notification tap', () => {
      // Which surface each payload maps to is `notification-target.spec.ts`;
      // what matters here is that a tap is reported rather than navigated, so
      // the caller can hold it until startup routing has settled (issue #1244).
      const tap = async (data: Record<string, string>): Promise<jest.Mock> => {
        const onTap = onTapStub();
        await initPushListeners(platformStub(true), 'user-1', onTap);

        listenerFor('pushNotificationActionPerformed')({
          notification: { data },
        });

        return onTap;
      };

      it('reports the follower profile for a NEW_FOLLOWER notification', async () => {
        const onTap = await tap({
          type: 'NEW_FOLLOWER',
          followerUid: 'user-2',
        });

        expect(onTap).toHaveBeenCalledWith({
          commands: ['profile', 'user-2'],
        });
      });

      it('reports the recipient-dependent target of a country badge', async () => {
        // The recipient is known here and nowhere downstream, so the listener
        // has to resolve it before handing the target on.
        const onTap = await tap({
          type: 'NEW_COUNTRY_BADGE',
          userId: 'user-1',
          countryCode: 'IT',
        });

        expect(onTap).toHaveBeenCalledWith({ commands: ['my-profile'] });
      });

      it('reports the target exactly once per tap', async () => {
        const onTap = await tap({ type: 'NEW_BITE', biteId: 'bite-1' });

        expect(onTap).toHaveBeenCalledTimes(1);
      });

      it('reports nothing for an unknown notification type', async () => {
        const onTap = await tap({ type: 'SOMETHING_ELSE' });

        expect(onTap).not.toHaveBeenCalled();
      });

      it('reports nothing when the payload is missing its target id', async () => {
        // A malformed payload must not navigate to a half-built route.
        const onTap = await tap({ type: 'NEW_BITE' });

        expect(onTap).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
      });

      it('reports nothing when the notification carries no data at all', async () => {
        const onTap = onTapStub();
        await initPushListeners(platformStub(true), 'user-1', onTap);

        listenerFor('pushNotificationActionPerformed')({ notification: {} });

        expect(onTap).not.toHaveBeenCalled();
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

    it('opens the app notification settings on Android', async () => {
      // Android has no App Launcher route to the app's own settings page, so
      // the wrapper's native intent is the only way back (issue #1386).
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
      (AppSettings.openNotificationSettings as jest.Mock).mockResolvedValue({
        opened: true,
      });

      await expect(openPushSettings()).resolves.toBe(true);
      expect(AppSettings.openNotificationSettings).toHaveBeenCalled();
      expect(AppLauncher.openUrl).not.toHaveBeenCalled();
    });

    it('reports an Android settings page that did not open', async () => {
      // A device whose ROM has no activity for the intent leaves the caller to
      // keep guiding the user rather than to claim it handed them over.
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
      (AppSettings.openNotificationSettings as jest.Mock).mockResolvedValue({
        opened: false,
      });

      await expect(openPushSettings()).resolves.toBe(false);
    });

    it('reports that there is no settings page to open on the web', async () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      await expect(openPushSettings()).resolves.toBe(false);
      expect(AppLauncher.openUrl).not.toHaveBeenCalled();
      expect(AppSettings.openNotificationSettings).not.toHaveBeenCalled();
    });

    it('reports a failed launch instead of throwing', async () => {
      (AppLauncher.openUrl as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(openPushSettings()).resolves.toBe(false);
    });

    it('reports a failed Android intent instead of throwing', async () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
      (AppSettings.openNotificationSettings as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

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
