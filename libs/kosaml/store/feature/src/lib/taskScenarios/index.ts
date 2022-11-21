import { key } from './key';
import { reducer } from './reducers';
import { selectSelectedTaskScenario } from './selectors';

const fromTaskScenarios = {
  key,
  reducer,
  selectSelectedTaskScenario,
};

export { fromTaskScenarios };
