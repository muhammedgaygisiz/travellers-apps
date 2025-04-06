import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.travellersapps.finances',
  appName: 'Travellers Finances',
  webDir: '../../dist/apps/finances',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
};

export default config;
