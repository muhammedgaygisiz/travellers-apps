import type { Bite } from 'model';

export const sortBitesByCreatedAt = (bites: Bite[]): Bite[] => {
  return bites.sort((a, b) => {
    if (!a || !b) {
      return 1;
    }
    if (!a.createdAt && b.createdAt) {
      return 1;
    }
    if (a.createdAt && !b.createdAt) {
      return -1;
    }
    if (!a.createdAt && !b.createdAt) {
      return 1;
    }
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });
};
