import { toDate } from 'utils';

export const sanitizeDate = (payment: any): any => ({
  ...payment,
  date: toDate(payment.date),
  balance: 0,
});
