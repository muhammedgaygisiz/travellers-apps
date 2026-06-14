import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { Capacitor } from '@capacitor/core';

interface FunctionsEmulatorOptions {
  host: string;
  port: number;
}

export const connectFunctionsEmulator = ({
  host,
  port,
}: FunctionsEmulatorOptions): Promise<void> => {
  const emulatorHost =
    Capacitor.getPlatform() === 'android' &&
    ['localhost', '127.0.0.1'].includes(host)
      ? '10.0.2.2'
      : host;

  return FirebaseFunctions.useEmulator({
    host: emulatorHost,
    port,
  });
};
