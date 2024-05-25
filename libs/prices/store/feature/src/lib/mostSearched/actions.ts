import { createAction, props } from '@ngrx/store';
import { MostSearchedItem } from '../api/most-searched-item.model';
import { Price } from '../api/price.model';

export const loadItems = createAction('[Home Page] Load Most Searched Items');

export const itemsLoaded = createAction(
  '[Most Searched API] Most Searched Items Loaded successfully',
  props<{ items: MostSearchedItem[] }>()
);

export const saveItem = createAction(
  '[Most Searched API] Save Item',
  props<{ item: Price }>()
);
