import { Geolocation } from '@capacitor/geolocation';
import { getCurrentPosition, requestLocationPermission } from './geolocation';
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
        });
        expect(result).toEqual(mockPosition);
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
