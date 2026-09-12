import { TestBed } from '@angular/core/testing';
import { MigrationsDataAccessService } from 'bite-tribe-admin/migrations-data-access';
import { MigrationsService } from '../migrations.service';

const aDataAccess = (
  override: Partial<MigrationsDataAccessService> = {},
): Partial<MigrationsDataAccessService> => ({
  bites: jest.fn(),
  addressBackfillBites: jest.fn(),
  restaurantClusteringEligibleBites: jest.fn(),
  sendNewVersionNotification: jest.fn(),
  backfillReviewTimestamps: jest.fn(),
  backfillMenuItemIds: jest.fn(),
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
      const service = configure(
        aDataAccess({
          backfillReviewTimestamps,
        } as Partial<MigrationsDataAccessService>),
      );

      await service.runCollectionMigration('review-timestamps');

      expect(backfillReviewTimestamps).toHaveBeenCalledTimes(1);
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

    it('should surface a failure as state instead of rethrowing', async () => {
      // Same reasoning as the release announcement: this page is the only
      // trigger, so a rejected call has to end up where the operator can see it.
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const service = configure(
        aDataAccess({
          backfillReviewTimestamps: jest
            .fn()
            .mockRejectedValue(new Error('unavailable')),
        } as Partial<MigrationsDataAccessService>),
      );

      await expect(
        service.runCollectionMigration('review-timestamps'),
      ).resolves.toBeUndefined();

      expect(service.collectionMigrations()).toEqual({
        'review-timestamps': { status: 'failed' },
      });
    });

    /**
     * The second registered migration (issue #1099), covered here for the same
     * reason the first is: the runner map is the whole of what "registering a
     * migration is a name and a runner" means, and a name wired to the wrong
     * callable is invisible until an operator presses the button.
     */
    it('should call the menu id backfill for its own name', async () => {
      const result = {
        processed: 4,
        updated: 2,
        skipped: 2,
        categories: 3,
        items: 9,
      };
      const backfillMenuItemIds = jest.fn().mockResolvedValue(result);
      const backfillReviewTimestamps = jest.fn();
      const service = configure(
        aDataAccess({
          backfillMenuItemIds,
          backfillReviewTimestamps,
        } as Partial<MigrationsDataAccessService>),
      );

      await service.runCollectionMigration('menu-item-ids');

      expect(backfillMenuItemIds).toHaveBeenCalledTimes(1);
      expect(backfillReviewTimestamps).not.toHaveBeenCalled();
      expect(service.collectionMigrations()).toEqual({
        'menu-item-ids': { status: 'done', result },
      });
    });

    /**
     * Each migration holds its own state, so one long run does not block or
     * overwrite another - the contract in `UC - Run Operational Migrations`,
     * which only became checkable once a second migration existed.
     */
    it('should keep the two migrations states apart', async () => {
      const service = configure(
        aDataAccess({
          backfillReviewTimestamps: jest
            .fn()
            .mockResolvedValue({ processed: 1 }),
          backfillMenuItemIds: jest.fn().mockResolvedValue({ processed: 2 }),
        } as Partial<MigrationsDataAccessService>),
      );

      await service.runCollectionMigration('review-timestamps');
      await service.runCollectionMigration('menu-item-ids');

      expect(service.collectionMigrations()).toEqual({
        'review-timestamps': { status: 'done', result: { processed: 1 } },
        'menu-item-ids': { status: 'done', result: { processed: 2 } },
      });
      expect(service.collectionMigrationState('menu-item-ids')).toEqual({
        status: 'done',
        result: { processed: 2 },
      });
    });
  });
});
