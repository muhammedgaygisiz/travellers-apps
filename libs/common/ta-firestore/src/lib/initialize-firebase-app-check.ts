import { Capacitor } from '@capacitor/core';
import {
  FirebaseAppCheck,
  InitializeOptions,
} from '@capacitor-firebase/app-check';
import { ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const APP_CHECK_SITE_KEY_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY';
const APP_CHECK_DEBUG_TOKEN_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN';

let appCheckInitialization: Promise<void> | null = null;

export const initializeFirebaseAppCheck = (): Promise<void> => {
  if (appCheckInitialization) {
    return appCheckInitialization;
  }

  appCheckInitialization = initializeFirebaseAppCheckOnce();
  return appCheckInitialization;
};

export const resetFirebaseAppCheckInitializationForTesting = (): void => {
  appCheckInitialization = null;
};

const initializeFirebaseAppCheckOnce = async (): Promise<void> => {
  if (Capacitor.getPlatform() !== 'web') {
    console.info('[AppCheck] Skipping Firebase App Check on native platform');
    return;
  }

  const siteKey = process.env[APP_CHECK_SITE_KEY_ENV];

  if (!siteKey) {
    console.info(
      `[AppCheck] Skipping Firebase App Check because ${APP_CHECK_SITE_KEY_ENV} is not configured`,
    );
    return;
  }

  try {
    console.info('[AppCheck] Initializing Firebase App Check');

    await FirebaseAppCheck.initialize(
      toInitializeOptions(siteKey, process.env[APP_CHECK_DEBUG_TOKEN_ENV]),
    );

    console.info('[AppCheck] Firebase App Check initialized');
  } catch (error) {
    console.warn('[AppCheck] Firebase App Check initialization failed', error);
  }
};

const toInitializeOptions = (
  siteKey: string,
  debugToken?: string,
): InitializeOptions => ({
  provider: new ReCaptchaEnterpriseProvider(siteKey),
  isTokenAutoRefreshEnabled: true,
  ...(debugToken ? { debugToken } : {}),
});
