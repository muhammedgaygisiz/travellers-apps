import { Capacitor, type PermissionState } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { AppSettings } from 'app-settings';

/**
 * Outcome of an in-context media location permission request.
 *
 * `unsupported` means there is no OS permission to answer — iOS, where the
 * photo library grant already carries the metadata, and the web build — and is
 * deliberately distinct from `denied` so callers do not record a refusal the
 * user never made.
 */
export type MediaLocationPermissionResult =
  'granted' | 'denied' | 'unsupported';

/**
 * Current OS media location permission, as reported without prompting.
 *
 * `prompt` still has an unspent OS prompt, so asking can recover access.
 * `denied` cannot: the OS ignores further requests, and the only way back is
 * the app's page in the system settings. Callers must branch on the two.
 */
export type MediaLocationPermissionState =
  'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * `prompt-with-rationale` is Android's "ask again with an explanation", so it
 * still has a prompt left to spend and folds into `prompt`.
 */
const toPermissionState = (
  accessMediaLocation: PermissionState,
): MediaLocationPermissionState => {
  if (accessMediaLocation === 'granted') {
    return 'granted';
  }

  return accessMediaLocation === 'denied' ? 'denied' : 'prompt';
};

/**
 * Whether this platform has a media location permission at all.
 *
 * Only Android does. `ACCESS_MEDIA_LOCATION` is what lifts the redaction
 * Android applies to a picked photo's EXIF; iOS hands the metadata over with
 * the photo library grant the camera plugin already owns, and the web build
 * reads the file the user selected directly. The file picker's permission
 * methods are Android-only too and reject elsewhere, so every read below has
 * to check this first.
 */
const isSupported = (): boolean => Capacitor.getPlatform() === 'android';

/**
 * Reads the OS permission state without prompting, so a caller can tell a
 * recoverable "never asked" apart from a "denied" that only the system settings
 * page can undo.
 */
export const getMediaLocationPermissionState =
  async (): Promise<MediaLocationPermissionState> => {
    if (!isSupported()) {
      return 'unsupported';
    }

    try {
      const { accessMediaLocation } = await FilePicker.checkPermissions();

      return toPermissionState(accessMediaLocation);
    } catch (error) {
      console.warn('Media location permission check failed: ', error);

      return 'denied';
    }
  };

/**
 * Whether Android currently hands over a picked photo's location metadata.
 * Never prompts.
 *
 * Without the grant the picker still returns the photo, so a caller cannot
 * infer the answer from a failed read: a photo with no GPS and a photo whose
 * GPS was stripped look identical. This is what tells the two apart.
 */
export const hasMediaLocationPermission = async (): Promise<boolean> =>
  (await getMediaLocationPermissionState()) === 'granted';

/**
 * Shows the OS media location permission prompt. Call this only after the user
 * has been told what the photo's position is used for; the OS shows its prompt
 * once per install, so a cold ask is spent for good.
 *
 * The prompt is owned by the onboarding photos step and the explicit recovery
 * actions in Settings and the Bite form. The gallery picker must not call it —
 * that is what raised the prompt on the way to choosing a photo, and made
 * "Allow limited access" cost two selections (issue #1394).
 *
 * Returns the outcome so the caller can record the choice. Denial is a normal
 * result, not an error — the onboarding flow continues either way.
 */
export const requestMediaLocationPermission =
  async (): Promise<MediaLocationPermissionResult> => {
    if (!isSupported()) {
      return 'unsupported';
    }

    try {
      const { accessMediaLocation } = await FilePicker.requestPermissions({
        permissions: ['accessMediaLocation'],
      });

      return accessMediaLocation === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.error('Media location permission request failed: ', error);

      return 'denied';
    }
  };

/**
 * Opens the app's own page in the OS settings, the only route back once media
 * location was denied — the OS silently ignores further permission requests.
 *
 * Returns whether the settings page was actually opened, so the caller can keep
 * guiding the user instead of appearing to do nothing. Android has no URL that
 * App Launcher can open for this and needs the wrapper's native intent; the
 * permission has no page of its own either, so the app details page — which
 * carries the permission list — is the closest target the OS offers.
 */
export const openMediaLocationSettings = async (): Promise<boolean> => {
  const platform = Capacitor.getPlatform();

  try {
    if (platform === 'ios') {
      await AppLauncher.openUrl({ url: 'app-settings:' });

      return true;
    }

    if (platform === 'android') {
      const { opened } = await AppSettings.openAppDetailsSettings();

      return opened;
    }
  } catch (error) {
    console.warn('Could not open media location settings: ', error);
  }

  return false;
};
