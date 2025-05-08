export interface AuthResult {
  user?: any;
  authenticated: boolean;
  authenticationFailed: boolean;
  errorCode: string | null;
}
