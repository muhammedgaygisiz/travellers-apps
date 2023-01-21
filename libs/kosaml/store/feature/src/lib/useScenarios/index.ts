import { key } from './key';
import { reducer } from './reducers';
import { selectSelectedUseScenario } from './selectors';
import { selectUseScenario } from './actions';

const fromUseScenarios = {
  key,
  reducer,
  selectSelectedUseScenario,
  selectUseScenario,
};

export { fromUseScenarios };
