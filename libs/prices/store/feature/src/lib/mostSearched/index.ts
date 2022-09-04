import {key} from "./key";
import { MostSearchedItem } from "./model";
import {reducer} from "./reducer";
import {selectAllItems} from "./selectors";

const fromMostSearched = {
  key,
  reducer,
  selectAllItems
}

export {fromMostSearched, MostSearchedItem};
