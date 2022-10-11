import { login, logout } from './actions';
import { key } from './key';
import { reducer } from './reducer';
import { selectIsAuthenticated, selectLoginFailed } from './selectors';

const fromAuth = {
  key,
  reducer,
  login,
  logout,
  selectIsAuthenticated,
  selectLoginFailed,
};

export { fromAuth };
