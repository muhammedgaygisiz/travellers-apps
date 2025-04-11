import { formatDate } from '@angular/common';

export const toDateString = (date: any) => {
  if (date === null || date === undefined) {
    return '';
  }

  const hasToDateFunction = typeof date.toDate === 'function';
  const isDate = date instanceof Date;
  if (!isDate && !hasToDateFunction) {
    return '';
  }

  const format = (d: any) => formatDate(d, 'dd.MM.yyyy', 'en-US');

  if (date?.toDate) {
    return format(date?.toDate());
  }

  if (date) {
    return format(date);
  }

  return '';
};
