import { TestBed } from '@angular/core/testing';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { BiteHapticsPlugin, HapticsService } from '../haptics.service';

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

    service = TestBed.inject(HapticsService);
  });

  it('registers the local plugin as BiteHaptics', () => {
    expect(registeredName).toBe('BiteHaptics');
  });

  it('exposes exactly the vocabulary intents', () => {
    const methods = Object.getOwnPropertyNames(HapticsService.prototype).filter(
      (name) => name !== 'constructor' && name !== 'play',
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
});
