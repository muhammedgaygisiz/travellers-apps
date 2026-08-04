import { Geolocation } from '@capacitor/geolocation';
import {
  getCurrentPosition,
  getLocationPermissionState,
  hasLocationPermission,
  LOCATION_READ_TIMEOUT_MS,
  LocationReadTimeoutError,
  openLocationSettings,
  requestLocationPermission,
} from './geolocation';
import { AppLauncher } from '@capacitor/app-launcher';

// Automocking this module yields an undefined `AppLauncher`, so stub it out.
jest.mock('@capacitor/app-launcher', () => ({
  AppLauncher: { openUrl: jest.fn(), canOpenUrl: jest.fn() },
}));
import { lastValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';

jest.mock('@capacitor/geolocation');
jest.mock('@capacitor/core');

const mockPosition: GeolocationPosition = {
  coords: {
    latitude: 51.5074,
    longitude: -0.1278,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: 1234567890,
} as GeolocationPosition;

describe(getCurrentPosition.name, () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('given native platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    });

    describe('and permission is not granted', () => {
      beforeEach(() => {
        (Geolocation.checkPermissions as jest.Mock).mockResolvedValue({
          location: 'denied',
        });
      });

      it('should not request permissions', async () => {
        await expect(lastValueFrom(getCurrentPosition())).rejects.toThrow();

        expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
      });

      it('should not read the position, which would prompt', async () => {
        await expect(lastValueFrom(getCurrentPosition())).rejects.toThrow(
          'Location permission is not granted',
        );

        expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
      });
    });

    describe('and permission is granted', () => {
      beforeEach(() => {
        (Geolocation.checkPermissions as jest.Mock).mockResolvedValue({
          location: 'granted',
        });
      });

      it('should not request permissions', async () => {
        await lastValueFrom(getCurrentPosition());

        expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
      });

      it('should read current position', async () => {
        (Geolocation.getCurrentPosition as jest.Mock).mockResolvedValue(
          mockPosition,
        );

        const result = await lastValueFrom(getCurrentPosition());

        expect(Geolocation.checkPermissions).toHaveBeenCalled();
        expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith({
          maximumAge: 60000,
          timeout: LOCATION_READ_TIMEOUT_MS,
        });
        expect(result).toEqual(mockPosition);
      });

      /**
       * The plugin's own timeout covers web and Android, but iOS hands the
       * request to CoreLocation without one. Callers gate visible loading state
       * on this settling, so a read that never answers has to fail on its own
       * (issue #1230).
       */
      it('should fail a read that never answers', async () => {
        jest.useFakeTimers();
        (Geolocation.getCurrentPosition as jest.Mock).mockReturnValue(
          new Promise(() => undefined),
        );

        try {
          const read = lastValueFrom(getCurrentPosition());
          const settled = expect(read).rejects.toThrow(
            LocationReadTimeoutError,
          );

          await jest.advanceTimersByTimeAsync(LOCATION_READ_TIMEOUT_MS);
          await settled;
        } finally {
          // `clearAllMocks` keeps implementations, so the never-settling promise
          // would otherwise hang every read that runs after this one.
          (Geolocation.getCurrentPosition as jest.Mock).mockReset();
          jest.useRealTimers();
        }
      });
    });
  });

  describe('given not native platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      (Geolocation.checkPermissions as jest.Mock).mockResolvedValue({
        location: 'prompt',
      });
    });

    it('should not request permission', async () => {
      await lastValueFrom(getCurrentPosition());

      expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
    });

    it('should read current position, leaving the ask to the browser', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockResolvedValue(
        mockPosition,
      );

      const result = await lastValueFrom(getCurrentPosition());

      expect(result).toEqual(mockPosition);
    });
  });
});

describe(requestLocationPermission.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('given native platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    });

    it('should report a grant', async () => {
      (Geolocation.requestPermissions as jest.Mock).mockResolvedValue({
        location: 'granted',
      });

      await expect(requestLocationPermission()).resolves.toBe('granted');
    });

    it('should report a denial', async () => {
      (Geolocation.requestPermissions as jest.Mock).mockResolvedValue({
        location: 'denied',
      });

      await expect(requestLocationPermission()).resolves.toBe('denied');
    });

    it('should treat a failed request as a denial', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      (Geolocation.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(requestLocationPermission()).resolves.toBe('denied');
    });
  });

  describe('given not native platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
    });

    it('should report that there is no OS prompt to answer', async () => {
      await expect(requestLocationPermission()).resolves.toBe('unsupported');

      expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
    });
  });
});

describe(hasLocationPermission.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('given native platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    });

    it('reports the grant without ever prompting', async () => {
      (Geolocation.checkPermissions as jest.Mock).mockResolvedValue({
        location: 'granted',
      });

      await expect(hasLocationPermission()).resolves.toBe(true);
      expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
    });

    it.each(['denied', 'prompt', 'prompt-with-rationale'])(
      'reports no permission when the OS says %s',
      async (location) => {
        // A stored preference can outlive the OS grant (reinstall, revoke), so
        // anything short of "granted" must read as unavailable.
        (Geolocation.checkPermissions as jest.Mock).mockResolvedValue({
          location,
        });

        await expect(hasLocationPermission()).resolves.toBe(false);
      },
    );

    it('treats a failed check as no permission', async () => {
      jest.spyOn(console, 'warn').mockImplementation();
      (Geolocation.checkPermissions as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      await expect(hasLocationPermission()).resolves.toBe(false);
    });
  });

  describe('given not native platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
    });

    it('defers to the browser, which asks on read', async () => {
      await expect(hasLocationPermission()).resolves.toBe(true);
      expect(Geolocation.checkPermissions).not.toHaveBeenCalled();
    });
  });
});

describe(getLocationPermissionState.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
  });

  it.each([
    ['granted', 'granted'],
    ['denied', 'denied'],
    ['prompt', 'prompt'],
    // Android's "ask again with an explanation" still has a prompt to spend.
    ['prompt-with-rationale', 'prompt'],
  ])('maps an OS state of %s to %s', async (location, expected) => {
    (Geolocation.checkPermissions as jest.Mock).mockResolvedValue({ location });

    await expect(getLocationPermissionState()).resolves.toBe(expected);
    expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
  });

  it('treats a failed check as denied so the caller offers settings', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    (Geolocation.checkPermissions as jest.Mock).mockRejectedValue(
      new Error('boom'),
    );

    await expect(getLocationPermissionState()).resolves.toBe('denied');
  });

  it('reports unsupported off native, where the browser asks on read', async () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

    await expect(getLocationPermissionState()).resolves.toBe('unsupported');
  });
});

describe(openLocationSettings.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the app settings page on iOS', async () => {
    (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
    (AppLauncher.openUrl as jest.Mock).mockResolvedValue({ completed: true });

    await expect(openLocationSettings()).resolves.toBe(true);
    expect(AppLauncher.openUrl).toHaveBeenCalledWith({ url: 'app-settings:' });
  });

  it('reports failure when the settings page cannot be opened', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
    (AppLauncher.openUrl as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(openLocationSettings()).resolves.toBe(false);
  });

  it.each(['android', 'web'])(
    'reports no settings route on %s',
    async (platform) => {
      // Only iOS exposes an app-settings URL that App Launcher can open.
      (Capacitor.getPlatform as jest.Mock).mockReturnValue(platform);

      await expect(openLocationSettings()).resolves.toBe(false);
      expect(AppLauncher.openUrl).not.toHaveBeenCalled();
    },
  );
});
