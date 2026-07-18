export interface User {
  displayName: string;
  fullName?: string;
  photoUrl: string;
  providerData: unknown[];
  email: string;
}
