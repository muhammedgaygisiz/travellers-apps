import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { Bucketlist } from 'model';
import { EntityState } from '@ngrx/entity';
import { fromAuth } from 'ta-firestore';
import { BucketlistActions } from '../actions';

describe('Bucketlists Reducer', () => {
  describe('logoutSucceeded', () => {
    it('should remove all entities of the slice', () => {
      const INITIAL_STATE = {
        ids: ['id'],
        entities: {
          id: { id: 'id' } as any,
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
          id: { id: 'id' } as any,
        },
      } as EntityState<Bucketlist>;

      const loadedBucketlistsFromApiAction = BucketlistActions.loadedFromAPI({
        bucketlists: [{ id: 'id' }],
      });

      expect(reducer(INITIAL_STATE, loadedBucketlistsFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });
});
