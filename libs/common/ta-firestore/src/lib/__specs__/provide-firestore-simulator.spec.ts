import { provideFirestoreSimulator } from '../provide-firestore-simulator';
import * as connectFirestoreEmulatorUtils from 'firebase/firestore';
import * as connectStorageEmulatorUtils from 'firebase/storage';
import * as connectAuthEmulatorUtils from 'firebase/auth';
import {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
} from '../provide-firestore-utils';

jest.mock('firebase/firestore', () => ({
  connectFirestoreEmulator: jest.fn(),
}));
jest.mock('firebase/storage', () => ({
  connectStorageEmulator: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  connectAuthEmulator: jest.fn(),
  getAuth: jest.fn(() => ({})),
}));

describe(provideFirestoreSimulator.name, () => {
  let connectFirestoreEmulatorSpy: jest.SpyInstance;
  let connectStorageEmulatorSpy: jest.SpyInstance;
  let connectAuthEmulatorSpy: jest.SpyInstance;

  beforeEach(() => {
    connectFirestoreEmulatorSpy = jest.spyOn(
      connectFirestoreEmulatorUtils,
      'connectFirestoreEmulator',
    );
    connectStorageEmulatorSpy = jest.spyOn(
      connectStorageEmulatorUtils,
      'connectStorageEmulator',
    );
    connectAuthEmulatorSpy = jest.spyOn(
      connectAuthEmulatorUtils,
      'connectAuthEmulator',
    );
  });

  it('should call auth, firestore and storage connect emulator functions with given parameters', () => {
    const result = provideFirestoreSimulator(
      {
        host: 'localhost',
        firestorePort: 8080,
        storagePort: 9199,
        authUrl: 'http://localhost:9099',
      } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    expect(connectAuthEmulatorSpy).toHaveBeenCalledWith(
      {},
      'http://localhost:9099',
      { disableWarnings: true },
    );
    expect(connectFirestoreEmulatorSpy).toHaveBeenCalledWith(
      {},
      'localhost',
      8080,
    );
    expect(connectStorageEmulatorSpy).toHaveBeenCalledWith(
      {},
      'localhost',
      9199,
    );

    expect(result).toEqual([
      { provide: FIREBASE_APP, useFactory: expect.any(Function) },
      { provide: FIREBASE_FIRESTORE, useFactory: expect.any(Function) },
      { provide: FIREBASE_AUTH, useFactory: expect.any(Function) },
    ]);

    const appProvider = result.find(
      (prov: any) => prov.provide === FIREBASE_APP,
    );
    const app = (appProvider as any).useFactory();
    expect(app).toEqual({});

    const firestoreProvider = result.find(
      (prov: any) => prov.provide === FIREBASE_FIRESTORE,
    );
    const firestore = (firestoreProvider as any).useFactory();
    expect(firestore).toEqual({});

    const authProvider = result.find(
      (prov: any) => prov.provide === FIREBASE_AUTH,
    );
    const auth = (authProvider as any).useFactory();
    expect(auth).toEqual({});
  });
});
