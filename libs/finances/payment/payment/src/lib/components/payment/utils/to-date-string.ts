import { formatDate } from '@angular/common';

export const toDateString = (date: any) => {
  const format = (d: any) => formatDate(d, 'dd.MM.yyyy', 'en-US');

  if (date?.toDate) {
    return format(date?.toDate());
  }

  if (date) {
    return format(date);
  }

  return '';
};
