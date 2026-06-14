import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bitetribe.app',
  appName: 'BiteTribe',
  webDir: '../../dist/apps/bite-tribe',
  server: {
    androidScheme: 'https',
    cleartext: process.env['NX_APP_BITE_TRIBE_IS_DEV'] === 'true',
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
