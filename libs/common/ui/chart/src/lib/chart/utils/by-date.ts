import { toDate } from './to-date';
import { ChartData } from '../api/chart-data';

export const byDate = (a: ChartData, b: ChartData): number => {
  const firstDate = toDate(a.date);
  const secondDate = toDate(b.date);
  return firstDate - secondDate;
};
