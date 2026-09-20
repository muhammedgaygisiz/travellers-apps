/**
 * @jest-environment-options {"url": "http://192.168.1.20:4200/"}
 *
 * A live-reload native run (`cap run ios|android -l --host 0.0.0.0`) serves
 * the WebView from the developer machine's LAN address, which is also the
 * machine running the emulators. This file sets that document origin for the
 * whole environment, because jsdom takes it from the environment URL and does
 * not let a test redefine `location` afterwards. The default-origin cases are
 * in `resolve-emulator-host.spec.ts`.
 */
import { Capacitor } from '@capacitor/core';

import {
  parseEmulatorUrl,
  resolveEmulatorHost,
} from '../resolve-emulator-host';

jest.mock('@capacitor/core');

describe(`${resolveEmulatorHost.name} under live reload`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Capacitor.getPlatform).mockReturnValue('web');
  });

  // On a physical device `localhost` is the phone, so a configured loopback
  // host has to be replaced by the machine actually running the emulators
  // (issue #1221).
  it.each(['ios' as const, 'android' as const, 'web' as const])(
    'should resolve a loopback host to the serving host on %s',
    (platform) => {
      jest.mocked(Capacitor.getPlatform).mockReturnValue(platform);

      expect(resolveEmulatorHost('localhost')).toBe('192.168.1.20');
      expect(resolveEmulatorHost('127.0.0.1')).toBe('192.168.1.20');
    },
  );

  // The serving host wins over the Android alias: `10.0.2.2` is reachable only
  // from an Android emulator, while the LAN address is right on an emulator
  // and on a physical device alike.
  it('should prefer the serving host over the Android emulator alias', () => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('android');

    expect(resolveEmulatorHost('localhost')).not.toBe('10.0.2.2');
  });

  it('should still leave an explicit host untouched', () => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('ios');

    expect(resolveEmulatorHost('emulators.internal')).toBe(
      'emulators.internal',
    );
  });

  it('should rebuild an Auth emulator URL around the serving host', () => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('ios');

    expect(parseEmulatorUrl('http://localhost:9099')).toEqual({
      host: '192.168.1.20',
      port: 9099,
      scheme: 'http',
      url: 'http://192.168.1.20:9099',
    });
  });
});
