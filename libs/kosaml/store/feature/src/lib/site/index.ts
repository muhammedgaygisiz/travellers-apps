import { key } from './key';
import { toggleProjectBar } from './actions';
import { reducer } from './reducers';
import { selectProjectStructure } from './selectors';

const fromSite = {
  key,
  reducer,
  toggleProjectBar,
  selectProjectStructure,
};

export { fromSite };
