export const toMetric = (distance: string | undefined): string => {
  if (!distance || distance === 'NaN') {
    return '-';
  }

  return `${distance} km`;
};
