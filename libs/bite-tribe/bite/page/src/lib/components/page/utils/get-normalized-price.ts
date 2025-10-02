export const getNormalizedPrice = (
  price: string | null | undefined
): string => {
  if (!price) {
    return '';
  }

  return `${price}`.replace(',', '.');
};
