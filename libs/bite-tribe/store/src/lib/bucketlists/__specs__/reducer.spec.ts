import { reducer } from '../reducer';
import type { Bucketlist } from 'model';
import { EntityState } from '@ngrx/entity';
import { fromAuth } from 'ta-firestore';
import { BucketlistActions } from '../actions';

describe('Bucketlists Reducer', () => {
  describe('logoutSucceeded', () => {
    it('should remove all entities of the slice', () => {
      const INITIAL_STATE = {
        ids: ['id'],
        entities: {
          id: { id: 'id' } as unknown as Bucketlist,
        },
      } as EntityState<Bucketlist>;
      const NEW_STATE = { ids: [], entities: {} } as EntityState<Bucketlist>;

      const logoutSucceededAction = fromAuth.AuthActions.logoutSucceeded();

      expect(reducer(INITIAL_STATE, logoutSucceededAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedBucketlistsFromApi', () => {
    it('should add bucketlists loaded from api', () => {
      const INITIAL_STATE = {
        ids: [],
        entities: {},
      } as EntityState<Bucketlist>;
      const NEW_STATE = {
        ids: ['id'],
        entities: {
          id: { id: 'id' } as unknown as Bucketlist,
        },
      } as EntityState<Bucketlist>;

      const loadedBucketlistsFromApiAction = BucketlistActions.loadedFromAPI({
        bucketlists: [{ id: 'id' } as unknown as Bucketlist],
      });

      expect(reducer(INITIAL_STATE, loadedBucketlistsFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('setBiteTriedOutStatus', () => {
    const stateWith = (
      bucketlist: Partial<Bucketlist>,
    ): EntityState<Bucketlist> =>
      ({
        ids: ['list-1'],
        entities: {
          'list-1': { id: 'list-1', ...bucketlist } as Bucketlist,
        },
      }) as EntityState<Bucketlist>;

    it('should tick the bite off right away so the list does not wait for the remote write', () => {
      const state = reducer(
        stateWith({ biteIds: ['bite-1'] }),
        BucketlistActions.setBiteTriedOutStatus({
          bucketlistId: 'list-1',
          biteId: 'bite-1',
          checked: true,
        }),
      );

      expect(
        state.entities['list-1']?.triedOutBites?.map(({ biteId }) => biteId),
      ).toEqual(['bite-1']);
    });

    it('should untick the bite without touching the other tried out bites', () => {
      const state = reducer(
        stateWith({
          biteIds: ['bite-1', 'bite-2'],
          triedOutBites: [
            { biteId: 'bite-1', date: 'date-1', timestamp: 1 },
            { biteId: 'bite-2', date: 'date-2', timestamp: 2 },
          ],
        }),
        BucketlistActions.setBiteTriedOutStatus({
          bucketlistId: 'list-1',
          biteId: 'bite-1',
          checked: false,
        }),
      );

      expect(state.entities['list-1']?.triedOutBites).toEqual([
        { biteId: 'bite-2', date: 'date-2', timestamp: 2 },
      ]);
    });

    it('should not tick the same bite off twice', () => {
      const state = reducer(
        stateWith({
          biteIds: ['bite-1'],
          triedOutBites: [{ biteId: 'bite-1', date: 'date-1', timestamp: 1 }],
        }),
        BucketlistActions.setBiteTriedOutStatus({
          bucketlistId: 'list-1',
          biteId: 'bite-1',
          checked: true,
        }),
      );

      expect(state.entities['list-1']?.triedOutBites?.length).toBe(1);
    });

    it('should leave the state alone for an unknown bucket list', () => {
      const initialState = stateWith({ biteIds: ['bite-1'] });

      const state = reducer(
        initialState,
        BucketlistActions.setBiteTriedOutStatus({
          bucketlistId: 'missing-list',
          biteId: 'bite-1',
          checked: true,
        }),
      );

      expect(state).toEqual(initialState);
    });
  });
});
