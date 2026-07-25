import {
  createFirebaseAppCheckInitializer,
  createFirebaseStartupInitializer,
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
  provideFirestoreUtils,
} from '../provide-firestore-utils';
import { EnvironmentProviders, ErrorHandler, Provider } from '@angular/core';
import { FirebaseErrorHandlerService } from '../analytics/firebase-error-handler.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import * as storageUtils from 'firebase/storage';
import * as simulatorUtils from '../provide-firestore-simulator';
import {
  enableMultiTabIndexedDbPersistence,
  initializeFirestore,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import * as appCheckUtils from '../initialize-firebase-app-check';
import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Analytics } from 'firebase/analytics';
import { Emulators } from 'utils';
import { FIREBASE_ANALYTICS } from '../analytics/provide-firestore-analytics';

jest.mock('firebase/app');
jest.mock('firebase/firestore');
jest.mock('firebase/auth');
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
}));

jest.mock('@capacitor-firebase/analytics');

const READY: appCheckUtils.AppCheckReadiness = {
  ready: true,
  enforced: false,
  status: 'completed',
  provider: 'recaptcha_enterprise',
  platform: 'web',
};

const BLOCKED: appCheckUtils.AppCheckReadiness = {
  ready: false,
  enforced: true,
  status: 'failed',
  provider: 'recaptcha_enterprise',
  platform: 'web',
  reason: 'initialization_error',
};

jest.mock('../initialize-firebase-app-check', () => ({
  initializeFirebaseAppCheck: jest.fn(),
  refreshFirebaseAppCheckReadiness: jest.fn(),
}));

jest.mock('../provide-firestore-simulator', () => ({
  provideFirestoreSimulator: jest.fn().mockResolvedValue([]),
}));

jest.mock('@capacitor/core');

describe(provideFirestoreUtils.name, () => {
  const firebaseApp = { name: 'bite-tribe' } as unknown as FirebaseApp;
  const firestore = { app: firebaseApp } as unknown as Firestore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(initializeApp).mockReturnValue(firebaseApp);
    jest.mocked(initializeFirestore).mockReturnValue(firestore);
    jest
      .mocked(enableMultiTabIndexedDbPersistence)
      .mockImplementation(jest.fn());
    jest
      .mocked(appCheckUtils.initializeFirebaseAppCheck)
      .mockResolvedValue(READY);
    jest
      .mocked(appCheckUtils.refreshFirebaseAppCheckReadiness)
      .mockResolvedValue(READY);
  });

  it('should create a Firebase startup initializer without calling App Check during provider construction', async () => {
    const initializeAppCheckSpy = jest.spyOn(
      appCheckUtils,
      'initializeFirebaseAppCheck',
    );

    provideFirestoreUtils({} as FirebaseOptions);

    expect(initializeAppCheckSpy).not.toHaveBeenCalled();

    const analytics = {} as unknown as Analytics;
    const initializer = createFirebaseAppCheckInitializer(
      firebaseApp,
      { production: true },
      analytics,
    );

    await initializer();

    expect(initializeAppCheckSpy).toHaveBeenCalledWith(firebaseApp, {
      analytics,
      runtimeMode: 'production',
    });
  });

  const createGate = (): {
    readiness: {
      markReady: jest.Mock;
      markBlocked: jest.Mock;
      registerRetryHandler: jest.Mock;
    };
    startNavigation: jest.Mock;
  } => ({
    readiness: {
      markReady: jest.fn(),
      markBlocked: jest.fn(),
      registerRetryHandler: jest.fn(),
    },
    startNavigation: jest.fn(),
  });

  it('should initialize App Check, then auth, then start navigation when ready', async () => {
    const calls: string[] = [];
    jest
      .mocked(appCheckUtils.initializeFirebaseAppCheck)
      .mockImplementationOnce(async () => {
        calls.push('app-check');
        return READY;
      });
    const authService = {
      initialize: jest.fn(async () => {
        calls.push('auth');
      }),
    };
    const gate = createGate();
    gate.startNavigation.mockImplementation(() => calls.push('nav'));

    const initializer = createFirebaseStartupInitializer(
      firebaseApp,
      { production: true },
      {} as unknown as Analytics,
      authService,
      gate,
    );

    await initializer();

    expect(calls).toEqual(['app-check', 'auth', 'nav']);
    expect(gate.readiness.markReady).toHaveBeenCalled();
    expect(gate.readiness.markBlocked).not.toHaveBeenCalled();
  });

  it('should block and skip auth/navigation when App Check is not ready', async () => {
    jest
      .mocked(appCheckUtils.initializeFirebaseAppCheck)
      .mockResolvedValueOnce(BLOCKED);
    const authService = { initialize: jest.fn() };
    const gate = createGate();

    const initializer = createFirebaseStartupInitializer(
      firebaseApp,
      { production: true },
      null,
      authService,
      gate,
    );

    await initializer();

    expect(gate.readiness.markBlocked).toHaveBeenCalled();
    expect(gate.readiness.registerRetryHandler).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(authService.initialize).not.toHaveBeenCalled();
    expect(gate.startNavigation).not.toHaveBeenCalled();
    expect(gate.readiness.markReady).not.toHaveBeenCalled();
  });

  it('should resume auth and navigation when a retry proves readiness', async () => {
    jest
      .mocked(appCheckUtils.initializeFirebaseAppCheck)
      .mockResolvedValueOnce(BLOCKED);
    jest
      .mocked(appCheckUtils.refreshFirebaseAppCheckReadiness)
      .mockResolvedValueOnce(READY);
    const authService = { initialize: jest.fn() };
    const gate = createGate();

    const initializer = createFirebaseStartupInitializer(
      firebaseApp,
      { production: true },
      null,
      authService,
      gate,
    );
    await initializer();

    const retryHandler = gate.readiness.registerRetryHandler.mock
      .calls[0][0] as () => Promise<void>;
    await retryHandler();

    expect(appCheckUtils.refreshFirebaseAppCheckReadiness).toHaveBeenCalled();
    expect(gate.readiness.markReady).toHaveBeenCalled();
    expect(authService.initialize).toHaveBeenCalled();
    expect(gate.startNavigation).toHaveBeenCalled();
  });

  it('should stay blocked when a retry still fails', async () => {
    jest
      .mocked(appCheckUtils.initializeFirebaseAppCheck)
      .mockResolvedValueOnce(BLOCKED);
    jest
      .mocked(appCheckUtils.refreshFirebaseAppCheckReadiness)
      .mockResolvedValueOnce(BLOCKED);
    const authService = { initialize: jest.fn() };
    const gate = createGate();

    const initializer = createFirebaseStartupInitializer(
      firebaseApp,
      { production: true },
      null,
      authService,
      gate,
    );
    await initializer();

    const retryHandler = gate.readiness.registerRetryHandler.mock
      .calls[0][0] as () => Promise<void>;
    await retryHandler();

    expect(gate.readiness.markReady).not.toHaveBeenCalled();
    expect(authService.initialize).not.toHaveBeenCalled();
    expect(gate.startNavigation).not.toHaveBeenCalled();
  });

  describe('given prod mode', () => {
    beforeAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'false';
    });

    afterAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = undefined;
    });

    describe('without analytics', () => {
      it('should initialize firestore utils without connecting to emulators', () => {
        const FIREBASE_OPTIONS = {};
        const WITHOUT_ANALYTICS = false;
        const EMULATORS = {
          auth: { host: 'localhost', port: 9099 },
          firestore: { host: 'localhost', port: 8080 },
          storage: { host: 'localhost', port: 9199 },
        } as unknown as Emulators;

        const providers = provideFirestoreUtils(
          FIREBASE_OPTIONS,
          WITHOUT_ANALYTICS,
          EMULATORS,
          { production: true },
        );

        expect(getRegularProviders(providers)).toEqual([
          {
            provide: FIREBASE_APP,
            useFactory: expect.anything(),
          },
          {
            provide: FIREBASE_FIRESTORE,
            useFactory: expect.anything(),
          },
          {
            provide: FIREBASE_AUTH,
            useFactory: expect.anything(),
          },
        ]);
      });
    });

    describe('with analytics', () => {
      it('should initialize firestore utils without connecting to emulators', () => {
        const FIREBASE_OPTIONS = {};
        const WITH_ANALYTICS = true;
        const EMULATORS = {
          auth: { host: 'localhost', port: 9099 },
          firestore: { host: 'localhost', port: 8080 },
          storage: { host: 'localhost', port: 9199 },
        } as unknown as Emulators;

        const providers = provideFirestoreUtils(
          FIREBASE_OPTIONS,
          WITH_ANALYTICS,
          EMULATORS,
          { production: true },
        );

        expect(getRegularProviders(providers)).toEqual([
          {
            provide: FIREBASE_APP,
            useFactory: expect.anything(),
          },
          {
            provide: FIREBASE_FIRESTORE,
            useFactory: expect.anything(),
          },
          {
            provide: FIREBASE_AUTH,
            useFactory: expect.anything(),
          },
          {
            provide: FIREBASE_ANALYTICS,
            useFactory: expect.anything(),
          },
          {
            provide: ErrorHandler,
            useClass: FirebaseErrorHandlerService,
          },
        ]);
      });
    });
  });

  describe('given dev mode', () => {
    let analyticsSetEnablesSpy: jest.SpyInstance;
    let getStorageSpy: jest.SpyInstance;
    let provideFirestoreSimulatorSpy: jest.SpyInstance;

    beforeAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'true';

      analyticsSetEnablesSpy = jest.spyOn(FirebaseAnalytics, 'setEnabled');
      getStorageSpy = jest.spyOn(storageUtils, 'getStorage');
      provideFirestoreSimulatorSpy = jest
        .spyOn(simulatorUtils, 'provideFirestoreSimulator')
        .mockReturnValue([]);
    });

    afterAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = undefined;
    });

    it('should initialize firestore utils connecting to emulators', () => {
      const FIREBASE_OPTIONS = {};
      const WITHOUT_ANALYTICS = false;
      const EMULATORS = {
        auth: { host: 'localhost', port: 9099 },
        firestore: { host: 'localhost', port: 8080 },
        storage: { host: 'localhost', port: 9199 },
      } as unknown as Emulators;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
        EMULATORS,
      );

      expect(analyticsSetEnablesSpy).toHaveBeenCalledWith({ enabled: false });
      expect(getStorageSpy).toHaveBeenCalled();
      expect(provideFirestoreSimulatorSpy).toHaveBeenCalledWith(
        {
          auth: { host: 'localhost', port: 9099 },
          firestore: { host: 'localhost', port: 8080 },
          storage: { host: 'localhost', port: 9199 },
        },
        firebaseApp,
        firestore,
        undefined,
      );

      expect(getRegularProviders(providers)).toEqual([]);
    });

    it('should fall back to standard initialization when no emulators provided', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Mock implementation
        });

      const FIREBASE_OPTIONS = {};
      const WITHOUT_ANALYTICS = false;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
      );

      expect(analyticsSetEnablesSpy).toHaveBeenCalledWith({ enabled: false });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'DEV ENVIRONMENT - NX_APP_BITE_TRIBE_IS_DEV is true, but no emulators configuration was provided. Falling back to standard Firestore initialization.',
      );

      expect(getRegularProviders(providers)).toEqual(
        expect.arrayContaining([
          {
            provide: FIREBASE_APP,
            useFactory: expect.anything(),
          },
          {
            provide: FIREBASE_FIRESTORE,
            useFactory: expect.anything(),
          },
          {
            provide: FIREBASE_AUTH,
            useFactory: expect.anything(),
          },
        ]),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('persistence error handling', () => {
    beforeAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'false';
    });

    it('should handle persistence errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');

      const persistenceError = new Error('Persistence failed');
      jest.mocked(enableMultiTabIndexedDbPersistence).mockImplementation(() => {
        throw persistenceError;
      });

      const FIREBASE_OPTIONS = {};
      const WITHOUT_ANALYTICS = false;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Firebase persistence error: ',
        expect.anything(),
      );

      expect(getRegularProviders(providers)).toEqual(
        expect.arrayContaining([
          {
            provide: FIREBASE_APP,
            useFactory: expect.anything(),
          },
        ]),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('native platform check', () => {
    beforeAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'false';
    });

    it('should use initializeAuth when on native platform', () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      const FIREBASE_OPTIONS = {};
      const WITHOUT_ANALYTICS = false;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
      );

      expect(getRegularProviders(providers)).toEqual(
        expect.arrayContaining([
          {
            provide: FIREBASE_AUTH,
            useFactory: expect.anything(),
          },
        ]),
      );
    });

    it('should use getAuth when not on native platform', () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

      const FIREBASE_OPTIONS = {};
      const WITHOUT_ANALYTICS = false;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
      );

      expect(getRegularProviders(providers)).toEqual(
        expect.arrayContaining([
          {
            provide: FIREBASE_AUTH,
            useFactory: expect.anything(),
          },
        ]),
      );
    });
  });
});

const getRegularProviders = (
  providers: (EnvironmentProviders | Provider)[],
): (EnvironmentProviders | Provider)[] =>
  providers.filter((provider) => 'provide' in provider);
