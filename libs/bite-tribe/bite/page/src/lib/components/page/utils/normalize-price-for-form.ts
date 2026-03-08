export const normalizePriceForForm = (price: string): string => {
  try {
    return price.trim();
  } catch (error) {
    return price;
  }
};
