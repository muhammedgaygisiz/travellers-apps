export interface User {
  displayName: string;
  fullName?: string;
  /** How the user wants to be referred to, free text (issue #1826). */
  pronouns?: string;
  photoUrl: string;
  providerData: unknown[];
  email: string;
}
