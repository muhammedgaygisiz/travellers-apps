import { key } from './key';
import { reducer } from './reducer';
import { payments } from './selectors';

const fromPayments = {
  key,
  reducer,
  payments,
};

export { fromPayments };
