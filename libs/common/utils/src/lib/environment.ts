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
  /**
   * Which of the three web apps this bundle is.
   *
   * They are separate flags rather than one enum because `isBusiness` predates
   * the admin app and is read by name in the store provider; a third app that
   * behaves like the business app in every respect but its auth domain is
   * cheaper to add than to migrate both existing apps onto a new shape. An
   * environment sets at most one of them, and the consumer app sets neither.
   */
  isBusiness?: boolean;
  isAdmin?: boolean;
  emulators?: Emulators;
};
