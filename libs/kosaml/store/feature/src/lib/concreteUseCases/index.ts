import { key } from './key';
import { reducer } from './reducers';
import { selectSelectedConcreteUseCase } from './selectors';
import { selectConcreteUseCase } from './actions';

const fromConcreteUseCases = {
  key,
  reducer,
  selectSelectedConcreteUseCase,
  selectConcreteUseCase,
};

export { fromConcreteUseCases };
