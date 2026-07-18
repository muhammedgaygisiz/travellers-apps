import { Bite } from 'model';
import { normalize } from 'utils';

export const uniqueBitesByName = <T extends Pick<Bite, 'name'>>(
  bites: T[],
): T[] => {
  const seenNames = new Map<string, boolean>();

  return [...bites].filter((bite) => {
    const normalizedName = normalize(bite.name);

    if (seenNames.get(normalizedName)) {
      return false;
    }
    seenNames.set(normalizedName, true);
    return true;
  });
};
