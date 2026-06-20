import { Capacitor } from '@capacitor/core';
import {
  FirebaseAppCheck,
  InitializeOptions,
} from '@capacitor-firebase/app-check';
import { ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const APP_CHECK_SITE_KEY_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY';
const APP_CHECK_DEBUG_TOKEN_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN';
const IS_DEV_ENV = 'NX_APP_BITE_TRIBE_IS_DEV';

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

  if (process.env[IS_DEV_ENV] === 'true') {
    console.info(
      `[AppCheck] Skipping Firebase App Check because ${IS_DEV_ENV} is true`,
    );
    return;
  }

  const siteKey = process.env[APP_CHECK_SITE_KEY_ENV];

  if (!siteKey) {
    console.warn(
      `[AppCheck] Skipping Firebase App Check because ${APP_CHECK_SITE_KEY_ENV} is not configured. ${APP_CHECK_DEBUG_TOKEN_ENV} does not replace the site key.`,
    );
    return;
  }

  const debugToken = process.env[APP_CHECK_DEBUG_TOKEN_ENV];

  if (process.env[IS_DEV_ENV] === 'false' && !debugToken) {
    console.warn(
      `[AppCheck] ${IS_DEV_ENV} is false but ${APP_CHECK_DEBUG_TOKEN_ENV} is not configured. Localhost production-Firebase testing may fail App Check token exchange.`,
    );
  }

  try {
    console.info('[AppCheck] Initializing Firebase App Check');

    await FirebaseAppCheck.initialize(toInitializeOptions(siteKey, debugToken));

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
