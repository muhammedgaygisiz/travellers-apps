import { key } from './key';
import { reducer } from './reducer';
import { bites, isReloadingBites } from './selectors';
import { BiteActions } from './actions';

const fromBites = {
  key,
  reducer,
  bites,
  reloadBites: BiteActions.reloadBites,
  isReloadingBites,
};

export { fromBites };
