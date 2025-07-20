export const sortBitesByDistance = (bites: any[]): any[] => {
  return bites.sort((a, b) => {
    if (!a || !b) {
      return 1;
    }
    if (!a.distance && b.distance) {
      return 1;
    }
    if (a.distance && !b.distance) {
      return -1;
    }
    if (!a.distance && !b.distance) {
      return 1;
    }
    return +a.distance - +b.distance;
  });
};
