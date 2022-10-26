import {
  confirmRegistrationErrorMessage,
  login,
  logout,
  register,
} from './actions';
import { key } from './key';
import { reducer } from './reducer';
import {
  selectIsAuthenticated,
  selectLoginFailed,
  selectRegistrationErrorCode,
} from './selectors';

const fromAuth = {
  key,
  reducer,
  login,
  logout,
  register,
  confirmRegistrationErrorMessage,
  selectIsAuthenticated,
  selectLoginFailed,
  selectRegistrationErrorCode,
};

export { fromAuth };
