import {
  confirmRegistrationErrorMessage,
  login,
  loginSucceeded,
  loginWithGoogleAccount,
  logout,
  register,
} from './actions';
import {
  selectIsAuthenticated,
  selectLoginFailed,
  selectRegistrationErrorCode,
} from './selectors';

export const fromAuth = {
  selectRegistrationErrorCode,
  selectLoginFailed,
  register,
  confirmRegistrationErrorMessage,
  login,
  loginWithGoogleAccount,
  selectIsAuthenticated,
  loginSucceeded,
  logout,
};
