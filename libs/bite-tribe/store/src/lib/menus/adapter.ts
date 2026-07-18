import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Menu } from 'model';

export const adapter = createEntityAdapter<Menu>();

export const initialState: EntityState<Menu> = adapter.getInitialState();
