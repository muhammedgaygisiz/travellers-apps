import { key } from './key';
import { reducer } from './reducer';
import { selectIsOnline } from './selectors';

const fromNetworkStatus = {
  key,
  reducer,
  selectIsOnline,
};

export { fromNetworkStatus };
