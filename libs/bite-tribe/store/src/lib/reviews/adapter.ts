import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Review } from 'model';

export const adapter = createEntityAdapter<Review>();

export const initialState: EntityState<any> = adapter.getInitialState();
