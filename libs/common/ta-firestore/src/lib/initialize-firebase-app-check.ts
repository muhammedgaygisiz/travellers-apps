import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { FirebaseApp } from 'firebase/app';
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheckToken,
} from 'firebase/app-check';

const APP_CHECK_SITE_KEY_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY';
const APP_CHECK_DEBUG_TOKEN_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN';
const IS_DEV_ENV = 'NX_APP_BITE_TRIBE_IS_DEV';
const NATIVE_TOKEN_EXPIRY_FALLBACK_MS = 5 * 60 * 1000;

let appCheckInitialization: Promise<void> | null = null;

export const initializeFirebaseAppCheck = (app: FirebaseApp): Promise<void> => {
  if (appCheckInitialization) {
    return appCheckInitialization;
  }

  appCheckInitialization = initializeFirebaseAppCheckOnce(app);
  return appCheckInitialization;
};

export const resetFirebaseAppCheckInitializationForTesting = (): void => {
  appCheckInitialization = null;
};

const initializeFirebaseAppCheckOnce = async (
  app: FirebaseApp,
): Promise<void> => {
  if (process.env[IS_DEV_ENV] === 'true') {
    console.info(
      `[AppCheck] Skipping Firebase App Check because ${IS_DEV_ENV} is true`,
    );
    return;
  }

  const platform = Capacitor.getPlatform();

  if (platform === 'ios' || platform === 'android') {
    await initializeNativeFirebaseAppCheckBridge(app, platform);
    return;
  }

  if (platform !== 'web') {
    console.info(
      `[AppCheck] Skipping Firebase App Check on unsupported platform: ${platform}`,
    );
    return;
  }

  await initializeWebFirebaseAppCheck();
};

const initializeWebFirebaseAppCheck = async (): Promise<void> => {
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

    await FirebaseAppCheck.initialize({
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
      ...(debugToken ? { debugToken } : {}),
    });

    console.info('[AppCheck] Firebase App Check initialized');
  } catch (error) {
    console.warn('[AppCheck] Firebase App Check initialization failed', error);
  }
};

const initializeNativeFirebaseAppCheckBridge = async (
  app: FirebaseApp,
  platform: 'ios' | 'android',
): Promise<void> => {
  const platformLabel = getNativePlatformLabel(platform);

  try {
    console.info(
      `[AppCheck] Initializing ${platformLabel} Firebase App Check bridge`,
    );

    await FirebaseAppCheck.setTokenAutoRefreshEnabled({ enabled: true });

    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: getNativeFirebaseAppCheckToken,
      }),
      isTokenAutoRefreshEnabled: true,
    });

    console.info(
      `[AppCheck] ${platformLabel} Firebase App Check bridge initialized`,
    );
  } catch (error) {
    console.warn(
      `[AppCheck] ${platformLabel} Firebase App Check bridge initialization failed`,
      error,
    );
  }
};

const getNativePlatformLabel = (platform: 'ios' | 'android'): string =>
  platform === 'ios' ? 'iOS' : 'Android';

const getNativeFirebaseAppCheckToken = async (): Promise<AppCheckToken> => {
  const { token, expireTimeMillis } = await FirebaseAppCheck.getToken({
    forceRefresh: false,
  });

  return {
    token,
    expireTimeMillis:
      expireTimeMillis ?? Date.now() + NATIVE_TOKEN_EXPIRY_FALLBACK_MS,
  };
};
