import { TestBed } from '@angular/core/testing';
import { MigrationsDataAccessService } from 'bite-tribe-business/migrations-data-access';
import { MigrationsService } from '../migrations.service';

const aDataAccess = (
  override: Partial<MigrationsDataAccessService> = {},
): Partial<MigrationsDataAccessService> => ({
  bites: jest.fn(),
  addressBackfillBites: jest.fn(),
  restaurantClusteringEligibleBites: jest.fn(),
  sendNewVersionNotification: jest.fn(),
  ...override,
});

const configure = (
  dataAccess: Partial<MigrationsDataAccessService>,
): MigrationsService => {
  TestBed.configureTestingModule({
    providers: [
      MigrationsService,
      { provide: MigrationsDataAccessService, useValue: dataAccess },
    ],
  });

  return TestBed.inject(MigrationsService);
};

describe(MigrationsService.name, () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  describe('sendNewVersionNotification', () => {
    it('should report nothing before an announcement was triggered', () => {
      const service = configure(aDataAccess());

      expect(service.newVersionNotification()).toBeNull();
    });

    it('should mark the announcement as in flight while it is sending', async () => {
      let release: (() => void) | undefined;
      const sendNewVersionNotification = jest.fn(
        () =>
          new Promise((resolve) => {
            release = (): void =>
              resolve({ platform: 'ios', tokenCount: 3, userCount: 5 });
          }),
      );
      const service = configure(
        aDataAccess({
          sendNewVersionNotification,
        } as Partial<MigrationsDataAccessService>),
      );

      const pending = service.sendNewVersionNotification('ios');

      expect(service.newVersionNotification()).toEqual({
        platform: 'ios',
        status: 'sending',
      });

      release?.();
      await pending;
    });

    it('should keep the reach of a finished announcement', async () => {
      const service = configure(
        aDataAccess({
          sendNewVersionNotification: jest.fn().mockResolvedValue({
            platform: 'android',
            tokenCount: 3,
            userCount: 5,
          }),
        } as Partial<MigrationsDataAccessService>),
      );

      await service.sendNewVersionNotification('android');

      expect(service.newVersionNotification()).toEqual({
        platform: 'android',
        status: 'sent',
        result: { platform: 'android', tokenCount: 3, userCount: 5 },
      });
    });

    it('should surface a failure as state instead of rethrowing', async () => {
      // The page is the only trigger, so a rejected call has to end up
      // somewhere the operator can see it.
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const service = configure(
        aDataAccess({
          sendNewVersionNotification: jest
            .fn()
            .mockRejectedValue(new Error('unavailable')),
        } as Partial<MigrationsDataAccessService>),
      );

      await expect(
        service.sendNewVersionNotification('ios'),
      ).resolves.toBeUndefined();

      expect(service.newVersionNotification()).toEqual({
        platform: 'ios',
        status: 'failed',
      });
    });
  });
});
