import {createEntityAdapter} from "@ngrx/entity";
import { MostSearchedItem } from "./model";

export const adapter = createEntityAdapter<MostSearchedItem>();

// TODO: Switch back to adapter.getInitialState and remove this construct when moved further to effects
export const initialState = adapter.getInitialState();
