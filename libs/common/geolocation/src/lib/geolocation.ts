import { Geolocation } from '@capacitor/geolocation';
import { from, Observable } from 'rxjs';
import { Position } from '@capacitor/geolocation/dist/esm/definitions';
import { Capacitor } from '@capacitor/core';

const ONE_MINUTE = 60 * 1000;

const getCurrentPositionFromFirebase = async (): Promise<Position> => {
  const permissionStatus = await Geolocation.checkPermissions();

  if (Capacitor.isNativePlatform() && permissionStatus.location !== 'granted') {
    await Geolocation.requestPermissions();
  }

  return await Geolocation.getCurrentPosition({
    maximumAge: ONE_MINUTE,
  });
};

export const getCurrentPosition = (): Observable<
  GeolocationPosition | Position
> => {
  return from(getCurrentPositionFromFirebase());
};
