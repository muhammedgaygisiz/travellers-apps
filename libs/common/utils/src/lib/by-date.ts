import { DateLike, toDate } from './to-date';

export const byDate = (
  a: { date: DateLike },
  b: { date: DateLike },
): number => {
  const firstDate = toDate(a.date);
  const secondDate = toDate(b.date);
  return firstDate.getTime() - secondDate.getTime();
};
