import { Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';

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
        timeout: 5000,
      }
    );
  });
};

const getGeoLocationFromNativePlatform = async () => {
  const permissionStatus = await Geolocation.checkPermissions();

  if (permissionStatus.location !== 'granted') {
    await Geolocation.requestPermissions();
  }

  return await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 5000,
  });
};

export const getCurrentPosition = (platform: Platform) => {
  if (platform.is('capacitor')) {
    return getGeoLocationFromNativePlatform();
  }

  return getGeoLocationFromWebPlatform();
};
