export interface Settings {
  pushNotifications: boolean;
  /** Whether the user granted the OS location permission in onboarding (#1023). */
  location: boolean;
  emailUpdates: boolean;
  theme: 'light' | 'dark';
  currency: string;
  favoriteCurrencies?: string[];
  nearby?: number;
  language: string;
  updatedAt?: string;
}
