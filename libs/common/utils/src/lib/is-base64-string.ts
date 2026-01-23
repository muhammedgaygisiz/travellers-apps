export const isBase64String = (photoUrl: string): boolean => {
  const base64Regex = /^data:image\/(png|jpeg|jpg|gif);base64,[A-Za-z0-9+/=]+$/;
  return base64Regex.test(photoUrl);
};
