import { createEntityAdapter } from '@ngrx/entity';
import { MostSearchedItem } from '@travellers-apps/utils-common';

export const adapter = createEntityAdapter<MostSearchedItem>();

export const initialState = adapter.getInitialState();
