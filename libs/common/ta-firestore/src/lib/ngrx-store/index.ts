import {
  confirmRegistrationErrorMessage,
  login,
  loginSucceeded,
  loginWithGoogleAccount,
  loginWithAppleAccount,
  loginWithFacebookAccount,
  logout,
  register,
  logoutSucceeded,
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
  loginWithFacebookAccount,
  selectIsAuthenticated,
  loginSucceeded,
  logout,
  logoutSucceeded,
  selectUserId,
  selectUser,
};
