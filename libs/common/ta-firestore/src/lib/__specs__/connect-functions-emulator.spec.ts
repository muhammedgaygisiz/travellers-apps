import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { Capacitor } from '@capacitor/core';
import { connectFunctionsEmulator } from '../connect-functions-emulator';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    useEmulator: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('@capacitor/core');

describe(connectFunctionsEmulator.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Capacitor.getPlatform).mockReturnValue('web');
  });

  it('should connect to the configured host and port', async () => {
    await connectFunctionsEmulator({
      host: 'localhost',
      port: 5001,
    });

    expect(FirebaseFunctions.useEmulator).toHaveBeenCalledWith({
      host: 'localhost',
      port: 5001,
    });
  });

  it('should use the host machine address on an Android emulator', async () => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('android');

    await connectFunctionsEmulator({
      host: 'localhost',
      port: 5001,
    });

    expect(FirebaseFunctions.useEmulator).toHaveBeenCalledWith({
      host: '10.0.2.2',
      port: 5001,
    });
  });
});
