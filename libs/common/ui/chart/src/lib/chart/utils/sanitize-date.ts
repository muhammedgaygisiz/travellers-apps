import { toDate } from 'utils';
import { ChartData } from '../api/chart-data';

export const sanitizeDate = (payment: ChartData): ChartData => ({
  ...payment,
  date: toDate(payment.date),
  balance: 0,
});
