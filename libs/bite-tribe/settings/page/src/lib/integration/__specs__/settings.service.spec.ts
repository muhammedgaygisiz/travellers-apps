import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { EmailVerificationService } from 'bite-tribe/email-verification-data-access';
import type { PushInstallation } from 'push-notifications';
import { signal } from '@angular/core';
import { SettingsService } from '../settings.service';

const CURRENT_INSTALLATION = 'installation-a';

describe(SettingsService.name, () => {
  let service: SettingsService;
  let loadPushInstallations: jest.Mock;
  let setPushInstallationEnabled: jest.Mock;
  let readInstallationId: jest.Mock;
  let getPushPermissionState: jest.Mock;
  let enablePushOnThisDevice: jest.Mock;
  let openPushSettings: jest.Mock;

  const installation = (
    overrides: Partial<PushInstallation> = {},
  ): PushInstallation => ({
    token: 'token-1',
    installationId: CURRENT_INSTALLATION,
    platform: 'ios',
    deviceLabel: 'iPhone',
    osVersion: '26.5',
    appVersion: '1.0.1 (88)',
    enabled: true,
    ...overrides,
  });

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation();

    loadPushInstallations = jest.fn().mockResolvedValue([]);
    setPushInstallationEnabled = jest.fn().mockResolvedValue(undefined);
    readInstallationId = jest.fn().mockResolvedValue(CURRENT_INSTALLATION);
    getPushPermissionState = jest.fn().mockResolvedValue('granted');
    enablePushOnThisDevice = jest.fn().mockResolvedValue('granted');
    openPushSettings = jest.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        {
          provide: SettingsDataAccessService,
          useValue: {
            user: signal(undefined),
            settings: signal(undefined),
            publicUser: signal(undefined),
            loadPushInstallations,
            setPushInstallationEnabled,
            readInstallationId,
            getPushPermissionState,
            enablePushOnThisDevice,
            openPushSettings,
          },
        },
        {
          provide: EmailVerificationService,
          useValue: { promptVisible: signal(false) },
        },
        { provide: NavController, useValue: { navigateBack: jest.fn() } },
      ],
    });

    service = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('refreshPushInstallations', () => {
    it('marks the installation running this app as the current device', async () => {
      loadPushInstallations.mockResolvedValue([
        installation({ token: 'token-1' }),
        installation({ token: 'token-2', installationId: 'installation-b' }),
      ]);

      await service.refreshPushInstallations();

      expect(
        service
          .pushInstallations()
          .map(({ token, isCurrentDevice }) => [token, isCurrentDevice]),
      ).toEqual([
        ['token-1', true],
        ['token-2', false],
      ]);
    });

    it('labels a row from its device metadata, never from the raw token', async () => {
      loadPushInstallations.mockResolvedValue([installation()]);

      await service.refreshPushInstallations();

      expect(service.pushInstallations()[0]).toEqual(
        expect.objectContaining({
          label: 'iPhone',
          details: 'iOS 26.5 · 1.0.1 (88)',
        }),
      );
    });

    it('leaves a legacy installation without a label for the page to translate', async () => {
      loadPushInstallations.mockResolvedValue([
        installation({
          installationId: undefined,
          deviceLabel: undefined,
          osVersion: undefined,
          appVersion: undefined,
        }),
      ]);

      await service.refreshPushInstallations();

      expect(service.pushInstallations()[0]).toEqual(
        expect.objectContaining({
          label: '',
          details: 'iOS',
          isCurrentDevice: false,
        }),
      );
    });

    it('marks nothing as this device where no installation id exists', async () => {
      // The web build never registers a token, so it has no installation id.
      // A legacy token has none either, and the two must not match each other.
      readInstallationId.mockResolvedValue(undefined);
      loadPushInstallations.mockResolvedValue([
        installation({ token: 'token-1' }),
        installation({ token: 'token-2', installationId: undefined }),
      ]);

      await service.refreshPushInstallations();

      expect(
        service
          .pushInstallations()
          .map(({ isCurrentDevice }) => isCurrentDevice),
      ).toEqual([false, false]);
    });

    it('records this device OS permission alongside the list', async () => {
      getPushPermissionState.mockResolvedValue('denied');

      await service.refreshPushInstallations();

      expect(service.pushPermission()).toBe('denied');
    });

    it('clears the loading flag even when the read fails', async () => {
      loadPushInstallations.mockRejectedValue(new Error('boom'));

      await expect(service.refreshPushInstallations()).rejects.toThrow('boom');
      expect(service.pushInstallationsLoading()).toBe(false);
    });
  });

  describe('setPushInstallationEnabled', () => {
    beforeEach(async () => {
      loadPushInstallations.mockResolvedValue([
        installation({ token: 'token-1' }),
        installation({ token: 'token-2', installationId: 'installation-b' }),
      ]);
      await service.refreshPushInstallations();
    });

    it('writes only the changed installation', async () => {
      await service.setPushInstallationEnabled('token-1', false);

      expect(setPushInstallationEnabled).toHaveBeenCalledWith('token-1', false);
      expect(setPushInstallationEnabled).toHaveBeenCalledTimes(1);
    });

    it('leaves another installation of the same account untouched', async () => {
      await service.setPushInstallationEnabled('token-1', false);

      expect(
        service
          .pushInstallations()
          .map(({ token, enabled }) => [token, enabled]),
      ).toEqual([
        ['token-1', false],
        ['token-2', true],
      ]);
    });

    it('restores the previous state when the write fails', async () => {
      // A switch that stays flipped after a failed write would claim delivery
      // is off while the backend still sends to that installation.
      setPushInstallationEnabled.mockRejectedValue(new Error('boom'));

      await service.setPushInstallationEnabled('token-1', false);

      expect(service.pushInstallations()[0].enabled).toBe(true);
    });
  });

  describe('enablePushOnThisDevice', () => {
    it('reloads the list so the setup action is replaced by the new row', async () => {
      loadPushInstallations.mockResolvedValue([installation()]);

      await service.enablePushOnThisDevice();

      expect(service.pushInstallations()[0].isCurrentDevice).toBe(true);
      expect(service.pushSetupRunning()).toBe(false);
    });

    it('turns a denial into the OS-blocked state with its recovery route', async () => {
      enablePushOnThisDevice.mockResolvedValue('denied');

      await service.enablePushOnThisDevice();

      expect(service.pushPermission()).toBe('denied');
      expect(loadPushInstallations).not.toHaveBeenCalled();
    });

    it('reports an unsupported platform rather than a refusal', async () => {
      enablePushOnThisDevice.mockResolvedValue('unsupported');

      await service.enablePushOnThisDevice();

      expect(service.pushPermission()).toBe('unsupported');
    });

    it('ignores a second tap while the first setup is still running', async () => {
      let resolveSetup!: (value: string) => void;
      enablePushOnThisDevice.mockReturnValue(
        new Promise((resolve) => {
          resolveSetup = resolve;
        }),
      );

      const first = service.enablePushOnThisDevice();
      const second = service.enablePushOnThisDevice();
      resolveSetup('granted');
      await Promise.all([first, second]);

      expect(enablePushOnThisDevice).toHaveBeenCalledTimes(1);
    });
  });

  describe('openPushSettings', () => {
    it('delegates to the device settings route', async () => {
      await expect(service.openPushSettings()).resolves.toBe(true);
      expect(openPushSettings).toHaveBeenCalled();
    });
  });
});
