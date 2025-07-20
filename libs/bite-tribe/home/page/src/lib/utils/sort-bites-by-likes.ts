export const sortBitesByLikes = (bites: any[]): any[] => {
  return bites.sort((a, b) => {
    if (!a || !b || a.likes == null || b.likes == null) {
      return -1;
    }
    return b.likes.length - a.likes.length;
  });
};
