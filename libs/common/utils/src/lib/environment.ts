import { FirebaseOptions } from 'firebase/app';
import { SupportedLang } from './supported-lang';

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
  i18n?: {
    locales: SupportedLang[];
    defaultLang: SupportedLang;
  };
  isBusiness?: boolean;
  emulators?: Emulators;
};
