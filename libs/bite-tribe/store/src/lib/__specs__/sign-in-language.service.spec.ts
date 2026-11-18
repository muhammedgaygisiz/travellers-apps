import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { AuthService } from 'ta-firestore';
import { SettingsApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import type { Settings } from 'model';
import { SignInLanguageService } from '../sign-in-language.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { set: jest.fn() },
}));

const ENDONYMS: Record<string, string> = {
  turkish: 'Türkçe',
  french: 'Français',
};

describe(SignInLanguageService.name, () => {
  let service: SignInLanguageService;
  let activeLang: string;
  let user: { uid: string; isAnonymous: boolean } | null;
  let settings: Settings | undefined;
  let dismissRole: string;

  const settingsApi = {
    loadSettingsByUserId: jest.fn(),
    mergeSettings: jest.fn(),
  };
  const storeService = { notifySavedSettings: jest.fn() };
  const transloco = {
    getActiveLang: jest.fn(() => activeLang),
    setActiveLang: jest.fn((lang: string) => (activeLang = lang)),
    load: jest.fn(() => of({})),
    translate: jest.fn(
      (key: string, params?: Record<string, string>) =>
        ENDONYMS[key] ?? (params ? `${key} ${JSON.stringify(params)}` : key),
    ),
  };
  const alert = {
    present: jest.fn(),
    onDidDismiss: jest.fn(async () => ({ role: dismissRole })),
  };
  const alertController = { create: jest.fn(async () => alert) };

  beforeEach(() => {
    jest.clearAllMocks();
    activeLang = 'tr';
    user = { uid: 'uid-1', isAnonymous: false };
    settings = { language: 'fr', currency: 'EUR' } as Settings;
    dismissRole = 'cancel';
    settingsApi.loadSettingsByUserId.mockImplementation(async () => settings);
    settingsApi.mergeSettings.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getUser: (): typeof user => user },
        },
        { provide: SettingsApiService, useValue: settingsApi },
        { provide: BiteTribeStoreService, useValue: storeService },
        { provide: TranslocoService, useValue: transloco },
        { provide: AlertController, useValue: alertController },
      ],
    });

    service = TestBed.inject(SignInLanguageService);
  });

  describe('given the account has no language', () => {
    beforeEach(() => {
      settings = { currency: 'EUR' } as Settings;
    });

    it('should save the language on screen to the account without asking', async () => {
      await service.reconcile();

      expect(alertController.create).not.toHaveBeenCalled();
      expect(settingsApi.mergeSettings).toHaveBeenCalledWith({
        language: 'tr',
      });
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'lang',
        value: 'tr',
      });
      expect(storeService.notifySavedSettings).toHaveBeenCalledWith({
        currency: 'EUR',
        language: 'tr',
      });
    });

    it('should not notify the store when there is no settings document', async () => {
      settings = undefined;

      await service.reconcile();

      expect(settingsApi.mergeSettings).toHaveBeenCalledWith({
        language: 'tr',
      });
      expect(storeService.notifySavedSettings).not.toHaveBeenCalled();
    });
  });

  describe('given the account language matches the one on screen', () => {
    it('should neither ask nor write', async () => {
      activeLang = 'fr';

      await service.reconcile();

      expect(alertController.create).not.toHaveBeenCalled();
      expect(settingsApi.mergeSettings).not.toHaveBeenCalled();
      expect(Preferences.set).not.toHaveBeenCalled();
    });
  });

  describe('given the account language differs', () => {
    it('should ask in the language on screen, naming both by endonym', async () => {
      await service.reconcile();

      expect(transloco.load).toHaveBeenCalledWith('tr');
      expect(alertController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          buttons: [
            { text: 'Türkçe', role: 'cancel' },
            { text: 'Français', role: 'confirm' },
          ],
        }),
      );
      expect(transloco.translate).toHaveBeenCalledWith(
        'account-language-prompt-message',
        { accountLanguage: 'Français', currentLanguage: 'Türkçe' },
      );
    });

    it('should switch to the account language when the person chooses it', async () => {
      dismissRole = 'confirm';

      await service.reconcile();

      expect(activeLang).toBe('fr');
      expect(transloco.load).toHaveBeenCalledWith('fr');
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'lang',
        value: 'fr',
      });
      expect(settingsApi.mergeSettings).not.toHaveBeenCalled();
    });

    it.each(['cancel', 'backdrop', undefined])(
      'should keep the language on screen and write it to the account on %p',
      async (role) => {
        dismissRole = role as string;

        await service.reconcile();

        expect(activeLang).toBe('tr');
        expect(settingsApi.mergeSettings).toHaveBeenCalledWith({
          language: 'tr',
        });
        expect(Preferences.set).toHaveBeenCalledWith({
          key: 'lang',
          value: 'tr',
        });
      },
    );

    it('should not store the choice on the device when the account write fails', async () => {
      settingsApi.mergeSettings.mockRejectedValue(new Error('offline'));
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      await service.reconcile();

      expect(Preferences.set).not.toHaveBeenCalled();
      expect(storeService.notifySavedSettings).not.toHaveBeenCalled();
    });
  });

  describe('given an account language the app does not ship', () => {
    it('should overwrite it with the language on screen without asking', async () => {
      settings = { language: 'pl' } as Settings;

      await service.reconcile();

      expect(alertController.create).not.toHaveBeenCalled();
      expect(settingsApi.mergeSettings).toHaveBeenCalledWith({
        language: 'tr',
      });
    });
  });

  describe('given an anonymous guest session', () => {
    it('should neither read, ask nor write', async () => {
      user = { uid: 'guest', isAnonymous: true };

      await service.reconcile();

      expect(settingsApi.loadSettingsByUserId).not.toHaveBeenCalled();
      expect(alertController.create).not.toHaveBeenCalled();
      expect(settingsApi.mergeSettings).not.toHaveBeenCalled();
    });
  });
});
