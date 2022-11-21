import { key } from './key';
import { reducer } from './reducers';
import { selectSelectedTaskScenario } from './selectors';
import { selectTaskScenario } from './actions';

const fromTaskScenarios = {
  key,
  reducer,
  selectSelectedTaskScenario,
  selectTaskScenario,
};

export { fromTaskScenarios };
