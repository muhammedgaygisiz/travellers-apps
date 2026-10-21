import { TestBed } from '@angular/core/testing';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import {
  BiteHapticsPlugin,
  HAPTICS_ENABLED_KEY,
  HapticsService,
} from '../haptics.service';

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn(), isPluginAvailable: jest.fn() },
  registerPlugin: jest.fn(() => ({
    press: jest.fn(),
    release: jest.fn(),
    tick: jest.fn(),
    selection: jest.fn(),
    confirm: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  })),
}));
jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));
jest.mock('@capacitor/haptics', () => ({
  Haptics: { impact: jest.fn(), notification: jest.fn(), vibrate: jest.fn() },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

// Read before any `clearAllMocks`, which would drop the recorded result.
const biteHaptics = (registerPlugin as jest.Mock).mock.results[0]
  .value as Record<keyof BiteHapticsPlugin, jest.Mock>;
const registeredName = (registerPlugin as jest.Mock).mock.calls[0][0];

const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;
const isPluginAvailable = Capacitor.isPluginAvailable as jest.Mock;
const impact = Haptics.impact as jest.Mock;
const notification = Haptics.notification as jest.Mock;
const getPreference = Preferences.get as jest.Mock;
const setPreference = Preferences.set as jest.Mock;

type Intent = keyof BiteHapticsPlugin;

/** Each intent, and the `@capacitor/haptics` call it falls back to. */
const INTENTS: [Intent, jest.Mock, unknown][] = [
  ['press', impact, { style: ImpactStyle.Light }],
  ['release', impact, { style: ImpactStyle.Light }],
  ['tick', impact, { style: ImpactStyle.Light }],
  ['selection', impact, { style: ImpactStyle.Light }],
  ['confirm', impact, { style: ImpactStyle.Medium }],
  ['warning', impact, { style: ImpactStyle.Heavy }],
  ['success', notification, { type: NotificationType.Success }],
  ['error', notification, { type: NotificationType.Error }],
];

const nativeCalls = (): number =>
  Object.values(biteHaptics).reduce(
    (count, method) => count + method.mock.calls.length,
    0,
  );

describe('HapticsService', () => {
  let service: HapticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    impact.mockResolvedValue(undefined);
    notification.mockResolvedValue(undefined);
    Object.values(biteHaptics).forEach((method) =>
      method.mockResolvedValue(undefined),
    );
    getPreference.mockResolvedValue({ value: null });
    setPreference.mockResolvedValue(undefined);

    service = TestBed.inject(HapticsService);
  });

  it('registers the local plugin as BiteHaptics', () => {
    expect(registeredName).toBe('BiteHaptics');
  });

  it('exposes exactly the vocabulary intents', () => {
    const methods = Object.getOwnPropertyNames(HapticsService.prototype).filter(
      (name) =>
        !['constructor', 'play', 'setEnabled', 'loadEnabled'].includes(name),
    );

    expect(methods.sort()).toEqual(INTENTS.map(([intent]) => intent).sort());
  });

  describe.each(INTENTS)('%s', (intent, fallback, options) => {
    describe('with BiteHaptics available', () => {
      beforeEach(() => {
        isNativePlatform.mockReturnValue(true);
        isPluginAvailable.mockReturnValue(true);
      });

      it('plays its own BiteHaptics method and nothing else', async () => {
        await expect(service[intent]()).resolves.toBeUndefined();

        expect(isPluginAvailable).toHaveBeenCalledWith('BiteHaptics');
        expect(biteHaptics[intent]).toHaveBeenCalledTimes(1);
        expect(biteHaptics[intent]).toHaveBeenCalledWith();
        expect(nativeCalls()).toBe(1);
        expect(impact).not.toHaveBeenCalled();
        expect(notification).not.toHaveBeenCalled();
        expect(Haptics.vibrate).not.toHaveBeenCalled();
      });

      it('resolves when BiteHaptics rejects', async () => {
        biteHaptics[intent].mockRejectedValue(new Error('native failure'));

        await expect(service[intent]()).resolves.toBeUndefined();
      });
    });

    describe('without BiteHaptics', () => {
      beforeEach(() => {
        isNativePlatform.mockReturnValue(true);
        isPluginAvailable.mockReturnValue(false);
      });

      it('falls back to its one @capacitor/haptics call', async () => {
        await expect(service[intent]()).resolves.toBeUndefined();

        expect(fallback).toHaveBeenCalledTimes(1);
        expect(fallback).toHaveBeenCalledWith(options);
        expect(nativeCalls()).toBe(0);
        expect(Haptics.vibrate).not.toHaveBeenCalled();
      });

      it('resolves when the fallback rejects', async () => {
        fallback.mockRejectedValue(new Error('plugin not implemented'));

        await expect(service[intent]()).resolves.toBeUndefined();
      });
    });

    it('resolves without reaching any plugin off a native build', async () => {
      isNativePlatform.mockReturnValue(false);
      isPluginAvailable.mockReturnValue(true);

      await expect(service[intent]()).resolves.toBeUndefined();

      expect(nativeCalls()).toBe(0);
      expect(impact).not.toHaveBeenCalled();
      expect(notification).not.toHaveBeenCalled();
    });
  });

  describe('the per-device switch', () => {
    /** A fresh service, as at start-up, reading the given stored value. */
    const startWith = (value: string | null): HapticsService => {
      TestBed.resetTestingModule();
      getPreference.mockResolvedValue({ value });

      return TestBed.inject(HapticsService);
    };

    beforeEach(() => {
      isNativePlatform.mockReturnValue(true);
      isPluginAvailable.mockReturnValue(true);
    });

    it('reads its one key', async () => {
      const fresh = startWith(null);
      await fresh.selection();

      expect(getPreference).toHaveBeenCalledWith({ key: HAPTICS_ENABLED_KEY });
    });

    it('is on when the key is absent', async () => {
      const fresh = startWith(null);
      await fresh.selection();

      expect(fresh.enabled()).toBe(true);
      expect(biteHaptics.selection).toHaveBeenCalledTimes(1);
    });

    it.each(INTENTS.map(([intent]) => intent))(
      'keeps %s from every plugin when stored off',
      async (intent) => {
        const fresh = startWith('false');
        isPluginAvailable.mockReturnValue(true);
        await fresh[intent]();
        isPluginAvailable.mockReturnValue(false);
        await fresh[intent]();

        expect(fresh.enabled()).toBe(false);
        expect(nativeCalls()).toBe(0);
        expect(impact).not.toHaveBeenCalled();
        expect(notification).not.toHaveBeenCalled();
      },
    );

    it('stops playing as soon as it is switched off, and persists it', async () => {
      await service.setEnabled(false);
      await service.press();

      expect(service.enabled()).toBe(false);
      expect(nativeCalls()).toBe(0);
      expect(setPreference).toHaveBeenCalledWith({
        key: HAPTICS_ENABLED_KEY,
        value: 'false',
      });
    });

    it('plays again once switched back on, and persists it', async () => {
      const fresh = startWith('false');
      await fresh.setEnabled(true);
      await fresh.press();

      expect(biteHaptics.press).toHaveBeenCalledTimes(1);
      expect(setPreference).toHaveBeenCalledWith({
        key: HAPTICS_ENABLED_KEY,
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
        const fresh = TestBed.inject(HapticsService);

        await fresh.setEnabled(choice);
        settle({ value: stored });
        await fresh.press();

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
      const fresh = TestBed.inject(HapticsService);

      await fresh.press();

      expect(fresh.enabled()).toBe(true);
      expect(biteHaptics.press).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });
  });
});
