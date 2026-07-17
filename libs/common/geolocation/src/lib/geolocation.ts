import { Geolocation } from '@capacitor/geolocation';
import { from, Observable } from 'rxjs';
import { Position } from '@capacitor/geolocation/dist/esm/definitions';
import { Capacitor } from '@capacitor/core';

const ONE_MINUTE = 60 * 1000;

/**
 * Outcome of an in-context location permission request.
 *
 * `unsupported` means no OS prompt exists to answer — the web build, where the
 * browser asks on read instead — and is deliberately distinct from `denied` so
 * callers do not record a refusal the user never made.
 */
export type LocationPermissionResult = 'granted' | 'denied' | 'unsupported';

/** Thrown by {@link getCurrentPosition} instead of triggering a cold OS prompt. */
export class LocationPermissionNotGrantedError extends Error {
  constructor() {
    super('Location permission is not granted');
    this.name = 'LocationPermissionNotGrantedError';
  }
}

const readCurrentPosition = async (): Promise<Position> => {
  const permissionStatus = await Geolocation.checkPermissions();

  // `checkPermissions` never prompts, but `getCurrentPosition` does: the native
  // plugin asks the OS itself when permission is undetermined. Bailing out here
  // keeps a read on an undecided permission from spending the prompt that the
  // onboarding location step owns (epic #850, issue #1023).
  if (Capacitor.isNativePlatform() && permissionStatus.location !== 'granted') {
    throw new LocationPermissionNotGrantedError();
  }

  return await Geolocation.getCurrentPosition({
    maximumAge: ONE_MINUTE,
  });
};

/**
 * Reads the device position on an existing grant. It never shows the OS
 * permission prompt.
 *
 * The prompt is owned by the onboarding location step
 * ({@link requestLocationPermission}), which explains what the position is used
 * for first. Asking here — on every login — would burn the OS's single prompt
 * before the user has any context for the decision.
 *
 * Errors when permission is not granted; callers already treat a missing
 * position as a non-fatal outcome.
 */
export const getCurrentPosition = (): Observable<
  GeolocationPosition | Position
> => {
  return from(readCurrentPosition());
};

/**
 * Shows the OS location permission prompt. Call this only after the user has
 * been told what the position is for; the OS shows its prompt once per install,
 * so a cold ask is spent for good.
 *
 * Returns the outcome so the caller can record the choice. Denial is a normal
 * result, not an error — the onboarding flow continues either way.
 */
export const requestLocationPermission =
  async (): Promise<LocationPermissionResult> => {
    if (!Capacitor.isNativePlatform()) {
      return 'unsupported';
    }

    try {
      const permissionStatus = await Geolocation.requestPermissions();

      return permissionStatus.location === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.error('Location permission request failed: ', error);

      return 'denied';
    }
  };
