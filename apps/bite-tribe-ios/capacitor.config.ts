import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bitetribe.app',
  appName: 'BiteTribe',
  webDir: '../../dist/apps/bite-tribe',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com'],
    },
    SplashScreen: {
      launchAutoHide: false,
    },
  },
};

export default config;
