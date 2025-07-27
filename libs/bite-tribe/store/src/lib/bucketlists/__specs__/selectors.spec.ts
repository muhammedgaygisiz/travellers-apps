import { TestScheduler } from 'rxjs/internal/testing/TestScheduler';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { bucketlists, selectedBucketlist } from '../selectors';
import { Bucketlist } from 'model';
import { bucketlistId } from '../../router/selectors';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const BUCKETLIST_MOCK = { id: 'id' } as Bucketlist;

describe('Bucketlists - selectors', () => {
  let scheduler: TestScheduler;
  let store: MockStore;

  describe('given a valid setup store', () => {
    beforeEach(() => {
      scheduler = new TestScheduler(assertDeepEqual);
      TestBed.configureTestingModule({
        providers: [
          provideMockStore({
            initialState: {
              bucketlists: {
                ids: ['id'],
                entities: { id: BUCKETLIST_MOCK },
              },
            },
          }),
        ],
      });

      store = TestBed.inject(MockStore);
    });

    it('should return bucketlists slice', () => {
      scheduler.run(({ expectObservable }) => {
        const result$ = store.select(bucketlists);

        const expected = 'a';
        const output = {
          a: [BUCKETLIST_MOCK],
        };

        expectObservable(result$).toBe(expected, output);
      });
    });

    describe('selectedBucketlist', () => {
      beforeEach(() => {
        store.overrideSelector(bucketlistId, 'id');
      });

      it('should return selected bucketlist', () => {
        scheduler.run(({ expectObservable }) => {
          const result$ = store.select(selectedBucketlist);

          const expected = 'a';
          const output = {
            a: BUCKETLIST_MOCK,
          };

          expectObservable(result$).toBe(expected, output);
        });
      });

      it('should return undefined for no selected bucketlist', () => {
        store.overrideSelector(bucketlistId, undefined);
        scheduler.run(({ expectObservable }) => {
          const result$ = store.select(selectedBucketlist);

          const expected = 'a';
          const output = {
            a: undefined,
          };

          expectObservable(result$).toBe(expected, output);
        });
      });
    });
  });
});
