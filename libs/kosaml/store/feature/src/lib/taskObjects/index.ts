import { key } from './key';
import { reducer } from './reducers';
import { selectSelectedTaskObject } from './selectors';
import { selectTaskObject } from './actions';

const fromTaskObjects = {
  key,
  reducer,
  selectSelectedTaskObject,
  selectTaskObject,
};

export { fromTaskObjects };
