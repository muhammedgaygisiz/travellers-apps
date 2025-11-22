import { key } from './key';
import { reducer } from './reducer';
import { AppActions } from './actions';
import { isDarkTheme } from './selectors';

const fromApp = {
  key,
  reducer,
  AppActions,
  isDarkTheme,
};

export { fromApp };
