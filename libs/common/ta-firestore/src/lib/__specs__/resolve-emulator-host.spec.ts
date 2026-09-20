import { Capacitor } from '@capacitor/core';

import {
  parseEmulatorUrl,
  resolveEmulatorHost,
} from '../resolve-emulator-host';

jest.mock('@capacitor/core');

describe(resolveEmulatorHost.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Capacitor.getPlatform).mockReturnValue('web');
  });

  it('should leave an explicit host untouched', () => {
    expect(resolveEmulatorHost('192.168.1.20')).toBe('192.168.1.20');
    expect(resolveEmulatorHost('emulators.internal')).toBe(
      'emulators.internal',
    );
  });

  it.each(['localhost', '127.0.0.1', '[::1]', 'LOCALHOST'])(
    'should keep %s on the web and on the iOS Simulator, which share the host network stack',
    (host) => {
      expect(resolveEmulatorHost(host)).toBe(host);

      jest.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      expect(resolveEmulatorHost(host)).toBe(host);
    },
  );

  it('should use the host machine alias on an Android emulator', () => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('android');

    expect(resolveEmulatorHost('localhost')).toBe('10.0.2.2');
    expect(resolveEmulatorHost('127.0.0.1')).toBe('10.0.2.2');
  });

  // The live-reload case needs a non-loopback document origin, which jsdom
  // only takes from the environment URL, so it lives in
  // `resolve-emulator-host.live-reload.spec.ts`.
});

describe(parseEmulatorUrl.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Capacitor.getPlatform).mockReturnValue('web');
  });

  it('should split an emulator URL into plugin arguments', () => {
    expect(parseEmulatorUrl('http://localhost:9099')).toEqual({
      host: 'localhost',
      port: 9099,
      scheme: 'http',
      url: 'http://localhost:9099',
    });
  });

  it('should resolve the host and rebuild the URL around it', () => {
    jest.mocked(Capacitor.getPlatform).mockReturnValue('android');

    expect(parseEmulatorUrl('http://localhost:9099')).toEqual({
      host: '10.0.2.2',
      port: 9099,
      scheme: 'http',
      url: 'http://10.0.2.2:9099',
    });
  });

  it('should keep a URL without an explicit port', () => {
    expect(parseEmulatorUrl('https://auth.example.test')).toEqual({
      host: 'auth.example.test',
      port: undefined,
      scheme: 'https',
      url: 'https://auth.example.test',
    });
  });

  it('should hand back an unparseable value rather than throwing', () => {
    expect(parseEmulatorUrl('')).toEqual({
      host: '',
      port: undefined,
      scheme: 'http',
      url: '',
    });
  });
});
