import { Geolocation } from '@capacitor/geolocation';
import { from, Observable } from 'rxjs';
import { Position } from '@capacitor/geolocation/dist/esm/definitions';
import { Capacitor, type PermissionState } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';

const ONE_MINUTE = 60 * 1000;

/**
 * Outcome of an in-context location permission request.
 *
 * `unsupported` means no OS prompt exists to answer — the web build, where the
 * browser asks on read instead — and is deliberately distinct from `denied` so
 * callers do not record a refusal the user never made.
 */
export type LocationPermissionResult = 'granted' | 'denied' | 'unsupported';

/**
 * Current OS location permission, as reported without prompting.
 *
 * `prompt` still has an unspent OS prompt, so asking can recover access.
 * `denied` cannot: the OS ignores further requests, and the only way back is
 * the system settings page. Callers must branch on the two.
 */
export type LocationPermissionState =
  'granted' | 'denied' | 'prompt' | 'unsupported';

/** Thrown by {@link getCurrentPosition} instead of triggering a cold OS prompt. */
export class LocationPermissionNotGrantedError extends Error {
  /**
   * The state that blocked the read, so a caller can offer the right way back
   * without asking the OS a second time. A refused read alone cannot say
   * whether a prompt is still available or only the settings page can help.
   */
  readonly permissionState: LocationPermissionState;

  constructor(permissionState: LocationPermissionState) {
    super('Location permission is not granted');
    this.name = 'LocationPermissionNotGrantedError';
    this.permissionState = permissionState;
  }
}

/**
 * `prompt-with-rationale` is Android's "ask again with an explanation", so it
 * still has a prompt left to spend and folds into `prompt`.
 */
const toPermissionState = (
  location: PermissionState,
): LocationPermissionState => {
  if (location === 'granted') {
    return 'granted';
  }

  return location === 'denied' ? 'denied' : 'prompt';
};

const readCurrentPosition = async (): Promise<Position> => {
  const permissionStatus = await Geolocation.checkPermissions();

  // `checkPermissions` never prompts, but `getCurrentPosition` does: the native
  // plugin asks the OS itself when permission is undetermined. Bailing out here
  // keeps a read on an undecided permission from spending the prompt that the
  // onboarding location step owns (epic #850, issue #1023).
  if (Capacitor.isNativePlatform() && permissionStatus.location !== 'granted') {
    throw new LocationPermissionNotGrantedError(
      toPermissionState(permissionStatus.location),
    );
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
export const getCurrentPosition = (): Observable<Position> => {
  return from(readCurrentPosition());
};

/**
 * Whether the OS currently allows reading the position. Never prompts.
 *
 * A stored `settings.location` flag records what the user once chose, not what
 * the OS allows today: reinstalling the app or revoking access in system
 * settings resets the OS grant while the stored preference survives. Callers
 * must reconcile the two before treating location as available, otherwise they
 * show a "granted" state for a permission that no longer exists.
 *
 * Web has no pre-checkable grant — the browser asks on read — so it reports
 * `true` and leaves the decision to {@link getCurrentPosition}.
 */
export const hasLocationPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const permissionStatus = await Geolocation.checkPermissions();

    return permissionStatus.location === 'granted';
  } catch (error) {
    console.warn('Location permission check failed: ', error);

    return false;
  }
};

/**
 * Reads the OS permission state without prompting, so a caller can tell a
 * recoverable "never asked" apart from a "denied" that only the system settings
 * page can undo.
 */
export const getLocationPermissionState =
  async (): Promise<LocationPermissionState> => {
    if (!Capacitor.isNativePlatform()) {
      return 'unsupported';
    }

    try {
      const { location } = await Geolocation.checkPermissions();

      return toPermissionState(location);
    } catch (error) {
      console.warn('Location permission check failed: ', error);

      return 'denied';
    }
  };

/**
 * Opens the app's own page in the OS settings, the only route back once
 * location was denied — the OS silently ignores further permission requests.
 *
 * Returns whether the settings page was actually opened, so the caller can keep
 * guiding the user instead of appearing to do nothing. iOS exposes the app's
 * settings under a URL scheme; Android has no equivalent that App Launcher can
 * open, so it reports `false` there and needs a native settings plugin.
 */
export const openLocationSettings = async (): Promise<boolean> => {
  if (Capacitor.getPlatform() !== 'ios') {
    return false;
  }

  try {
    await AppLauncher.openUrl({ url: 'app-settings:' });

    return true;
  } catch (error) {
    console.warn('Could not open location settings: ', error);

    return false;
  }
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
