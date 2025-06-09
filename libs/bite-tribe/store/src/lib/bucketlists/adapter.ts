import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Bucketlist } from 'model';

export const adapter = createEntityAdapter<Bucketlist>();

export const initialState: EntityState<any> = adapter.getInitialState();
