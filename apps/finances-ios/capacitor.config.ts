import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.travellers.finances',
  appName: 'Finances',
  webDir: '../../dist/apps/finances',
  server: {
    androidScheme: 'https',
  },
};

export default config;
