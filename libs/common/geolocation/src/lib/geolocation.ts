import { Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { from, Observable } from 'rxjs';
import { Position } from '@capacitor/geolocation/dist/esm/definitions';

const TIMEOUT = 8000;

const getGeoLocationFromWebPlatform = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: TIMEOUT,
      },
    );
  });
};

const getGeoLocationFromNativePlatform = async (): Promise<Position> => {
  const permissionStatus = await Geolocation.checkPermissions();

  if (permissionStatus.location !== 'granted') {
    await Geolocation.requestPermissions();
  }

  return await Geolocation.getCurrentPosition({
    timeout: TIMEOUT,
  });
};

export const getCurrentPosition = (
  platform: Platform,
): Observable<GeolocationPosition | Position> => {
  if (platform.is('capacitor')) {
    return from(getGeoLocationFromNativePlatform());
  }

  return from(getGeoLocationFromWebPlatform());
};
