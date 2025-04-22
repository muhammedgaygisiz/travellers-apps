export const toDate = (a: any): Date => (a.toDate ? a.toDate() : new Date(a));
