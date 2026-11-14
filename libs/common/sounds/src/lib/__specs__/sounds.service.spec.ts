import { TestBed } from '@angular/core/testing';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import {
  BiteSoundsPlugin,
  SOUND_LENGTH_MS,
  SOUNDS_ENABLED_KEY,
  SoundsService,
} from '../sounds.service';

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn(), isPluginAvailable: jest.fn() },
  registerPlugin: jest.fn(() => ({
    posted: jest.fn(),
    celebration: jest.fn(),
  })),
}));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

// Read before any `clearAllMocks`, which would drop the recorded result.
const biteSounds = (registerPlugin as jest.Mock).mock.results[0]
  .value as Record<keyof BiteSoundsPlugin, jest.Mock>;
const registeredName = (registerPlugin as jest.Mock).mock.calls[0][0];

const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;
const isPluginAvailable = Capacitor.isPluginAvailable as jest.Mock;
const getPreference = Preferences.get as jest.Mock;
const setPreference = Preferences.set as jest.Mock;

type Intent = keyof BiteSoundsPlugin;

const INTENTS: Intent[] = ['posted', 'celebration'];

const nativeCalls = (): number =>
  Object.values(biteSounds).reduce(
    (count, method) => count + method.mock.calls.length,
    0,
  );

describe('SoundsService', () => {
  let service: SoundsService;
  let now: jest.SpyInstance<number, []>;

  /** Moves the clock past the sound playing now. */
  const afterTheSound = (): void => {
    now.mockReturnValue(now() + SOUND_LENGTH_MS);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    Object.values(biteSounds).forEach((method) =>
      method.mockResolvedValue(undefined),
    );
    getPreference.mockResolvedValue({ value: null });
    setPreference.mockResolvedValue(undefined);
    isNativePlatform.mockReturnValue(true);
    isPluginAvailable.mockReturnValue(true);

    TestBed.resetTestingModule();
    service = TestBed.inject(SoundsService);
  });

  afterEach(() => {
    now.mockRestore();
  });

  it('registers the local plugin as BiteSounds', () => {
    expect(registeredName).toBe('BiteSounds');
  });

  it('exposes exactly the two intents', () => {
    const methods = Object.getOwnPropertyNames(SoundsService.prototype).filter(
      (name) =>
        !['constructor', 'play', 'setEnabled', 'loadEnabled'].includes(name),
    );

    expect(methods.sort()).toEqual([...INTENTS].sort());
  });

  describe.each(INTENTS)('%s', (intent) => {
    it('plays its own BiteSounds method and nothing else', async () => {
      await expect(service[intent]()).resolves.toBeUndefined();

      expect(isPluginAvailable).toHaveBeenCalledWith('BiteSounds');
      expect(biteSounds[intent]).toHaveBeenCalledTimes(1);
      expect(biteSounds[intent]).toHaveBeenCalledWith();
      expect(nativeCalls()).toBe(1);
    });

    it('resolves when BiteSounds rejects', async () => {
      biteSounds[intent].mockRejectedValue(new Error('native failure'));

      await expect(service[intent]()).resolves.toBeUndefined();
    });

    it('resolves without playing when BiteSounds is missing', async () => {
      isPluginAvailable.mockReturnValue(false);

      await expect(service[intent]()).resolves.toBeUndefined();

      expect(nativeCalls()).toBe(0);
    });

    it('resolves without playing off a native build', async () => {
      isNativePlatform.mockReturnValue(false);

      await expect(service[intent]()).resolves.toBeUndefined();

      expect(nativeCalls()).toBe(0);
    });
  });

  describe('never stacked', () => {
    it('drops a play that lands while a sound is playing', async () => {
      await service.posted();
      now.mockReturnValue(now() + SOUND_LENGTH_MS - 1);
      await service.celebration();
      await service.posted();

      expect(biteSounds.posted).toHaveBeenCalledTimes(1);
      expect(biteSounds.celebration).not.toHaveBeenCalled();
    });

    it('drops the second of two plays started together', async () => {
      await Promise.all([service.celebration(), service.posted()]);

      expect(nativeCalls()).toBe(1);
      expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
    });

    it('plays again once the sound has ended', async () => {
      await service.posted();
      afterTheSound();
      await service.celebration();

      expect(biteSounds.posted).toHaveBeenCalledTimes(1);
      expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
    });

    it('does not hold the path after a failed play', async () => {
      biteSounds.posted.mockRejectedValueOnce(new Error('native failure'));

      await service.posted();
      await service.celebration();

      expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
    });

    it('does not hold the path for a play the setting dropped', async () => {
      await service.setEnabled(false);
      await service.posted();
      await service.setEnabled(true);
      await service.celebration();

      expect(biteSounds.posted).not.toHaveBeenCalled();
      expect(biteSounds.celebration).toHaveBeenCalledTimes(1);
    });
  });

  describe('the per-device switch', () => {
    /** A fresh service, as at start-up, reading the given stored value. */
    const startWith = (value: string | null): SoundsService => {
      TestBed.resetTestingModule();
      getPreference.mockResolvedValue({ value });

      return TestBed.inject(SoundsService);
    };

    it('reads its one key', async () => {
      const fresh = startWith(null);
      await fresh.posted();

      expect(getPreference).toHaveBeenCalledWith({ key: SOUNDS_ENABLED_KEY });
    });

    it('is on when the key is absent', async () => {
      const fresh = startWith(null);
      await fresh.posted();

      expect(fresh.enabled()).toBe(true);
      expect(biteSounds.posted).toHaveBeenCalledTimes(1);
    });

    it.each(INTENTS)(
      'keeps %s from the plugin when stored off',
      async (intent) => {
        const fresh = startWith('false');
        await fresh[intent]();

        expect(fresh.enabled()).toBe(false);
        expect(nativeCalls()).toBe(0);
      },
    );

    it('stops playing as soon as it is switched off, and persists it', async () => {
      await service.setEnabled(false);
      await service.posted();

      expect(service.enabled()).toBe(false);
      expect(nativeCalls()).toBe(0);
      expect(setPreference).toHaveBeenCalledWith({
        key: SOUNDS_ENABLED_KEY,
        value: 'false',
      });
    });

    it('plays again once switched back on, and persists it', async () => {
      const fresh = startWith('false');
      await fresh.setEnabled(true);
      await fresh.posted();

      expect(biteSounds.posted).toHaveBeenCalledTimes(1);
      expect(setPreference).toHaveBeenCalledWith({
        key: SOUNDS_ENABLED_KEY,
        value: 'true',
      });
    });

    it.each([
      [true, 'false'],
      [false, 'true'],
    ])(
      'keeps a choice of %s made before a stored %s is read',
      async (choice, stored) => {
        let settle: (result: { value: string }) => void = () => undefined;
        TestBed.resetTestingModule();
        getPreference.mockReturnValue(
          new Promise((resolve) => (settle = resolve)),
        );
        const fresh = TestBed.inject(SoundsService);

        await fresh.setEnabled(choice);
        settle({ value: stored });
        await fresh.posted();

        expect(fresh.enabled()).toBe(choice);
      },
    );

    it('keeps the choice for the session when it cannot be stored', async () => {
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      setPreference.mockRejectedValue(new Error('storage full'));

      await expect(service.setEnabled(false)).resolves.toBeUndefined();

      expect(service.enabled()).toBe(false);
      warn.mockRestore();
    });

    it('stays on when the stored value cannot be read', async () => {
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      TestBed.resetTestingModule();
      getPreference.mockRejectedValue(new Error('unreadable'));
      const fresh = TestBed.inject(SoundsService);

      await fresh.posted();

      expect(fresh.enabled()).toBe(true);
      expect(biteSounds.posted).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });
  });
});
