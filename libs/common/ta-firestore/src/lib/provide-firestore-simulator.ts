import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Emulators } from 'utils';
import { Provider } from '@angular/core';
import {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
} from './provide-firestore-utils';
import { FirebaseApp } from '@firebase/app';
import { connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';
import { FirebaseStorage } from '@firebase/storage';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseStorage as FirebaseStoragePlugin } from '@capacitor-firebase/storage';
import { connectFunctionsEmulator } from './connect-functions-emulator';
import { parseEmulatorUrl, resolveEmulatorHost } from './resolve-emulator-host';

/**
 * Points every Firebase surface at the local emulators.
 *
 * **Both SDKs have to be told, separately.** The Firebase JS SDK's
 * `connect*Emulator` functions redirect only the JS SDK objects they are
 * handed; on a native platform the data path is the Capacitor plugin talking
 * to the native SDK, which those calls never touch. Until issue #1221 only
 * Functions called its plugin, so a native dev build printed
 * `CONNECTING TO FIREBASE SIMULATORS` while writing Auth, Firestore and
 * Storage traffic straight into the production project.
 *
 * The plugin calls are made on **native platforms only**. On the web each of
 * these plugins resolves to a web implementation that reaches for the same
 * default JS SDK instance the `connect*Emulator` calls below already redirect,
 * so calling both would connect one instance twice for no gain. Functions is
 * the exception and stays unconditional: nothing else connects it, which is
 * why it was the one surface that already worked.
 *
 * The plugin calls are `void`ed rather than awaited because the provider
 * factory is synchronous. They are issued before Angular bootstraps and before
 * any feature code can reach Firebase, and each plugin queues the redirect
 * against its native SDK instance.
 */
export const provideFirestoreSimulator = (
  emulators: Emulators | undefined = {
    host: '',
    firestorePort: 0,
    functionsPort: 0,
    storagePort: 0,
    authUrl: '',
  },
  app: FirebaseApp,
  firestore: Firestore,
  storage: FirebaseStorage,
): Provider[] => {
  const auth = getAuth();
  const host = resolveEmulatorHost(emulators.host);
  const authEmulator = parseEmulatorUrl(emulators.authUrl);

  void connectFunctionsEmulator({
    host: emulators.host,
    port: emulators.functionsPort,
  });

  if (Capacitor.isNativePlatform()) {
    void FirebaseAuthentication.useEmulator({
      host: authEmulator.host,
      port: authEmulator.port,
      scheme: authEmulator.scheme,
    });
    void FirebaseFirestore.useEmulator({
      host,
      port: emulators.firestorePort,
    });
    void FirebaseStoragePlugin.useEmulator({
      host,
      port: emulators.storagePort,
    });
  }

  connectAuthEmulator(auth, authEmulator.url, { disableWarnings: true });
  connectFirestoreEmulator(firestore, host, emulators.firestorePort);
  connectStorageEmulator(storage, host, emulators.storagePort);

  return [
    { provide: FIREBASE_APP, useFactory: () => app },
    { provide: FIREBASE_FIRESTORE, useFactory: () => firestore },
    { provide: FIREBASE_AUTH, useFactory: () => auth },
  ];
};
