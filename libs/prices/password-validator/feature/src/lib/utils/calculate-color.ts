import memoize from 'memoizee';

export type ClassName = '' | 'success' | 'danger';

const calculateColor = (isConditionFulFilled: boolean | null): ClassName => {
  console.log('#mo calculateColor with', isConditionFulFilled);
  if (isConditionFulFilled === null) {
    return '';
  }

  return isConditionFulFilled ? 'success' : 'danger';
};

export default memoize(calculateColor);
