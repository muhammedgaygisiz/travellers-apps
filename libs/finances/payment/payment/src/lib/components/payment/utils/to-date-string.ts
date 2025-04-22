import { formatDate } from '@angular/common';

export const toDateString = (date: any) => {
  if (date === null || date === undefined) {
    return '';
  }

  const format = (d: any) => formatDate(d, 'dd.MM.yyyy', 'en-US');

  const isDate = date instanceof Date;
  if (isDate) {
    return format(date);
  }

  const hasToDateFunction = typeof date.toDate === 'function';
  const isString = typeof date === 'string';
  if (isString && date) {
    try {
      return format(date);
    } catch (error) {
      console.error('Error formatting date string:', error);
      return '';
    }
  }

  if (!isDate && !hasToDateFunction) {
    return '';
  }

  if (date?.toDate) {
    return format(date?.toDate());
  }

  return '';
};
