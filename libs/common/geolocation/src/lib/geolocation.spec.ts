import { Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { getCurrentPosition } from './geolocation';
import { lastValueFrom } from 'rxjs';

jest.mock('@capacitor/geolocation');

describe('Geolocation Service', () => {
  let platform: Platform;
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
    platform = {
      is: jest.fn(),
    } as unknown as Platform;

    // Reset all mocks
    jest.clearAllMocks();

    Geolocation.checkPermissions = jest.fn();
    Geolocation.requestPermissions = jest.fn();
    Geolocation.getCurrentPosition = jest.fn();
  });

  describe('getCurrentPosition', () => {
    it('should use native implementation on capacitor platform', async () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      (Geolocation.checkPermissions as jest.Mock).mockResolvedValue({
        location: 'granted',
      });
      (Geolocation.getCurrentPosition as jest.Mock).mockResolvedValue(
        mockPosition,
      );

      const result = await lastValueFrom(getCurrentPosition(platform));

      expect(platform.is).toHaveBeenCalledWith('capacitor');
      expect(Geolocation.checkPermissions).toHaveBeenCalled();
      expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith({
        timeout: 8000,
      });
      expect(result).toEqual(mockPosition);
    });

    it('should request permissions if not granted on native platform', async () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      (Geolocation.checkPermissions as jest.Mock).mockResolvedValue({
        location: 'denied',
      });
      (Geolocation.requestPermissions as jest.Mock).mockResolvedValue({
        location: 'granted',
      });
      (Geolocation.getCurrentPosition as jest.Mock).mockResolvedValue(
        mockPosition,
      );

      await getCurrentPosition(platform);

      expect(Geolocation.requestPermissions).toHaveBeenCalled();
    });

    it('should use web implementation on non-capacitor platform', async () => {
      (platform.is as jest.Mock).mockReturnValue(false);
      const mockNavigator = {
        geolocation: {
          getCurrentPosition: jest.fn((success) => success(mockPosition)),
        },
      };
      jest
        .spyOn(global, 'navigator', 'get')
        .mockReturnValue(mockNavigator as any);

      const result = await lastValueFrom(getCurrentPosition(platform));

      expect(platform.is).toHaveBeenCalledWith('capacitor');
      expect(mockNavigator.geolocation.getCurrentPosition).toHaveBeenCalled();
      expect(result).toEqual(mockPosition);
    });

    it('should reject if geolocation is not supported on web', async () => {
      (platform.is as jest.Mock).mockReturnValue(false);
      jest.spyOn(global, 'navigator', 'get').mockReturnValue({} as any);

      await expect(lastValueFrom(getCurrentPosition(platform))).rejects.toThrow(
        'Geolocation is not supported',
      );
    });
  });
});
