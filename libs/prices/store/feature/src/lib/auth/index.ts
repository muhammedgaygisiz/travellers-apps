import {
  confirmRegistrationErrorMessage,
  login,
  logout,
  register,
  loginWithGoogleAccount,
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
  loginWithGoogleAccount,
  confirmRegistrationErrorMessage,
  selectIsAuthenticated,
  selectLoginFailed,
  selectRegistrationErrorCode,
};

export { fromAuth };
