import { key } from './key';
import { reducer } from './reducer';
import { bites } from './selectors';
import { saveEditingBite } from './actions';

const fromBites = {
  key,
  reducer,
  bites,
  saveEditingBite,
};

export { fromBites };
