export interface Settings {
  pushNotifications: boolean;
  emailUpdates: boolean;
  theme: 'light' | 'dark';
  currency: string;
  nearby: number;
  allowFollow: boolean;
  updatedAt?: string;
}
