import memoize from 'memoizee';

const memoizedHasLength = memoize(
  (password: string, length: number): boolean => password.length >= length
);

const hasLength =
  (password: string, length: number): (() => boolean) =>
  () =>
    memoizedHasLength(password, length);

export default hasLength;
