import { createEntityAdapter } from '@ngrx/entity';
import { MostSearchedItem } from '../api/most-searched-item.model';

export const adapter = createEntityAdapter<MostSearchedItem>();

export const initialState = adapter.getInitialState();
