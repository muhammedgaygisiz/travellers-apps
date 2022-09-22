import { key } from './key';
import { reducer } from './reducer';
import { selectAllItems } from './selectors';
import { loadItems } from './actions';

const fromMostSearched = {
  key,
  reducer,
  selectAllItems,
  loadItems,
};

export { fromMostSearched };
