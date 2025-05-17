import { FirebaseOptions } from 'firebase/app';

export type Environment = {
  production: boolean;
  firebaseConfig?: FirebaseOptions;
  i18n?: any;
  isBusiness?: boolean;
};
