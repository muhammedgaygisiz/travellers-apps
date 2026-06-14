import { FirebaseOptions } from 'firebase/app';

export type Emulators = {
  host: string;
  firestorePort: number;
  functionsPort: number;
  storagePort: number;
  authUrl: string;
};

export type Environment = {
  production: boolean;
  firebaseConfig?: FirebaseOptions;
  i18n?: any;
  isBusiness?: boolean;
  emulators?: Emulators;
};
