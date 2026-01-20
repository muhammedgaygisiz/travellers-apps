import { User } from '@capacitor-firebase/authentication';

export interface AuthResult {
  user: User | null | undefined;
  authenticated: boolean;
  authenticationFailed: boolean;
  errorCode: string | null;
}
