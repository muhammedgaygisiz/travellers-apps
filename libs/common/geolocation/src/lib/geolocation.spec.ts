import { Geolocation } from '@capacitor/geolocation';
import { getCurrentPosition } from './geolocation';
import { lastValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';

jest.mock('@capacitor/geolocation');
jest.mock('@capacitor/core');

describe(getCurrentPosition.name, () => {
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

      it('should request permissions', async () => {
        await lastValueFrom(getCurrentPosition());

        expect(Geolocation.requestPermissions).toHaveBeenCalled();
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
    });

    it('should not request permission', async () => {
      await lastValueFrom(getCurrentPosition());

      expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
    });
  });
});
