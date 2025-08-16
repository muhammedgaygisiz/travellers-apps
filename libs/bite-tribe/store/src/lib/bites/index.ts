import { key } from './key';
import { reducer } from './reducer';
import { bites, isReloadingBites } from './selectors';
import { reloadBites } from './actions';

const fromBites = {
  key,
  reducer,
  bites,
  reloadBites,
  isReloadingBites,
};

export { fromBites };
