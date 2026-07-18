export const normalizePriceForForm = (price: string): string => {
  try {
    return price.trim();
  } catch {
    return price;
  }
};
