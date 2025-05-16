import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Menu } from 'model';

export const adapter = createEntityAdapter<Menu>();

export const initialState: EntityState<any> = adapter.getInitialState();
