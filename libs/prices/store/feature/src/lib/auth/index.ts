import { login, logout, register } from './actions';
import { key } from './key';
import { reducer } from './reducer';
import { selectIsAuthenticated, selectLoginFailed } from './selectors';

const fromAuth = {
  key,
  reducer,
  login,
  logout,
  register,
  selectIsAuthenticated,
  selectLoginFailed,
};

export { fromAuth };
