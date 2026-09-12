import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { AnalyticsConsentService } from '../analytics-consent.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));
jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: { setEnabled: jest.fn() },
}));
jest.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: { setEnabled: jest.fn() },
}));

const get = Preferences.get as jest.Mock;
const set = Preferences.set as jest.Mock;
const setAnalyticsEnabled = FirebaseAnalytics.setEnabled as jest.Mock;
const setCrashlyticsEnabled = FirebaseCrashlytics.setEnabled as jest.Mock;

describe('AnalyticsConsentService', () => {
  let service: AnalyticsConsentService;

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ value: null });
    set.mockResolvedValue(undefined);
    setAnalyticsEnabled.mockResolvedValue(undefined);
    setCrashlyticsEnabled.mockResolvedValue(undefined);
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsConsentService);
  });

  describe('given nothing has been decided yet', () => {
    it('should report that a decision is still owed', async () => {
      await service.initialize();

      expect(service.needsDecision()).toBe(true);
      expect(service.analyticsGranted()).toBe(false);
    });

    // The whole point of the gate: the window before the user answers must not
    // collect, and it must say so explicitly rather than leaving a native flag
    // that outlives installs at whatever it happened to be (issue #1387).
    it('should disable collection rather than leave the flag untouched', async () => {
      await service.initialize();

      expect(setAnalyticsEnabled).toHaveBeenCalledWith({ enabled: false });
      expect(setCrashlyticsEnabled).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe('given a stored decision', () => {
    it('should apply a granted decision on startup', async () => {
      get.mockResolvedValue({
        value: JSON.stringify({
          analytics: 'granted',
          crashReporting: 'granted',
        }),
      });

      await service.initialize();

      expect(service.needsDecision()).toBe(false);
      expect(setAnalyticsEnabled).toHaveBeenCalledWith({ enabled: true });
      expect(setCrashlyticsEnabled).toHaveBeenCalledWith({ enabled: true });
    });

    it('should apply the two answers independently', async () => {
      get.mockResolvedValue({
        value: JSON.stringify({
          analytics: 'denied',
          crashReporting: 'granted',
        }),
      });

      await service.initialize();

      expect(setAnalyticsEnabled).toHaveBeenCalledWith({ enabled: false });
      expect(setCrashlyticsEnabled).toHaveBeenCalledWith({ enabled: true });
    });

    // Failing closed costs a second prompt; failing open collects from someone
    // who may already have said no.
    it('should fall back to undecided when the stored value is unreadable', async () => {
      get.mockResolvedValue({ value: '{not json' });

      await service.initialize();

      expect(service.needsDecision()).toBe(true);
      expect(setAnalyticsEnabled).toHaveBeenCalledWith({ enabled: false });
    });

    it('should treat an unknown answer as undecided', async () => {
      get.mockResolvedValue({
        value: JSON.stringify({ analytics: 'maybe', crashReporting: 42 }),
      });

      await service.initialize();

      expect(service.consent()).toEqual({
        analytics: 'unset',
        crashReporting: 'unset',
      });
    });
  });

  describe('when the user answers', () => {
    it('should persist and apply the decision', async () => {
      await service.decide({ analytics: 'granted', crashReporting: 'denied' });

      expect(set).toHaveBeenCalledWith({
        key: 'analytics-consent',
        value: JSON.stringify({
          analytics: 'granted',
          crashReporting: 'denied',
        }),
      });
      expect(setAnalyticsEnabled).toHaveBeenCalledWith({ enabled: true });
      expect(setCrashlyticsEnabled).toHaveBeenCalledWith({ enabled: false });
    });

    it('should leave the other switch alone on a partial update', async () => {
      await service.decide({ analytics: 'granted', crashReporting: 'granted' });
      await service.update({ analytics: 'denied' });

      expect(service.consent()).toEqual({
        analytics: 'denied',
        crashReporting: 'granted',
      });
    });

    it('should keep the decision when persisting fails', async () => {
      set.mockRejectedValue(new Error('disk full'));

      await service.decide({ analytics: 'granted', crashReporting: 'granted' });

      // The SDKs were still told, so the session honours the answer even though
      // the next launch will ask again.
      expect(service.analyticsGranted()).toBe(true);
      expect(setAnalyticsEnabled).toHaveBeenCalledWith({ enabled: true });
    });

    it('should survive an SDK that rejects', async () => {
      setAnalyticsEnabled.mockRejectedValue(new Error('plugin missing'));

      await expect(
        service.decide({ analytics: 'granted', crashReporting: 'granted' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('given the web', () => {
    beforeEach(() => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    });

    // Disabling sets a per-page-load `ga-disable-*` flag, which is the gate we
    // want. Enabling is skipped because the call would eagerly initialize web
    // analytics for apps - the business app among them - that never asked.
    it('should disable collection when consent is withheld', async () => {
      await service.initialize();

      expect(setAnalyticsEnabled).toHaveBeenCalledWith({ enabled: false });
    });

    it('should not eagerly enable collection when granted', async () => {
      await service.decide({ analytics: 'granted', crashReporting: 'granted' });

      expect(setAnalyticsEnabled).not.toHaveBeenCalled();
      expect(setCrashlyticsEnabled).not.toHaveBeenCalled();
    });
  });
});
