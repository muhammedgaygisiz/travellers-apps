import { login } from './actions';
import { key } from './key';
import { reducer } from './reducer';

const fromAuth = {
  key,
  reducer,
  login,
};

export { fromAuth };
