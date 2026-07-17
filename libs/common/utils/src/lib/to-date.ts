type FirestoreTimestampLike = { toDate: () => Date };

export type DateLike = Date | string | number | FirestoreTimestampLike;

const isTimestampLike = (a: unknown): a is FirestoreTimestampLike =>
  typeof a === 'object' &&
  a !== null &&
  typeof (a as FirestoreTimestampLike).toDate === 'function';

export const toDate = (a: DateLike): Date =>
  isTimestampLike(a) ? a.toDate() : new Date(a);
