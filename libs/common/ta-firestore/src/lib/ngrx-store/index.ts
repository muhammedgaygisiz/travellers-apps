import {
  confirmRegistrationErrorMessage,
  login,
  loginSucceeded,
  loginWithGoogleAccount,
  loginWithAppleAccount,
  logout,
  register,
  logoutSucceeded,
  loadedUser,
} from './actions';
import {
  selectIsAuthenticated,
  selectLoginFailed,
  selectRegistrationErrorCode,
  selectUser,
  selectUserId,
} from './selectors';

export const fromAuth = {
  selectRegistrationErrorCode,
  selectLoginFailed,
  register,
  confirmRegistrationErrorMessage,
  login,
  loginWithGoogleAccount,
  loginWithAppleAccount,
  selectIsAuthenticated,
  loginSucceeded,
  logout,
  logoutSucceeded,
  selectUserId,
  selectUser,
  loadedUser,
};
