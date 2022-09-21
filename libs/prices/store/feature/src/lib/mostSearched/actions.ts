import { createAction, props } from '@ngrx/store';
import { MostSearchedItem } from '@travellers-apps/utils-common';

export const loadItems = createAction('[Home Page] Load Most Searched Items');

export const itemsLoaded = createAction(
  '[Most Searched API] Most Searched Items Loaded successfully',
  props<{ items: MostSearchedItem[] }>()
);
