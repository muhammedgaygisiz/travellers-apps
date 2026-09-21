import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { resolveEmulatorHost } from './resolve-emulator-host';

interface FunctionsEmulatorOptions {
  host: string;
  port: number;
}

export const connectFunctionsEmulator = ({
  host,
  port,
}: FunctionsEmulatorOptions): Promise<void> =>
  FirebaseFunctions.useEmulator({
    host: resolveEmulatorHost(host),
    port,
  });
