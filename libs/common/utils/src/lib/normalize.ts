export const normalize = (str: string): string =>
  str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s!@]/g, '') // remove punctuation except ! and @
    .replace(/\s+/g, ' '); // replace multiple spaces with single space
