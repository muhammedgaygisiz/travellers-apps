export const toDate = (date: string): string => {
  const EXPECTED_DATE_FORMAT = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
  if (!EXPECTED_DATE_FORMAT.test(date)) {
    throw new Error('Invalid date format. Expected format: dd.MM.yyyy');
  }

  const parts = date.split('.');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Months are zero-based
  const year = parseInt(parts[2], 10);

  const utcDate = new Date(Date.UTC(year, month, day));

  if (
    utcDate.getUTCDate() !== day ||
    utcDate.getUTCMonth() !== month ||
    utcDate.getUTCFullYear() !== year
  ) {
    throw new Error('Invalid date format. Expected format: dd.MM.yyyy');
  }

  return utcDate.toISOString();
};
