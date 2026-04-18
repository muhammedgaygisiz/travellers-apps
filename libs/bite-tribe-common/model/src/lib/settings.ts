export interface Settings {
  pushNotifications: boolean;
  emailUpdates: boolean;
  theme: 'light' | 'dark';
  currency: string;
  favoriteCurrencies?: string[];
  nearby?: number;
  language: string;
  updatedAt?: string;
}
