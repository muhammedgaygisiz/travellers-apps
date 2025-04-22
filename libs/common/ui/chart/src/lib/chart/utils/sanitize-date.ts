import { toDate } from 'utils';

export const sanitizeDate = (payment: any) => ({
  ...payment,
  date: toDate(payment.date),
  balance: 0,
});
