import { AuthActions } from './actions';
import {
  selectIsAuthenticated,
  selectLoginFailed,
  selectLoginPending,
  selectRegistrationErrorCode,
  selectUser,
  selectUserId,
} from './selectors';

export const fromAuth = {
  selectRegistrationErrorCode,
  selectLoginFailed,
  selectLoginPending,
  selectIsAuthenticated,
  selectUserId,
  selectUser,
  AuthActions,
};
