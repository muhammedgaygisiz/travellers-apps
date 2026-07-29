import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavController, Platform } from '@ionic/angular';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { EmailVerificationService } from 'bite-tribe/email-verification-data-access';
import {
  enablePushNotifications,
  getPushPermissionState,
  initPushListeners,
  openPushNotificationSettings,
} from 'push-notifications';
import { SettingsService } from './settings.service';

jest.mock('push-notifications', () => ({
  enablePushNotifications: jest.fn(),
  getPushPermissionState: jest.fn(),
  initPushListeners: jest.fn(),
  openPushNotificationSettings: jest.fn(),
}));

describe(SettingsService.name, () => {
  let service: SettingsService;

  const dataAccess = {
    user: signal({ uid: 'user-1' }),
    publicUser: signal(undefined),
    settings: signal({ pushNotifications: true }),
    saveSettings: jest.fn(),
    logout: jest.fn(),
  };
  const navController = {
    navigateBack: jest.fn(),
    navigateForward: jest.fn(),
  };
  const platform = { is: jest.fn() };
  const emailVerification = {
    promptVisible: signal(false),
    trackPromptShown: jest.fn(),
    resend: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        { provide: SettingsDataAccessService, useValue: dataAccess },
        { provide: NavController, useValue: navController },
        { provide: Platform, useValue: platform },
        { provide: EmailVerificationService, useValue: emailVerification },
      ],
    });

    service = TestBed.inject(SettingsService);
  });

  it('registers an enabled preference after an OS grant', async () => {
    (enablePushNotifications as jest.Mock).mockResolvedValue('granted');

    await service.setPushNotifications(true);

    expect(enablePushNotifications).toHaveBeenCalledWith(
      platform,
      'user-1',
      navController,
    );
    expect(service.pushPermissionState()).toBe('granted');
    expect(service.pushNotificationsPreference()).toBe(true);
  });

  it.each(['denied', 'unsupported'])(
    'reverts the preference when enabling reports %s',
    async (result) => {
      (enablePushNotifications as jest.Mock).mockResolvedValue(result);

      await service.setPushNotifications(true);

      expect(service.pushPermissionState()).toBe(result);
      expect(service.pushNotificationsPreference()).toBe(false);
    },
  );

  it('turns the product preference off without asking the OS', async () => {
    await service.setPushNotifications(false);

    expect(service.pushNotificationsPreference()).toBe(false);
    expect(enablePushNotifications).not.toHaveBeenCalled();
  });

  it('refreshes registration when the stored preference and OS grant agree', async () => {
    (getPushPermissionState as jest.Mock).mockResolvedValue('granted');
    (initPushListeners as jest.Mock).mockResolvedValue(undefined);

    await service.refreshPushPermissionState();

    expect(initPushListeners).toHaveBeenCalledWith(
      platform,
      'user-1',
      navController,
      true,
    );
  });

  it('keeps manual recovery visible when device settings cannot be opened', async () => {
    (openPushNotificationSettings as jest.Mock).mockResolvedValue(false);

    await service.openPushSettings();

    expect(service.pushSettingsOpenFailed()).toBe(true);
  });
});
