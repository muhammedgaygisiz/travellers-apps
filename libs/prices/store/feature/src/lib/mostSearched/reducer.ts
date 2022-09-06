import {createReducer, on} from "@ngrx/store";
import {adapter, initialState} from "./adapter";
import {itemsLoaded} from "./actions";

export const reducer = createReducer(
  initialState,
  on(itemsLoaded, (state, { items }) => adapter.addMany(items, state))
)
