import { key } from './key';
import { reducer } from './reducer';
import { fetchGpsPosition } from './actions';
import { isDarkTheme } from './selectors';

const fromApp = {
  key,
  reducer,
  fetchGpsPosition,
  isDarkTheme,
};

export { fromApp };
