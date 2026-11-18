import { TestBed } from '@angular/core/testing';
import { ApplicationInitStatus } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import {
  provideStartupLanguage,
  startupLanguageFor,
} from '../startup-language';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve));

describe(startupLanguageFor.name, () => {
  it('should use the device language on an app route', () => {
    expect(startupLanguageFor('/start', 'tr', false)).toBe('tr');
  });

  it.each(['/privacy', '/support', '/account-deletion'])(
    'should keep %s English on the web',
    (url) => {
      expect(startupLanguageFor(url, 'tr', false)).toBe('en');
    },
  );

  it('should use the device language on a public page in the native app', () => {
    expect(startupLanguageFor('/privacy', 'tr', true)).toBe('tr');
  });
});

describe(provideStartupLanguage.name, () => {
  let events$: Subject<NavigationEnd>;
  let activeLang: string;
  let transloco: {
    getAvailableLangs: jest.Mock;
    getActiveLang: jest.Mock;
    setActiveLang: jest.Mock;
  };
  let stored: string | null;

  const initialize = async (): Promise<void> => {
    events$ = new Subject();
    activeLang = 'en';
    transloco = {
      getAvailableLangs: jest.fn(() => ['en', 'de', 'tr', 'fr', 'zh']),
      getActiveLang: jest.fn(() => activeLang),
      setActiveLang: jest.fn((lang: string) => (activeLang = lang)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: events$ } },
        { provide: TranslocoService, useValue: transloco },
        provideStartupLanguage(),
      ],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;
    await flush();
  };

  const navigateTo = async (url: string): Promise<void> => {
    events$.next(new NavigationEnd(1, url, url));
    await flush();
  };

  const setDeviceLocale = (locale: string): void => {
    jest.spyOn(navigator, 'language', 'get').mockReturnValue(locale);
  };

  beforeEach(() => {
    stored = null;
    (Preferences.get as jest.Mock).mockImplementation(async () => ({
      value: stored,
    }));
    window.history.pushState({}, '', '/start');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('given no language is stored on the device', () => {
    it('should open in the device language when the app ships it', async () => {
      setDeviceLocale('tr-TR');

      await initialize();

      expect(transloco.setActiveLang).toHaveBeenCalledWith('tr');
    });

    it('should open in English when the app does not ship it', async () => {
      setDeviceLocale('pl-PL');

      await initialize();

      expect(activeLang).toBe('en');
    });

    it('should open in English on a device reading Traditional Chinese', async () => {
      setDeviceLocale('zh-TW');

      await initialize();

      expect(activeLang).toBe('en');
    });

    it('should open a public page in English on the web', async () => {
      setDeviceLocale('tr-TR');
      window.history.pushState({}, '', '/privacy');

      await initialize();

      expect(activeLang).toBe('en');
    });

    it('should switch to the device language on entering the app from a public page', async () => {
      setDeviceLocale('tr-TR');
      window.history.pushState({}, '', '/privacy');
      await initialize();

      await navigateTo('/start');

      expect(activeLang).toBe('tr');
    });

    it('should stop following navigation once a choice is stored', async () => {
      setDeviceLocale('tr-TR');
      await initialize();
      stored = 'fr';
      activeLang = 'fr';

      await navigateTo('/privacy');
      await navigateTo('/home');

      expect(activeLang).toBe('fr');
    });

    it('should not write the device language to the device', async () => {
      setDeviceLocale('tr-TR');

      await initialize();

      expect(Preferences.set).not.toHaveBeenCalled();
    });
  });

  describe('given a language is stored on the device', () => {
    it('should open in it, whatever the device language', async () => {
      setDeviceLocale('tr-TR');
      stored = 'de';

      await initialize();

      expect(activeLang).toBe('de');
      expect(transloco.setActiveLang).toHaveBeenCalledTimes(1);
    });
  });
});
