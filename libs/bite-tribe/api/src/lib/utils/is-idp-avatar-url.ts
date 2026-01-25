export const isIdpAvatarUrl = (url: string): boolean => {
  if (!url) {
    return false;
  }

  try {
    const { hostname } = new URL(url);

    return (
      hostname === 'lh3.googleusercontent.com' ||
      hostname.endsWith('.googleusercontent.com') ||
      hostname === 'googleusercontent.com'
    );
  } catch (e) {
    return false;
  }
};
