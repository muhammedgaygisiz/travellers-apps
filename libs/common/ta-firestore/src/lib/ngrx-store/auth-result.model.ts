import { User } from '@capacitor-firebase/authentication';

export interface AuthResult {
  user: User | null | undefined;
  authenticated: boolean;
  authenticationFailed: boolean;
  /** Whether a sign-in round-trip is still running (issue #1273). */
  authenticationPending: boolean;
  errorCode: string | null;
}
