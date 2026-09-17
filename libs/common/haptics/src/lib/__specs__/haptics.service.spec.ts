import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { HapticsService } from '../haptics.service';

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn() },
}));
jest.mock('@capacitor/haptics', () => ({
  Haptics: { impact: jest.fn(), notification: jest.fn(), vibrate: jest.fn() },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;
const impact = Haptics.impact as jest.Mock;
const notification = Haptics.notification as jest.Mock;

type Intent = 'selection' | 'confirm' | 'warning' | 'success' | 'error';

const INTENTS: [Intent, jest.Mock, unknown][] = [
  ['selection', impact, { style: ImpactStyle.Light }],
  ['confirm', impact, { style: ImpactStyle.Medium }],
  ['warning', impact, { style: ImpactStyle.Heavy }],
  ['success', notification, { type: NotificationType.Success }],
  ['error', notification, { type: NotificationType.Error }],
];

describe('HapticsService', () => {
  let service: HapticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    impact.mockResolvedValue(undefined);
    notification.mockResolvedValue(undefined);

    service = TestBed.inject(HapticsService);
  });

  it('exposes exactly the five vocabulary intents', () => {
    const methods = Object.getOwnPropertyNames(HapticsService.prototype).filter(
      (name) => name !== 'constructor' && name !== 'play',
    );

    expect(methods.sort()).toEqual(INTENTS.map(([intent]) => intent).sort());
  });

  describe.each(INTENTS)('%s', (intent, call, options) => {
    it('plays its one plugin call on a native build', async () => {
      isNativePlatform.mockReturnValue(true);

      await expect(service[intent]()).resolves.toBeUndefined();

      expect(call).toHaveBeenCalledTimes(1);
      expect(call).toHaveBeenCalledWith(options);
      expect(Haptics.vibrate).not.toHaveBeenCalled();
    });

    it('resolves without reaching the plugin off a native build', async () => {
      isNativePlatform.mockReturnValue(false);

      await expect(service[intent]()).resolves.toBeUndefined();

      expect(impact).not.toHaveBeenCalled();
      expect(notification).not.toHaveBeenCalled();
    });

    it('resolves when the native call rejects', async () => {
      isNativePlatform.mockReturnValue(true);
      call.mockRejectedValue(new Error('plugin not implemented'));

      await expect(service[intent]()).resolves.toBeUndefined();
    });
  });
});
