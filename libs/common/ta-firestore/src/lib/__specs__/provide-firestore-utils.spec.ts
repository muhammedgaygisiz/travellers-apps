import { provideFirestoreUtils } from '../provide-firestore-utils';
import { ErrorHandler, InjectionToken } from '@angular/core';
import { FirebaseErrorHandlerService } from '../analytics/firebase-error-handler.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import * as storageUtils from 'firebase/storage';
import * as simulatorUtils from '../provide-firestore-simulator';

jest.mock('firebase/app');
jest.mock('firebase/firestore');
jest.mock('firebase/auth');
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
}));

jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: {
    setEnabled: jest.fn(),
  },
}));

jest.mock('../provide-firestore-simulator', () => ({
  provideFirestoreSimulator: jest.fn().mockResolvedValue([]),
}));

jest.mock('@capacitor/core');

describe(provideFirestoreUtils.name, () => {
  describe('given prod mode', () => {
    beforeAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = 'false';
    });

    afterAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = undefined;
    });

    describe('without analytics', () => {
      it('should initialize firestore utils without connecting to emulators', async () => {
        const FIREBASE_OPTIONS = {} as any;
        const WITHOUT_ANALYTICS = false;
        const EMULATORS = {
          auth: { host: 'localhost', port: 9099 },
          firestore: { host: 'localhost', port: 8080 },
          storage: { host: 'localhost', port: 9199 },
        } as any;

        const providers = await provideFirestoreUtils(
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
      it('should initialize firestore utils without connecting to emulators', async () => {
        const FIREBASE_OPTIONS = {} as any;
        const WITH_ANALYTICS = true;
        const EMULATORS = {
          auth: { host: 'localhost', port: 9099 },
          firestore: { host: 'localhost', port: 8080 },
          storage: { host: 'localhost', port: 9199 },
        } as any;

        const providers = await provideFirestoreUtils(
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
      provideFirestoreSimulatorSpy = jest.spyOn(
        simulatorUtils,
        'provideFirestoreSimulator',
      );
    });

    afterAll(() => {
      process.env['NX_APP_BITE_TRIBE_IS_DEV'] = undefined;
    });

    it('should initialize firestore utils connecting to emulators', async () => {
      const FIREBASE_OPTIONS = {} as any;
      const WITHOUT_ANALYTICS = false;
      const EMULATORS = {
        auth: { host: 'localhost', port: 9099 },
        firestore: { host: 'localhost', port: 8080 },
        storage: { host: 'localhost', port: 9199 },
      } as any;

      const providers = await provideFirestoreUtils(
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

      expect(providers).toEqual(expect.any(Array));
    });
  });
});
