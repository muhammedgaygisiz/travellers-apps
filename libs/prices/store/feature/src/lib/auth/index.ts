import { login } from './actions';
import { key } from './key';
import { reducer } from './reducer';
import { selectIsAuthenticated } from './selectors';

const fromAuth = {
  key,
  reducer,
  login,
  selectIsAuthenticated,
};

export { fromAuth };
