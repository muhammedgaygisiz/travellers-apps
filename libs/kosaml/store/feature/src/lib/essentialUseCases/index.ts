import { key } from './key';
import { reducer } from './reducers';
import { selectSelectedEssentialUseCase } from './selectors';
import { selectEssentialUseCase } from './actions';

const fromEssentialUseCases = {
  key,
  reducer,
  selectSelectedEssentialUseCase,
  selectEssentialUseCase,
};

export { fromEssentialUseCases };
