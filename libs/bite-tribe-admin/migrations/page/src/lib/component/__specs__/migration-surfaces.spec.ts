import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform, Type } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { Bite } from 'model';
import { NewVersionNotification } from '../new-version-notification/new-version-notification';
import { CollectionMigration } from '../collection-migration/collection-migration';
import { BiteAddressBackfill } from '../bite-address-backfill/bite-address-backfill';
import { RestaurantClustering } from '../restaurant-clustering/restaurant-clustering';
import { ImageMigration } from '../image-migration/image-migration';
import { GeohashMigration } from '../geohash-migration/geohash-migration';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string, params?: Record<string, unknown>): string {
    return params ? `${value}:${JSON.stringify(params)}` : value;
  }
}

const render = async <T>(
  component: Type<T>,
  inputs: Record<string, unknown> = {},
): Promise<{ fixture: ComponentFixture<T>; ref: ComponentRef<T> }> => {
  await TestBed.configureTestingModule({
    providers: [provideIonicAngular()],
  })
    .overrideComponent(component, {
      remove: { imports: [TranslocoPipe] },
      add: { imports: [MockTranslocoPipe] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(component);

  // Required inputs are set before the first render, or the template reads one
  // that has no value yet.
  Object.entries(inputs).forEach(([name, value]) =>
    fixture.componentRef.setInput(name, value),
  );
  fixture.detectChanges();

  return { fixture, ref: fixture.componentRef };
};

const bite = (over: Partial<Bite>): Bite =>
  ({
    id: 'bite-1',
    name: 'Margherita',
    position: { latitude: 46.948, longitude: 7.4474 },
    ...over,
  }) as Bite;

/**
 * The migrations page became one surface per migration with issue #1473. What
 * each surface must still do is what the single page did: show only the Bites
 * that need it, and refuse to fire twice.
 */
describe('migration surfaces', () => {
  afterEach(() => TestBed.resetTestingModule());

  describe(NewVersionNotification.name, () => {
    it('disables both stores while a send is in flight', async () => {
      const { fixture, ref } = await render(NewVersionNotification);

      ref.setInput('notification', { platform: 'ios', status: 'sending' });
      fixture.detectChanges();

      expect(fixture.componentInstance.isSending()).toBe(true);
      expect(fixture.componentInstance.statusKey()).toBe(
        'new-version-notification-sending',
      );
    });

    // A broadcast leaves nothing on the page to look at, so what it reached has
    // to be reported explicitly (issue #1194).
    it('reports how far a finished announcement reached', async () => {
      const { fixture, ref } = await render(NewVersionNotification);

      ref.setInput('notification', {
        platform: 'android',
        status: 'sent',
        result: { platform: 'android', tokenCount: 12, userCount: 7 },
      });
      fixture.detectChanges();

      expect(fixture.componentInstance.statusParams()).toEqual({
        platform: 'android',
        tokenCount: 12,
        userCount: 7,
      });
    });

    it('reports nothing before an announcement was triggered', async () => {
      const { fixture } = await render(NewVersionNotification);

      expect(fixture.componentInstance.statusKey()).toBeNull();
    });

    it('emits the store that was picked', async () => {
      const { fixture } = await render(NewVersionNotification);
      const emitSpy = jest.spyOn(
        fixture.componentInstance.sendNewVersionNotification,
        'emit',
      );

      fixture.nativeElement
        .querySelector('[data-testid="notify-ios"]')
        .dispatchEvent(new Event('click'));

      expect(emitSpy).toHaveBeenCalledWith('ios');
    });
  });

  describe(CollectionMigration.name, () => {
    it('renders whatever counts a finished run reported', async () => {
      const { fixture, ref } = await render(CollectionMigration, {
        migration: 'review-timestamps',
      });

      ref.setInput('state', {
        status: 'done',
        result: { processed: 3, filled: 2 },
      });
      fixture.detectChanges();

      expect(fixture.componentInstance.counts()).toEqual([
        { key: 'processed', value: 3 },
        { key: 'filled', value: 2 },
      ]);
    });

    it('disables the button while the run is in flight', async () => {
      const { fixture, ref } = await render(CollectionMigration, {
        migration: 'review-timestamps',
      });

      ref.setInput('state', { status: 'running' });
      fixture.detectChanges();

      expect(fixture.componentInstance.isRunning()).toBe(true);
      expect(
        fixture.nativeElement.querySelector('[data-testid="run-migration"]')
          .disabled,
      ).toBe(true);
    });

    /**
     * The menu id backfill, registered by issue #1099, adds no markup of its
     * own: it is this card given a different name and a different set of
     * counts. Asserting that here is what says the "a name, a runner and its
     * copy" contract still holds for the migration added after it was written.
     */
    it('renders a second migration from the same card', async () => {
      const { fixture, ref } = await render(CollectionMigration, {
        migration: 'menu-item-ids',
      });
      const run = jest.fn();

      fixture.componentInstance.run.subscribe(run);
      ref.setInput('state', {
        status: 'done',
        result: { processed: 4, updated: 2, categories: 3, items: 9 },
      });
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="collection-migration-menu-item-ids"]',
        ),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('[data-testid="migration-counts"]')
          .textContent,
      ).toContain('migration-count-categories: 3');

      fixture.nativeElement
        .querySelector('[data-testid="run-migration"]')
        .click();

      expect(run).toHaveBeenCalledWith('menu-item-ids');
    });
  });

  describe(BiteAddressBackfill.name, () => {
    it('lists only Bites whose address is not resolved', async () => {
      const { fixture, ref } = await render(BiteAddressBackfill);

      ref.setInput('bites', [
        bite({ id: 'needs-one', addressStatus: 'missing' }),
        bite({ id: 'already-done', addressStatus: 'resolved' }),
      ]);
      fixture.detectChanges();

      expect(
        fixture.componentInstance
          .bitesNeedingAddressBackfill()
          .map((entry) => entry.id),
      ).toEqual(['needs-one']);
    });
  });

  describe(RestaurantClustering.name, () => {
    it('says a Bite without a geohash is not ready to cluster', async () => {
      const { fixture } = await render(RestaurantClustering);

      expect(fixture.componentInstance.clusteringState(bite({}))).toBe(
        'restaurant-clustering-state-missing-geohash',
      );
      expect(
        fixture.componentInstance.clusteringState(bite({ geohash: 'u0qj' })),
      ).toBe('restaurant-clustering-state-ready');
    });
  });

  describe(ImageMigration.name, () => {
    it('lists Bites that still carry an inline image or none in Storage', async () => {
      const { fixture, ref } = await render(ImageMigration);

      ref.setInput('bites', [
        bite({ id: 'inline', image: 'data:image/png;base64,x' }),
        bite({ id: 'no-storage-path' }),
        bite({ id: 'migrated', imagePath: 'https://example.test/a.png' }),
      ]);
      fixture.detectChanges();

      expect(
        fixture.componentInstance
          .bitesNeedingMigration()
          .map((entry) => entry.id),
      ).toEqual(['inline', 'no-storage-path']);
    });
  });

  describe(GeohashMigration.name, () => {
    it('lists only Bites that are missing a geohash', async () => {
      const { fixture, ref } = await render(GeohashMigration);

      ref.setInput('bites', [
        bite({ id: 'missing' }),
        bite({ id: 'has-one', geohash: 'u0qj' }),
      ]);
      fixture.detectChanges();

      expect(
        fixture.componentInstance
          .bitesWithoutGeohash()
          .map((entry) => entry.id),
      ).toEqual(['missing']);
    });
  });
});
