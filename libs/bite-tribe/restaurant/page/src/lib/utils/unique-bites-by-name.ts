import { Bite } from 'model';

export const uniqueBitesByName = (bites: Bite[]): Bite[] => {
  const seenNames = new Map<string, boolean>();
  return [...bites].filter((bite) => {
    if (seenNames.get(bite.name)) {
      return false;
    }
    seenNames.set(bite.name, true);
    return true;
  });
};
