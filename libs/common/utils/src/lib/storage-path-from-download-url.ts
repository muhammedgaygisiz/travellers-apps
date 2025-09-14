export const storagePathFromDownloadUrl = (downloadUrl: string): string => {
  const m = downloadUrl.match(/\/o\/([^?]+)/);
  if (!m) throw new Error('Invalid Firebase Storage URL');

  return decodeURIComponent(m[1]); // decodes %2F → /
};
