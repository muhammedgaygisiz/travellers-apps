import { SupportedLang } from 'localization';

export interface Settings {
  pushNotifications: boolean;
  emailUpdates: boolean;
  theme: 'light' | 'dark';
  currency: string;
  nearby: number;
  language?: SupportedLang;
  updatedAt?: string;
}
