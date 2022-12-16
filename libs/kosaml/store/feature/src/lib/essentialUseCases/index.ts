import { key } from './key';
import { reducer } from './reducers';
import { selectSelectedEssentialUseCase } from './selectors';
import { selectEssentialUseScenario } from './actions';

const fromEssentialUseCases = {
  key,
  reducer,
  selectSelectedEssentialUseCase,
  selectEssentialUseScenario,
};

export { fromEssentialUseCases };
