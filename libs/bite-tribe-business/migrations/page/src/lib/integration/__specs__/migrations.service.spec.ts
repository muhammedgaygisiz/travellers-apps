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
  backfillReviewTimestamps: jest.fn(),
  backfillDisplayNameClaims: jest.fn(),
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

  describe('runCollectionMigration', () => {
    it('should report nothing before any migration was started', () => {
      const service = configure(aDataAccess());

      expect(service.collectionMigrations()).toEqual({});
    });

    it('should call the callable the migration name stands for', async () => {
      const backfillReviewTimestamps = jest.fn().mockResolvedValue({
        processed: 12,
        filled: 4,
        skipped: 7,
        unresolvable: 1,
      });
      const backfillDisplayNameClaims = jest.fn();
      const service = configure(
        aDataAccess({
          backfillReviewTimestamps,
          backfillDisplayNameClaims,
        } as Partial<MigrationsDataAccessService>),
      );

      await service.runCollectionMigration('review-timestamps');

      expect(backfillReviewTimestamps).toHaveBeenCalledTimes(1);
      expect(backfillDisplayNameClaims).not.toHaveBeenCalled();
    });

    it('should mark a migration as in flight while it runs', async () => {
      let release: (() => void) | undefined;
      const service = configure(
        aDataAccess({
          backfillReviewTimestamps: jest.fn(
            () =>
              new Promise((resolve) => {
                release = (): void => resolve({ processed: 0 });
              }),
          ),
        } as Partial<MigrationsDataAccessService>),
      );

      const pending = service.runCollectionMigration('review-timestamps');

      expect(service.collectionMigrations()).toEqual({
        'review-timestamps': { status: 'running' },
      });

      release?.();
      await pending;
    });

    it('should keep the counts a finished migration reported', async () => {
      const result = {
        processed: 12,
        filled: 4,
        skipped: 7,
        unresolvable: 1,
      };
      const service = configure(
        aDataAccess({
          backfillReviewTimestamps: jest.fn().mockResolvedValue(result),
        } as Partial<MigrationsDataAccessService>),
      );

      await service.runCollectionMigration('review-timestamps');

      expect(service.collectionMigrations()).toEqual({
        'review-timestamps': { status: 'done', result },
      });
    });

    it('should keep each migration state apart from the others', async () => {
      const service = configure(
        aDataAccess({
          backfillReviewTimestamps: jest.fn().mockResolvedValue({
            processed: 1,
          }),
          backfillDisplayNameClaims: jest.fn().mockResolvedValue({
            processed: 2,
          }),
        } as Partial<MigrationsDataAccessService>),
      );

      await service.runCollectionMigration('review-timestamps');
      await service.runCollectionMigration('display-name-claims');

      expect(service.collectionMigrations()).toEqual({
        'review-timestamps': { status: 'done', result: { processed: 1 } },
        'display-name-claims': { status: 'done', result: { processed: 2 } },
      });
    });

    it('should surface a failure as state instead of rethrowing', async () => {
      // Same reasoning as the release announcement: this page is the only
      // trigger, so a rejected call has to end up where the operator can see it.
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const service = configure(
        aDataAccess({
          backfillDisplayNameClaims: jest
            .fn()
            .mockRejectedValue(new Error('unavailable')),
        } as Partial<MigrationsDataAccessService>),
      );

      await expect(
        service.runCollectionMigration('display-name-claims'),
      ).resolves.toBeUndefined();

      expect(service.collectionMigrations()).toEqual({
        'display-name-claims': { status: 'failed' },
      });
    });
  });
});
