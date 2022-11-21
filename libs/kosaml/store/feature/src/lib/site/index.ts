import { key } from './key';
import { toggleProjectBar } from './actions';
import { reducer } from './reducers';
import { selectIsProjectBarOpen } from './selectors';

const fromSite = {
  key,
  reducer,
  toggleProjectBar,
  selectIsProjectBarOpen,
};

export { fromSite };
