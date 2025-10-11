import { AuthActions } from './actions';
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
  selectIsAuthenticated,
  selectUserId,
  selectUser,
  AuthActions,
};
