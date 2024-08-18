import { key } from './key';
import { reducer } from './reducer';
import { banksWithAccounts } from './selectors';

const fromBank = {
  key,
  reducer,
  banksWithAccounts,
};

export { fromBank };
