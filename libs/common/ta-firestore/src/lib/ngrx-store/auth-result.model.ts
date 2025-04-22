export interface AuthResult {
  authenticated: boolean;
  authenticationFailed: boolean;
  errorCode: string | null;
}
