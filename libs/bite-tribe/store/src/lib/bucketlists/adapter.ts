import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Bucketlist } from 'model';

export const adapter = createEntityAdapter<Bucketlist>();

export const initialState: EntityState<Bucketlist> = adapter.getInitialState();
