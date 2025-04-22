import { toDate } from './to-date';

export const byDate = (a: { date: any }, b: { date: any }): number => {
  const firstDate = toDate(a.date);
  const secondDate = toDate(b.date);
  return firstDate.getTime() - secondDate.getTime();
};
