import { DELIMITERS } from '../model/delimiters';

export const stringIncludesDelimiter = (
  value: string | null | undefined
): boolean => {
  if (!value) return false;
  return DELIMITERS.some((delimiter) => value.includes(delimiter));
};
