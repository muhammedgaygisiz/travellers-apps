import { TestBed } from '@angular/core/testing';
import { Action, Store, StoreModule } from '@ngrx/store';
import type { Bucketlist } from 'model';
import { BucketlistActions } from '../actions';
import { key } from '../key';
import { reducer } from '../reducer';
import { selectedBucketlist } from '../selectors';

/**
 * Covers the path the Bucket List detail view reads: toggling a Bite's
 * tried-out status has to move `selectedBucketlist` on the spot, without a
 * reload and without leaving the page.
 *
 * The router slice is stubbed in the shape `@ngrx/router-store` serializes, so
 * `bucketlistId` resolves the same way it does on `/my-bucketlists/:id`.
 */
describe('tried-out status through the real store', () => {
  const BUCKETLIST: Bucketlist = {
    id: 'list-1',
    userId: 'user-1',
    name: 'Weekend plans',
    biteIds: ['bite-1', 'bite-2'],
  };

  const routerStateOnBucketlist = (): unknown => ({
    state: { root: { params: { bucketlistId: 'list-1' }, firstChild: null } },
    navigationId: 1,
  });

  let store: Store;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forRoot({
          [key]: reducer,
          router: routerStateOnBucketlist,
        }),
      ],
    });

    store = TestBed.inject(Store);
    store.dispatch(
      BucketlistActions.loadedFromAPI({ bucketlists: [BUCKETLIST] }),
    );
  });

  const triedOutBiteIdsOf = (bucketlist: Bucketlist | undefined): string[] =>
    bucketlist?.triedOutBites?.map(({ biteId }) => biteId) ?? [];

  /** Mirrors how the page consumes the selector: one long-lived subscription. */
  const watchSelectedBucketlist = (): {
    latest: () => Bucketlist | undefined;
    emissions: () => number;
    stop: () => void;
  } => {
    let latest: Bucketlist | undefined;
    let emissions = 0;

    const subscription = store.select(selectedBucketlist).subscribe((value) => {
      latest = value;
      emissions++;
    });

    return {
      latest: () => latest,
      emissions: () => emissions,
      stop: () => subscription.unsubscribe(),
    };
  };

  const toggle = (biteId: string, checked: boolean): Action =>
    BucketlistActions.setBiteTriedOutStatus({
      bucketlistId: 'list-1',
      biteId,
      checked,
    });

  it('resolves the bucket list of the current route', () => {
    const watcher = watchSelectedBucketlist();

    expect(watcher.latest()?.id).toBe('list-1');

    watcher.stop();
  });

  it('pushes a ticked bite to an open subscription without a reload', () => {
    const watcher = watchSelectedBucketlist();

    store.dispatch(toggle('bite-1', true));

    expect(triedOutBiteIdsOf(watcher.latest())).toEqual(['bite-1']);
    expect(watcher.emissions()).toBe(2);

    watcher.stop();
  });

  it('pushes an unticked bite to an open subscription without a reload', () => {
    const watcher = watchSelectedBucketlist();

    store.dispatch(toggle('bite-1', true));
    store.dispatch(toggle('bite-1', false));

    expect(triedOutBiteIdsOf(watcher.latest())).toEqual([]);
    expect(watcher.emissions()).toBe(3);

    watcher.stop();
  });

  it('keeps the other ticked bites when one is unticked', () => {
    const watcher = watchSelectedBucketlist();

    store.dispatch(toggle('bite-1', true));
    store.dispatch(toggle('bite-2', true));
    store.dispatch(toggle('bite-1', false));

    expect(triedOutBiteIdsOf(watcher.latest())).toEqual(['bite-2']);

    watcher.stop();
  });
});
