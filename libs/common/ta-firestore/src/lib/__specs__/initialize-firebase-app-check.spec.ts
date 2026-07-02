import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';
import { FirebaseApp } from 'firebase/app';

import {
  initializeFirebaseAppCheck,
  resetFirebaseAppCheckInitializationForTesting,
} from '../initialize-firebase-app-check';
import { logEvent } from 'firebase/analytics';

jest.mock('@capacitor/core');
jest.mock('@capacitor-firebase/app-check', () => ({
  FirebaseAppCheck: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getToken: jest.fn().mockResolvedValue({
      token: 'native-token',
      expireTimeMillis: 123,
    }),
    setTokenAutoRefreshEnabled: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('firebase/app-check', () => ({
  CustomProvider: jest.fn().mockImplementation((options) => ({
    getToken: options.getToken,
  })),
  initializeAppCheck: jest.fn(),
  ReCaptchaEnterpriseProvider: jest.fn().mockImplementation((siteKey) => ({
    siteKey,
  })),
}));
jest.mock('firebase/analytics', () => ({
  logEvent: jest.fn(),
}));

describe(initializeFirebaseAppCheck.name, () => {
  const firebaseApp = { name: 'bite-tribe' } as FirebaseApp;
  const analytics = { app: firebaseApp } as any;
  const originalSiteKey = process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'];
  const originalDebugToken =
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN'];
  const originalIsDev = process.env['NX_APP_BITE_TRIBE_IS_DEV'];

  beforeEach(() => {
    resetFirebaseAppCheckInitializationForTesting();
    jest.clearAllMocks();
    jest.spyOn(FirebaseAppCheck, 'initialize').mockResolvedValue(undefined);
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('web');
    delete process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'];
    delete process.env['NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN'];
    delete process.env['NX_APP_BITE_TRIBE_IS_DEV'];
  });

  afterAll(() => {
    if (originalSiteKey === undefined) {
      delete process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'];
    } else {
      process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = originalSiteKey;
    }

    if (originalDebugToken === undefined) {
      delete process.env['NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN'];
    } else {
      process.env['NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN'] =
        originalDebugToken;
    }

    if (originalIsDev === undefined) {
      delete process.env['NX_APP_BITE_TRIBE_IS_DEV'];
    } else {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = originalIsDev;
    }
  });

  it('should initialize Firebase App Check on web with reCAPTCHA Enterprise', async () => {
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'production',
    });

    expect(ReCaptchaEnterpriseProvider).toHaveBeenCalledWith('site-key');
    expect(FirebaseAppCheck.initialize).toHaveBeenCalledWith({
      provider: { siteKey: 'site-key' },
      isTokenAutoRefreshEnabled: true,
    });
    expect(logEvent).toHaveBeenCalledWith(
      analytics,
      'app_check_startup_started',
      {
        has_debug_token: false,
        has_site_key: true,
        runtime_mode: 'production',
      },
    );
    expect(logEvent).toHaveBeenCalledWith(
      analytics,
      'app_check_startup_completed',
      expect.objectContaining({
        duration_ms: expect.any(Number),
        has_debug_token: false,
        has_site_key: true,
        platform: 'web',
        provider: 'recaptcha_enterprise',
        runtime_mode: 'production',
      }),
    );
  });

  it('should not write App Check console logs in production mode', async () => {
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'production',
    });

    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledWith(
      analytics,
      'app_check_startup_completed',
      expect.anything(),
    );

    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should warn when local production Firebase runs without a debug token', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'false';
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'local_prod_firebase',
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[AppCheck] NX_APP_BITE_TRIBE_IS_DEV is false but NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN is not configured. Localhost production-Firebase testing may fail App Check token exchange.',
    );
    expect(FirebaseAppCheck.initialize).toHaveBeenCalledWith({
      provider: { siteKey: 'site-key' },
      isTokenAutoRefreshEnabled: true,
    });

    consoleWarnSpy.mockRestore();
  });

  it('should pass the configured debug token when present', async () => {
    process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'false';
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN'] = 'debug-token';

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'local_prod_firebase',
    });

    expect(FirebaseAppCheck.initialize).toHaveBeenCalledWith({
      provider: { siteKey: 'site-key' },
      isTokenAutoRefreshEnabled: true,
      debugToken: 'debug-token',
    });
  });

  it('should skip initialization when the site key is not configured', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'local_prod_firebase',
    });

    expect(FirebaseAppCheck.initialize).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[AppCheck] Skipping Firebase App Check because NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY is not configured. NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN does not replace the site key.',
    );
    expect(logEvent).toHaveBeenCalledWith(
      analytics,
      'app_check_skipped',
      expect.objectContaining({
        has_debug_token: false,
        has_site_key: false,
        platform: 'web',
        provider: 'none',
        reason: 'missing_site_key',
        runtime_mode: 'local_prod_firebase',
      }),
    );

    consoleWarnSpy.mockRestore();
  });

  it('should skip initialization quietly when the client connects to simulators', async () => {
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'true';
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN'] = 'debug-token';

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'dev_simulator',
    });

    expect(FirebaseAppCheck.initialize).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();

    consoleInfoSpy.mockRestore();
  });

  it('should initialize the iOS Firebase JS SDK bridge with native tokens', async () => {
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'local_prod_firebase',
    });

    expect(FirebaseAppCheck.setTokenAutoRefreshEnabled).toHaveBeenCalledWith({
      enabled: true,
    });
    expect(CustomProvider).toHaveBeenCalledWith({
      getToken: expect.any(Function),
    });
    expect(initializeAppCheck).toHaveBeenCalledWith(firebaseApp, {
      provider: { getToken: expect.any(Function) },
      isTokenAutoRefreshEnabled: true,
    });

    const customProviderOptions = (CustomProvider as jest.Mock).mock
      .calls[0][0];

    await expect(customProviderOptions.getToken()).resolves.toEqual({
      token: 'native-token',
      expireTimeMillis: 123,
    });
    expect(FirebaseAppCheck.getToken).toHaveBeenCalledWith({
      forceRefresh: false,
    });
  });

  it('should initialize the Android Firebase JS SDK bridge with native tokens', async () => {
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'local_prod_firebase',
    });

    expect(FirebaseAppCheck.setTokenAutoRefreshEnabled).toHaveBeenCalledWith({
      enabled: true,
    });
    expect(CustomProvider).toHaveBeenCalledWith({
      getToken: expect.any(Function),
    });
    expect(initializeAppCheck).toHaveBeenCalledWith(firebaseApp, {
      provider: { getToken: expect.any(Function) },
      isTokenAutoRefreshEnabled: true,
    });

    const customProviderOptions = (CustomProvider as jest.Mock).mock
      .calls[0][0];

    await expect(customProviderOptions.getToken()).resolves.toEqual({
      token: 'native-token',
      expireTimeMillis: 123,
    });
    expect(FirebaseAppCheck.getToken).toHaveBeenCalledWith({
      forceRefresh: false,
    });
    expect(FirebaseAppCheck.initialize).not.toHaveBeenCalled();
  });

  it('should add a short expiry fallback when native token expiry is unavailable', async () => {
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    jest.spyOn(FirebaseAppCheck, 'getToken').mockResolvedValueOnce({
      token: 'native-token-without-expiry',
    });

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'local_prod_firebase',
    });

    const customProviderOptions = (CustomProvider as jest.Mock).mock
      .calls[0][0];

    await expect(customProviderOptions.getToken()).resolves.toEqual({
      token: 'native-token-without-expiry',
      expireTimeMillis: 301_000,
    });

    dateNowSpy.mockRestore();
  });

  it('should skip initialization on unsupported native platforms', async () => {
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    jest
      .spyOn(Capacitor, 'getPlatform')
      .mockReturnValue('electron' as ReturnType<typeof Capacitor.getPlatform>);

    await initializeFirebaseAppCheck(firebaseApp, {
      analytics,
      runtimeMode: 'local_prod_firebase',
    });

    expect(initializeAppCheck).not.toHaveBeenCalled();
    expect(FirebaseAppCheck.initialize).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[AppCheck] Skipping Firebase App Check on unsupported platform: other',
    );

    consoleInfoSpy.mockRestore();
  });

  it('should initialize App Check only once', async () => {
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await initializeFirebaseAppCheck(firebaseApp);
    await initializeFirebaseAppCheck(firebaseApp);

    expect(FirebaseAppCheck.initialize).toHaveBeenCalledTimes(1);
  });

  it('should initialize native App Check bridge only once', async () => {
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

    await initializeFirebaseAppCheck(firebaseApp);
    await initializeFirebaseAppCheck(firebaseApp);

    expect(FirebaseAppCheck.setTokenAutoRefreshEnabled).toHaveBeenCalledTimes(
      1,
    );
    expect(initializeAppCheck).toHaveBeenCalledTimes(1);
  });

  it('should log initialization failures without throwing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const error = new Error('App Check failed');
    jest.spyOn(FirebaseAppCheck, 'initialize').mockRejectedValueOnce(error);
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await expect(
      initializeFirebaseAppCheck(firebaseApp, {
        analytics,
        runtimeMode: 'local_prod_firebase',
      }),
    ).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[AppCheck] Firebase App Check initialization failed; continuing under transitional policy',
      error,
    );
    expect(logEvent).toHaveBeenCalledWith(
      analytics,
      'app_check_initialization_failed',
      expect.objectContaining({
        platform: 'web',
        provider: 'recaptcha_enterprise',
        reason: 'initialization_error',
        runtime_mode: 'local_prod_firebase',
        transitional_policy: 'continue_after_failure',
      }),
    );

    consoleWarnSpy.mockRestore();
  });

  it('should log native bridge initialization failures without throwing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const error = new Error('Native App Check failed');
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    jest
      .spyOn(FirebaseAppCheck, 'setTokenAutoRefreshEnabled')
      .mockRejectedValueOnce(error);

    await expect(
      initializeFirebaseAppCheck(firebaseApp, {
        analytics,
        runtimeMode: 'local_prod_firebase',
      }),
    ).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[AppCheck] Android Firebase App Check bridge initialization failed; continuing under transitional policy',
      error,
    );
    expect(initializeAppCheck).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it.each(['ios', 'android'] as const)(
    'should not log native App Check token values on %s',
    async (platform) => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(Capacitor, 'getPlatform').mockReturnValue(platform);

      await initializeFirebaseAppCheck(firebaseApp);

      const loggedValues = [
        ...consoleInfoSpy.mock.calls.flat(),
        ...consoleWarnSpy.mock.calls.flat(),
      ];

      expect(loggedValues).not.toContain('native-token');

      consoleInfoSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    },
  );
});
