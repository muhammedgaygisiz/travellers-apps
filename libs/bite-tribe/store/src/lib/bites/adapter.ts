import { createEntityAdapter, EntityState } from '@ngrx/entity';

export const adapter = createEntityAdapter();

export const initialState: EntityState<any> = adapter.getInitialState();
