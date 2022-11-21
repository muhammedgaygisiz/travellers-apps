import { key } from './key';
import { toggleProjectBar } from './actions';
import { reducer } from './reducers';
import { selectIsProjectBarOpen, selectProjectStructure } from './selectors';

const fromSite = {
  key,
  reducer,
  toggleProjectBar,
  selectIsProjectBarOpen,
  selectProjectStructure,
};

export { fromSite };
