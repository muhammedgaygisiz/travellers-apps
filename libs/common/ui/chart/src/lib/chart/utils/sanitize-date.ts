import { toDate } from './to-date';

export const sanitizeDate = (payment: any) => ({
  ...payment,
  date: toDate(payment.date),
  balance: 0,
});
