import { key } from './key';
import { reducer } from './reducer';
import { selectAllItems } from './selectors';
import { loadItems, saveItem } from './actions';

const fromMostSearched = {
  key,
  reducer,
  selectAllItems,
  loadItems,
  saveItem,
};

export { fromMostSearched };
