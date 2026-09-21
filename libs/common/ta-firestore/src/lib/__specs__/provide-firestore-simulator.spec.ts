import { provideFirestoreSimulator } from '../provide-firestore-simulator';
import { Provider } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Emulators } from 'utils';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import * as connectFirestoreEmulatorUtils from 'firebase/firestore';
import * as connectStorageEmulatorUtils from 'firebase/storage';
import * as connectAuthEmulatorUtils from 'firebase/auth';
import * as connectFunctionsEmulatorUtils from '../connect-functions-emulator';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseStorage as FirebaseStoragePlugin } from '@capacitor-firebase/storage';
import {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
} from '../provide-firestore-utils';

jest.mock('@capacitor/core');
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
jest.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    useEmulator: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    useEmulator: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('@capacitor-firebase/storage', () => ({
  FirebaseStorage: {
    useEmulator: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('../connect-functions-emulator', () => ({
  connectFunctionsEmulator: jest.fn(() => Promise.resolve()),
}));

const emulators = {
  host: 'localhost',
  firestorePort: 8080,
  functionsPort: 5001,
  storagePort: 9199,
  authUrl: 'http://localhost:9099',
} as Emulators;

const provide = (config: Emulators = emulators): Provider[] =>
  provideFirestoreSimulator(
    config,
    {} as unknown as FirebaseApp,
    {} as unknown as Firestore,
    {} as unknown as FirebaseStorage,
  );

describe(provideFirestoreSimulator.name, () => {
  let connectFirestoreEmulatorSpy: jest.SpyInstance;
  let connectStorageEmulatorSpy: jest.SpyInstance;
  let connectAuthEmulatorSpy: jest.SpyInstance;
  let connectFunctionsEmulatorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
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
    connectFunctionsEmulatorSpy = jest.spyOn(
      connectFunctionsEmulatorUtils,
      'connectFunctionsEmulator',
    );
  });

  it('should connect the Firebase JS SDK to its emulators', () => {
    const result = provide();

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
    expect(connectFunctionsEmulatorSpy).toHaveBeenCalledWith({
      host: 'localhost',
      port: 5001,
    });

    expect(result).toEqual([
      { provide: FIREBASE_APP, useFactory: expect.any(Function) },
      { provide: FIREBASE_FIRESTORE, useFactory: expect.any(Function) },
      { provide: FIREBASE_AUTH, useFactory: expect.any(Function) },
    ]);

    const appProvider = result.find(
      (prov: { provide?: unknown }) => prov.provide === FIREBASE_APP,
    );
    const app = (appProvider as { useFactory: () => unknown }).useFactory();
    expect(app).toEqual({});

    const firestoreProvider = result.find(
      (prov: { provide?: unknown }) => prov.provide === FIREBASE_FIRESTORE,
    );
    const firestore = (
      firestoreProvider as { useFactory: () => unknown }
    ).useFactory();
    expect(firestore).toEqual({});

    const authProvider = result.find(
      (prov: { provide?: unknown }) => prov.provide === FIREBASE_AUTH,
    );
    const auth = (authProvider as { useFactory: () => unknown }).useFactory();
    expect(auth).toEqual({});
  });

  // Issue #1221: the JS SDK calls above redirect only the JS SDK. On a native
  // platform the data path is the Capacitor plugin, and without these three
  // calls a dev build writes Auth, Firestore and Storage traffic straight into
  // the production project while logging that it is on the emulators.
  it('should connect the native Capacitor plugins to their emulators', () => {
    provide();

    expect(FirebaseAuthentication.useEmulator).toHaveBeenCalledWith({
      host: 'localhost',
      port: 9099,
      scheme: 'http',
    });
    expect(FirebaseFirestore.useEmulator).toHaveBeenCalledWith({
      host: 'localhost',
      port: 8080,
    });
    expect(FirebaseStoragePlugin.useEmulator).toHaveBeenCalledWith({
      host: 'localhost',
      port: 9199,
    });
  });

  // On the web each plugin's implementation redirects the same default JS SDK
  // instance the calls above already handled, so the plugin call is redundant
  // there rather than a second surface.
  it('should leave the native plugins alone on the web', () => {
    jest.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    provide();

    expect(FirebaseAuthentication.useEmulator).not.toHaveBeenCalled();
    expect(FirebaseFirestore.useEmulator).not.toHaveBeenCalled();
    expect(FirebaseStoragePlugin.useEmulator).not.toHaveBeenCalled();
    expect(connectFunctionsEmulatorSpy).toHaveBeenCalled();
  });

  it('should send both SDKs at the same Auth emulator', () => {
    provide({ ...emulators, authUrl: 'https://127.0.0.1:9100' });

    expect(FirebaseAuthentication.useEmulator).toHaveBeenCalledWith({
      host: '127.0.0.1',
      port: 9100,
      scheme: 'https',
    });
    expect(connectAuthEmulatorSpy).toHaveBeenCalledWith(
      {},
      'https://127.0.0.1:9100',
      { disableWarnings: true },
    );
  });
});
