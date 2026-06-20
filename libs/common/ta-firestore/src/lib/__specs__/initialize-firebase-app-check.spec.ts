import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { ReCaptchaEnterpriseProvider } from 'firebase/app-check';

import {
  initializeFirebaseAppCheck,
  resetFirebaseAppCheckInitializationForTesting,
} from '../initialize-firebase-app-check';

jest.mock('@capacitor/core');
jest.mock('@capacitor-firebase/app-check', () => ({
  FirebaseAppCheck: {
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('firebase/app-check', () => ({
  ReCaptchaEnterpriseProvider: jest.fn().mockImplementation((siteKey) => ({
    siteKey,
  })),
}));

describe(initializeFirebaseAppCheck.name, () => {
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

    await initializeFirebaseAppCheck();

    expect(ReCaptchaEnterpriseProvider).toHaveBeenCalledWith('site-key');
    expect(FirebaseAppCheck.initialize).toHaveBeenCalledWith({
      provider: { siteKey: 'site-key' },
      isTokenAutoRefreshEnabled: true,
    });
  });

  it('should warn when local production Firebase runs without a debug token', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'false';
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await initializeFirebaseAppCheck();

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

    await initializeFirebaseAppCheck();

    expect(FirebaseAppCheck.initialize).toHaveBeenCalledWith({
      provider: { siteKey: 'site-key' },
      isTokenAutoRefreshEnabled: true,
      debugToken: 'debug-token',
    });
  });

  it('should skip initialization when the site key is not configured', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await initializeFirebaseAppCheck();

    expect(FirebaseAppCheck.initialize).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[AppCheck] Skipping Firebase App Check because NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY is not configured. NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN does not replace the site key.',
    );

    consoleWarnSpy.mockRestore();
  });

  it('should skip initialization when the client connects to simulators', async () => {
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'true';
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN'] = 'debug-token';

    await initializeFirebaseAppCheck();

    expect(FirebaseAppCheck.initialize).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[AppCheck] Skipping Firebase App Check because NX_APP_BITE_TRIBE_IS_DEV is true',
    );

    consoleInfoSpy.mockRestore();
  });

  it('should skip initialization on native platforms', async () => {
    jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await initializeFirebaseAppCheck();

    expect(FirebaseAppCheck.initialize).not.toHaveBeenCalled();
  });

  it('should initialize App Check only once', async () => {
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await initializeFirebaseAppCheck();
    await initializeFirebaseAppCheck();

    expect(FirebaseAppCheck.initialize).toHaveBeenCalledTimes(1);
  });

  it('should log initialization failures without throwing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const error = new Error('App Check failed');
    jest.spyOn(FirebaseAppCheck, 'initialize').mockRejectedValueOnce(error);
    process.env['NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY'] = 'site-key';

    await expect(initializeFirebaseAppCheck()).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[AppCheck] Firebase App Check initialization failed',
      error,
    );

    consoleWarnSpy.mockRestore();
  });
});
