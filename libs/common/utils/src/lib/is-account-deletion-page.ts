// Export for testing purposes
export const getHref = (): string => location.href;

export const isAccountDeletionPage = (): boolean =>
  getHref().endsWith('/account-deletion');
