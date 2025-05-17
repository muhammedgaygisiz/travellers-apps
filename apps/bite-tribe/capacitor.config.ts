import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bitetribe.app',
  appName: 'BiteTribe',
  webDir: '../../dist/apps/bite-tribe',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
};

export default config;
