export const toDate = (a: any) => (a.toDate ? a.toDate() : new Date(a));
