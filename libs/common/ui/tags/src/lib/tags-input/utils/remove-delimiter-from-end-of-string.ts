import { DELIMITERS } from '../model/delimiters';

export const removeDelimiterFromEndOfString = (
  value: string | null | undefined
): string => {
  if (!value) return '';
  const endsWithDelimiter = DELIMITERS.some((delimiter) =>
    value.endsWith(delimiter)
  );
  if (!endsWithDelimiter) {
    return value;
  }
  return value.slice(0, -1);
};
