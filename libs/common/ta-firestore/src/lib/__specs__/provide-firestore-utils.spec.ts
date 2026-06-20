import { provideFirestoreUtils } from '../provide-firestore-utils';
import { ErrorHandler, InjectionToken } from '@angular/core';
import { FirebaseErrorHandlerService } from '../analytics/firebase-error-handler.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import * as storageUtils from 'firebase/storage';
import * as simulatorUtils from '../provide-firestore-simulator';
import * as firestoreUtils from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import * as appCheckUtils from '../initialize-firebase-app-check';
import { FirebaseOptions } from 'firebase/app';

jest.mock('firebase/app');
jest.mock('firebase/firestore');
jest.mock('firebase/auth');
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
}));

jest.mock('@capacitor-firebase/analytics');
jest.mock('../initialize-firebase-app-check', () => ({
  initializeFirebaseAppCheck: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../provide-firestore-simulator', () => ({
  provideFirestoreSimulator: jest.fn().mockResolvedValue([]),
}));

jest.mock('@capacitor/core');

describe(provideFirestoreUtils.name, () => {
  it('should initialize App Check before Firestore', () => {
    const initializeAppCheckSpy = jest.spyOn(
      appCheckUtils,
      'initializeFirebaseAppCheck',
    );
    const initializeFirestoreSpy = jest.spyOn(
      firestoreUtils,
      'initializeFirestore',
    );

    provideFirestoreUtils({} as FirebaseOptions);

    expect(initializeAppCheckSpy).toHaveBeenCalled();
    expect(initializeAppCheckSpy.mock.invocationCallOrder[0]).toBeLessThan(
      initializeFirestoreSpy.mock.invocationCallOrder[0],
    );
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
        const FIREBASE_OPTIONS = {} as any;
        const WITHOUT_ANALYTICS = false;
        const EMULATORS = {
          auth: { host: 'localhost', port: 9099 },
          firestore: { host: 'localhost', port: 8080 },
          storage: { host: 'localhost', port: 9199 },
        } as any;

        const providers = provideFirestoreUtils(
          FIREBASE_OPTIONS,
          WITHOUT_ANALYTICS,
          EMULATORS,
        );

        expect(providers).toEqual([
          {
            provide: new InjectionToken('FIREBASE_APP'),
            useFactory: expect.anything(),
          },
          {
            provide: new InjectionToken('FIREBASE_FIRESTORE'),
            useFactory: expect.anything(),
          },
          {
            provide: new InjectionToken('FIREBASE_AUTH'),
            useFactory: expect.anything(),
          },
        ]);
      });
    });

    describe('with analytics', () => {
      it('should initialize firestore utils without connecting to emulators', () => {
        const FIREBASE_OPTIONS = {} as any;
        const WITH_ANALYTICS = true;
        const EMULATORS = {
          auth: { host: 'localhost', port: 9099 },
          firestore: { host: 'localhost', port: 8080 },
          storage: { host: 'localhost', port: 9199 },
        } as any;

        const providers = provideFirestoreUtils(
          FIREBASE_OPTIONS,
          WITH_ANALYTICS,
          EMULATORS,
        );

        expect(providers).toEqual([
          {
            provide: new InjectionToken('FIREBASE_APP'),
            useFactory: expect.anything(),
          },
          {
            provide: new InjectionToken('FIREBASE_FIRESTORE'),
            useFactory: expect.anything(),
          },
          {
            provide: new InjectionToken('FIREBASE_AUTH'),
            useFactory: expect.anything(),
          },
          {
            provide: new InjectionToken('FIREBASE_ANALYTICS'),
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
      const FIREBASE_OPTIONS = {} as any;
      const WITHOUT_ANALYTICS = false;
      const EMULATORS = {
        auth: { host: 'localhost', port: 9099 },
        firestore: { host: 'localhost', port: 8080 },
        storage: { host: 'localhost', port: 9199 },
      } as any;

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
        undefined,
        undefined,
        undefined,
      );

      expect(providers).toEqual([]);
    });

    it('should fall back to standard initialization when no emulators provided', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Mock implementation
        });

      const FIREBASE_OPTIONS = {} as any;
      const WITHOUT_ANALYTICS = false;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
      );

      expect(analyticsSetEnablesSpy).toHaveBeenCalledWith({ enabled: false });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'DEV ENVIRONMENT - NX_APP_BITE_TRIBE_IS_DEV is true, but no emulators configuration was provided. Falling back to standard Firestore initialization.',
      );

      expect(providers).toEqual(
        expect.arrayContaining([
          {
            provide: new InjectionToken('FIREBASE_APP'),
            useFactory: expect.anything(),
          },
          {
            provide: new InjectionToken('FIREBASE_FIRESTORE'),
            useFactory: expect.anything(),
          },
          {
            provide: new InjectionToken('FIREBASE_AUTH'),
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
      jest
        .spyOn(firestoreUtils, 'enableMultiTabIndexedDbPersistence')
        .mockImplementation(() => {
          throw persistenceError;
        });

      const FIREBASE_OPTIONS = {} as any;
      const WITHOUT_ANALYTICS = false;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Firebase persistence error: ',
        expect.anything(),
      );

      expect(providers).toEqual(
        expect.arrayContaining([
          {
            provide: new InjectionToken('FIREBASE_APP'),
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

      const FIREBASE_OPTIONS = {} as any;
      const WITHOUT_ANALYTICS = false;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
      );

      expect(providers).toEqual(
        expect.arrayContaining([
          {
            provide: new InjectionToken('FIREBASE_AUTH'),
            useFactory: expect.anything(),
          },
        ]),
      );
    });

    it('should use getAuth when not on native platform', () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

      const FIREBASE_OPTIONS = {} as any;
      const WITHOUT_ANALYTICS = false;

      const providers = provideFirestoreUtils(
        FIREBASE_OPTIONS,
        WITHOUT_ANALYTICS,
      );

      expect(providers).toEqual(
        expect.arrayContaining([
          {
            provide: new InjectionToken('FIREBASE_AUTH'),
            useFactory: expect.anything(),
          },
        ]),
      );
    });
  });
});
