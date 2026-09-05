import { SupportedLang } from 'utils';

export const environment = {
  production: false,
  isAdmin: true,
  i18n: {
    locales: [SupportedLang.EN],
    defaultLang: SupportedLang.EN,
  },
  emulators: {
    host: 'localhost',
    firestorePort: 8080,
    functionsPort: 5001,
    storagePort: 9199,
    authUrl: 'http://localhost:9099',
  },
};
