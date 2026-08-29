import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { AppLauncher } from '@capacitor/app-launcher';
import { AppSettings } from 'app-settings';
import {
  getMediaLocationPermissionState,
  hasMediaLocationPermission,
  openMediaLocationSettings,
  requestMediaLocationPermission,
} from './media-location';

jest.mock('@capacitor/core');

// Automocking these modules yields undefined members - they export objects
// built by `registerPlugin`, not classes - so stub them out.
jest.mock('@capawesome/capacitor-file-picker', () => ({
  FilePicker: { checkPermissions: jest.fn(), requestPermissions: jest.fn() },
}));
jest.mock('@capacitor/app-launcher', () => ({
  AppLauncher: { openUrl: jest.fn() },
}));
jest.mock('app-settings', () => ({
  AppSettings: {
    openNotificationSettings: jest.fn(),
    openAppDetailsSettings: jest.fn(),
  },
}));

const onPlatform = (platform: string): void => {
  (Capacitor.getPlatform as jest.Mock).mockReturnValue(platform);
};

const checkResolves = (accessMediaLocation: string): void => {
  (FilePicker.checkPermissions as jest.Mock).mockResolvedValue({
    accessMediaLocation,
    readExternalStorage: 'denied',
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe(getMediaLocationPermissionState.name, () => {
  describe('given Android', () => {
    beforeEach(() => onPlatform('android'));

    it('should report a granted permission', async () => {
      checkResolves('granted');

      await expect(getMediaLocationPermissionState()).resolves.toBe('granted');
    });

    it('should report a denied permission', async () => {
      checkResolves('denied');

      await expect(getMediaLocationPermissionState()).resolves.toBe('denied');
    });

    it('should fold prompt-with-rationale into prompt', async () => {
      // Android's "ask again with an explanation" still has a prompt to spend,
      // so it must not be reported as the dead end `denied` is.
      checkResolves('prompt-with-rationale');

      await expect(getMediaLocationPermissionState()).resolves.toBe('prompt');
    });

    it('should report a failed check as denied', async () => {
      (FilePicker.checkPermissions as jest.Mock).mockRejectedValue(
        new Error('no such method'),
      );

      await expect(getMediaLocationPermissionState()).resolves.toBe('denied');
    });
  });

  describe.each(['ios', 'web'])('given %s', (platform) => {
    beforeEach(() => onPlatform(platform));

    it('should report the permission as unsupported without asking the picker', async () => {
      await expect(getMediaLocationPermissionState()).resolves.toBe(
        'unsupported',
      );
      expect(FilePicker.checkPermissions).not.toHaveBeenCalled();
    });
  });
});

describe(hasMediaLocationPermission.name, () => {
  it('should be true only on a grant', async () => {
    onPlatform('android');
    checkResolves('granted');

    await expect(hasMediaLocationPermission()).resolves.toBe(true);
  });

  it('should be false where the permission does not exist', async () => {
    onPlatform('ios');

    await expect(hasMediaLocationPermission()).resolves.toBe(false);
  });
});

describe(requestMediaLocationPermission.name, () => {
  describe('given Android', () => {
    beforeEach(() => onPlatform('android'));

    it('should request only the media location permission', async () => {
      (FilePicker.requestPermissions as jest.Mock).mockResolvedValue({
        accessMediaLocation: 'granted',
      });

      await expect(requestMediaLocationPermission()).resolves.toBe('granted');
      expect(FilePicker.requestPermissions).toHaveBeenCalledWith({
        permissions: ['accessMediaLocation'],
      });
    });

    it('should report anything short of a grant as denied', async () => {
      (FilePicker.requestPermissions as jest.Mock).mockResolvedValue({
        accessMediaLocation: 'prompt',
      });

      await expect(requestMediaLocationPermission()).resolves.toBe('denied');
    });

    it('should report a failed request as denied', async () => {
      (FilePicker.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('rejected'),
      );

      await expect(requestMediaLocationPermission()).resolves.toBe('denied');
    });
  });

  it('should never prompt where the permission does not exist', async () => {
    onPlatform('ios');

    await expect(requestMediaLocationPermission()).resolves.toBe('unsupported');
    expect(FilePicker.requestPermissions).not.toHaveBeenCalled();
  });
});

describe(openMediaLocationSettings.name, () => {
  it('should open the app details page on Android', async () => {
    onPlatform('android');
    (AppSettings.openAppDetailsSettings as jest.Mock).mockResolvedValue({
      opened: true,
    });

    await expect(openMediaLocationSettings()).resolves.toBe(true);
  });

  it('should report an Android page that did not open', async () => {
    onPlatform('android');
    (AppSettings.openAppDetailsSettings as jest.Mock).mockResolvedValue({
      opened: false,
    });

    await expect(openMediaLocationSettings()).resolves.toBe(false);
  });

  it('should use the app settings URL scheme on iOS', async () => {
    onPlatform('ios');
    (AppLauncher.openUrl as jest.Mock).mockResolvedValue(undefined);

    await expect(openMediaLocationSettings()).resolves.toBe(true);
    expect(AppLauncher.openUrl).toHaveBeenCalledWith({ url: 'app-settings:' });
  });

  it('should report no page on the web', async () => {
    onPlatform('web');

    await expect(openMediaLocationSettings()).resolves.toBe(false);
  });

  it('should report a throwing settings call as not opened', async () => {
    onPlatform('android');
    (AppSettings.openAppDetailsSettings as jest.Mock).mockRejectedValue(
      new Error('no activity'),
    );

    await expect(openMediaLocationSettings()).resolves.toBe(false);
  });
});
