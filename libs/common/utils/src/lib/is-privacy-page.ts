// Export for testing purposes
export const getHref = (): string => location.href;

export const isPrivacyPage = (): boolean => getHref().endsWith('/privacy');
