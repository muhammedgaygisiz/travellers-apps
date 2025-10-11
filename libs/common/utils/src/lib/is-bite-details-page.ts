// Export for testing purposes
export const getHref = (): string => location.href;

export const isBiteDetailsPage = (): boolean =>
  getHref().includes('/bite/') && !getHref().includes('/edit');
