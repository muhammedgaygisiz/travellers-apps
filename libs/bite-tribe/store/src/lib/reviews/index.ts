import { key } from './key';
import { reducer } from './reducer';
import { reviewThreads, reviews } from './selectors';

const fromReviews = {
  key,
  reducer,
  reviews,
  reviewThreads,
};

export { fromReviews };
