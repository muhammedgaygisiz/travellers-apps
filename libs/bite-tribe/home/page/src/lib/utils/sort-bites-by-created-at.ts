export const sortBitesByCreatedAt = (bites: any[]): any[] => {
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
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};
