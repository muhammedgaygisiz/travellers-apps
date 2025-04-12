import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.travellers.finances',
  appName: 'Travellers Finances',
  webDir: '../../dist/apps/finances',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
};

export default config;
