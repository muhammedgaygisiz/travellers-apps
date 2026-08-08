import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import {
  describeCurrentInstallation,
  getInstallationId,
  readInstallationId,
  loadPushInstallations,
  registerCurrentPushInstallation,
  registerPushInstallation,
  setPushInstallationEnabled,
} from './push-installation';

// Automocking these packages yields undefined members, so stub them outright
// rather than transforming their ESM for a handful of document writes.
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    setDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getCollection: jest.fn(),
  },
}));
jest.mock('@capacitor-firebase/messaging', () => ({
  FirebaseMessaging: { getToken: jest.fn() },
}));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));
jest.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: jest.fn(() => 'ios') },
}));
jest.mock('@capacitor/app', () => ({
  App: { getInfo: jest.fn() },
}));
jest.mock('@capacitor/device', () => ({
  Device: { getInfo: jest.fn() },
}));

const INSTALLATION_ID = 'installation-a';

interface StoredToken {
  id: string;
  data: Record<string, unknown>;
}

const storedTokens = (...snapshots: StoredToken[]): void => {
  (FirebaseFirestore.getCollection as jest.Mock).mockResolvedValue({
    snapshots,
  });
};

/** The data written to a given document reference. */
const writtenTo = (reference: string): Record<string, unknown> | undefined =>
  (FirebaseFirestore.setDocument as jest.Mock).mock.calls.find(
    ([call]) => call.reference === reference,
  )?.[0]?.data;

const setUserAgent = (userAgent: string): void => {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
};

describe('push-installation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
    (Preferences.get as jest.Mock).mockResolvedValue({
      value: INSTALLATION_ID,
    });
    (Preferences.set as jest.Mock).mockResolvedValue(undefined);
    (App.getInfo as jest.Mock).mockResolvedValue({
      version: '1.0.1',
      build: '88',
    });
    (Device.getInfo as jest.Mock).mockResolvedValue({ osVersion: '26.5.2' });
    (FirebaseFirestore.setDocument as jest.Mock).mockResolvedValue(undefined);
    (FirebaseFirestore.deleteDocument as jest.Mock).mockResolvedValue(
      undefined,
    );
    (FirebaseMessaging.getToken as jest.Mock).mockResolvedValue({
      token: 'fcm-token',
    });
    storedTokens();
    // The version WKWebView freezes into its user agent, eight major releases
    // behind the device the tests describe (issue #1263).
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe(readInstallationId.name, () => {
    it('returns the persisted id without creating one', async () => {
      await expect(readInstallationId()).resolves.toBe(INSTALLATION_ID);
      expect(Preferences.set).not.toHaveBeenCalled();
    });

    it('creates nothing where this installation has no id yet', async () => {
      // Listing devices on the web build, or before push was ever set up, must
      // not leave a stored identity behind.
      (Preferences.get as jest.Mock).mockResolvedValue({ value: null });

      await expect(readInstallationId()).resolves.toBeUndefined();
      expect(Preferences.set).not.toHaveBeenCalled();
    });

    it('creates nothing when the preference store cannot be read', async () => {
      (Preferences.get as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(readInstallationId()).resolves.toBeUndefined();
      expect(Preferences.set).not.toHaveBeenCalled();
    });
  });

  describe(getInstallationId.name, () => {
    it('reuses the persisted installation id across launches', async () => {
      await expect(getInstallationId()).resolves.toBe(INSTALLATION_ID);
      expect(Preferences.set).not.toHaveBeenCalled();
    });

    it('generates and persists an id on first use', async () => {
      (Preferences.get as jest.Mock).mockResolvedValue({ value: null });

      const installationId = await getInstallationId();

      expect(installationId).toHaveLength(36);
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'push-installation-id',
        value: installationId,
      });
    });

    it('still yields an id when the preference store cannot be read', async () => {
      (Preferences.get as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(getInstallationId()).resolves.toHaveLength(36);
    });
  });

  describe(describeCurrentInstallation.name, () => {
    it('reports the real iOS version, not the one frozen in the user agent', async () => {
      // The user agent claims 18.7 on a device running 26.5.2. Parsing it
      // printed a confidently wrong version next to the user's iPhone and
      // stored it with the token (issue #1263).
      await expect(describeCurrentInstallation()).resolves.toEqual({
        platform: 'ios',
        deviceLabel: 'iPhone',
        osVersion: '26.5.2',
        appVersion: '1.0.1 (88)',
      });
    });

    it('labels an Android device with its marketing model and native version', async () => {
      // The Android user agent happens to be truthful about the version, but
      // both native platforms answer from the same source rather than one
      // being trusted for being accidentally right.
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
      (Device.getInfo as jest.Mock).mockResolvedValue({ osVersion: '15' });
      setUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A) AppleWebKit/537.36',
      );

      await expect(describeCurrentInstallation()).resolves.toEqual(
        expect.objectContaining({
          platform: 'android',
          deviceLabel: 'Pixel 7',
          osVersion: '15',
        }),
      );
    });

    it('omits the version rather than the frozen one when the device cannot be read', async () => {
      (Device.getInfo as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(describeCurrentInstallation()).resolves.toEqual(
        expect.objectContaining({ deviceLabel: 'iPhone', osVersion: '' }),
      );
    });

    it('falls back to the browser name where there is no native app info', async () => {
      // A browser has no device OS worth printing next to its name, so the web
      // path never asks for one.
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');
      (App.getInfo as jest.Mock).mockRejectedValue(new Error('not native'));
      setUserAgent('Mozilla/5.0 (Macintosh) Chrome/120.0.0.0 Safari/537.36');

      await expect(describeCurrentInstallation()).resolves.toEqual({
        platform: 'web',
        deviceLabel: 'Chrome',
        osVersion: '',
        appVersion: '',
      });
      expect(Device.getInfo).not.toHaveBeenCalled();
    });
  });

  describe(loadPushInstallations.name, () => {
    it('returns the registered installations, most recently seen first', async () => {
      storedTokens(
        {
          id: 'token-old',
          data: {
            installationId: 'installation-b',
            enabled: false,
            lastSeenAt: 10,
          },
        },
        {
          id: 'token-new',
          data: {
            installationId: INSTALLATION_ID,
            enabled: true,
            lastSeenAt: 20,
          },
        },
      );

      const installations = await loadPushInstallations('user-1');

      expect(installations.map(({ token }) => token)).toEqual([
        'token-new',
        'token-old',
      ]);
    });

    it('treats a legacy token without an enabled flag as delivering', async () => {
      // The backend defaults a missing flag to true, so the list has to agree
      // or a legacy row would show a switch that contradicts delivery.
      storedTokens({ id: 'legacy-token', data: { platform: 'ios' } });

      const [installation] = await loadPushInstallations('user-1');

      expect(installation).toEqual(
        expect.objectContaining({
          token: 'legacy-token',
          enabled: true,
          installationId: undefined,
          deviceLabel: undefined,
        }),
      );
    });

    it('ignores the placeholder the pre-#1184 registration wrote', async () => {
      // The old code stored `tbd-xxx` for values it did not have. Reading it
      // back as real data printed it next to the user's device.
      storedTokens({
        id: 'legacy-token',
        data: { platform: 'ios', appVersion: 'tbd-xxx', deviceId: 'tbd-xxx' },
      });

      const [installation] = await loadPushInstallations('user-1');

      expect(installation).toEqual(
        expect.objectContaining({ platform: 'ios', appVersion: undefined }),
      );
    });

    it('returns nothing when the tokens cannot be read', async () => {
      (FirebaseFirestore.getCollection as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(loadPushInstallations('user-1')).resolves.toEqual([]);
    });
  });

  describe(setPushInstallationEnabled.name, () => {
    it('merges the flag so a legacy document keeps its other fields', async () => {
      await setPushInstallationEnabled('user-1', 'token-1', false);

      expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith({
        reference: 'users/user-1/pushTokens/token-1',
        data: { enabled: false },
        merge: true,
      });
    });
  });

  describe(registerPushInstallation.name, () => {
    it('stores the installation metadata against the token and the index', async () => {
      await registerPushInstallation('user-1', 'token-1');

      expect(writtenTo('users/user-1/pushTokens/token-1')).toEqual(
        expect.objectContaining({
          installationId: INSTALLATION_ID,
          platform: 'ios',
          deviceLabel: 'iPhone',
          // The stored value is the one the row displays, so a token written
          // from a frozen user agent cannot outlive the fix (issue #1263).
          osVersion: '26.5.2',
          appVersion: '1.0.1 (88)',
          enabled: true,
        }),
      );
      expect(writtenTo('pushTokens/token-1')).toEqual(
        expect.objectContaining({
          userUid: 'user-1',
          installationId: INSTALLATION_ID,
          platform: 'ios',
        }),
      );
    });

    it('keeps a disabled installation disabled when its token is refreshed', async () => {
      storedTokens({
        id: 'token-1',
        data: {
          installationId: INSTALLATION_ID,
          enabled: false,
          createdAt: 5,
          lastSeenAt: 10,
        },
      });

      await registerPushInstallation('user-1', 'token-1');

      expect(writtenTo('users/user-1/pushTokens/token-1')).toEqual(
        expect.objectContaining({ enabled: false, createdAt: 5 }),
      );
    });

    it('carries the enabled state onto a rotated token', async () => {
      storedTokens({
        id: 'token-old',
        data: {
          installationId: INSTALLATION_ID,
          enabled: false,
          createdAt: 5,
          lastSeenAt: 10,
        },
      });

      await registerPushInstallation('user-1', 'token-new');

      expect(writtenTo('users/user-1/pushTokens/token-new')).toEqual(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('removes the superseded token and its reverse index after a rotation', async () => {
      // At most one active token per installation, otherwise the settings list
      // would show the same device twice and delivery would double up.
      storedTokens({
        id: 'token-old',
        data: {
          installationId: INSTALLATION_ID,
          enabled: true,
          lastSeenAt: 10,
        },
      });

      await registerPushInstallation('user-1', 'token-new');

      expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
        reference: 'users/user-1/pushTokens/token-old',
      });
      expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
        reference: 'pushTokens/token-old',
      });
    });

    it('leaves another installation of the same account untouched', async () => {
      storedTokens({
        id: 'other-token',
        data: {
          installationId: 'installation-b',
          enabled: false,
          lastSeenAt: 10,
        },
      });

      await registerPushInstallation('user-1', 'token-1');

      expect(FirebaseFirestore.deleteDocument).not.toHaveBeenCalled();
      expect(writtenTo('users/user-1/pushTokens/token-1')).toEqual(
        expect.objectContaining({ enabled: true }),
      );
    });
  });

  describe(registerCurrentPushInstallation.name, () => {
    it('registers the current FCM token', async () => {
      await expect(registerCurrentPushInstallation('user-1')).resolves.toBe(
        true,
      );

      expect(writtenTo('users/user-1/pushTokens/fcm-token')).toBeDefined();
    });

    it.each([[''], ['   '], [null]])(
      'registers nothing when the token comes back as %p',
      async (token) => {
        (FirebaseMessaging.getToken as jest.Mock).mockResolvedValue({ token });

        await expect(registerCurrentPushInstallation('user-1')).resolves.toBe(
          false,
        );
        expect(FirebaseFirestore.setDocument).not.toHaveBeenCalled();
      },
    );

    it('registers nothing when the token cannot be read', async () => {
      (FirebaseMessaging.getToken as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(registerCurrentPushInstallation('user-1')).resolves.toBe(
        false,
      );
      expect(FirebaseFirestore.setDocument).not.toHaveBeenCalled();
    });
  });
});
