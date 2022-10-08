import memoize from 'memoizee';
export type IconName = 'checkmark-outline' | 'close-outline';

const calculateIcon = (conditionFulfilled: boolean | null): IconName =>
  conditionFulfilled ? 'checkmark-outline' : 'close-outline';

export default memoize(calculateIcon);
