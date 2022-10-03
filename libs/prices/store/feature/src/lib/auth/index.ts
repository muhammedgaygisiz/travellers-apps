import { login, logout } from './actions';
import { key } from './key';
import { reducer } from './reducer';
import { selectIsAuthenticated } from './selectors';

const fromAuth = {
  key,
  reducer,
  login,
  logout,
  selectIsAuthenticated,
};

export { fromAuth };
