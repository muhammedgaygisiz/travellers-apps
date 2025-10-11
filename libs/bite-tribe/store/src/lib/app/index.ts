import { key } from './key';
import { reducer } from './reducer';
import { AppActions } from './actions';
import { isDarkTheme } from './selectors';

const fromApp = {
  key,
  reducer,
  fetchGpsPosition: AppActions.fetchGPSPosition,
  isDarkTheme,
};

export { fromApp };
