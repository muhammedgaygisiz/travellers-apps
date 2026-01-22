import type { PublicUser } from 'model';
import { isIdpAvatarUrl } from './is-idp-avatar-url';
import { uploadBlobToFirebasestorage } from '../bite-api/utils/upload-blob-to-firebasestorage';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { USERS_COLLECTION } from './user-collection-key';

const mirrorUserProfileImage = async (
  user: PublicUser,
  isWeb: boolean,
): Promise<PublicUser> => {
  const avatarUrl = user.photoUrl;

  const res = await fetch(avatarUrl, { cache: 'no-cache' });

  if (!res.ok) {
    return Promise.resolve(user);
  }

  const blob = await res.blob();
  const extension = avatarUrl.split('.').pop() || 'jpg';
  const contentType = blob.type || `image/${extension}`;
  const path = await uploadBlobToFirebasestorage(
    USERS_COLLECTION,
    user.userId,
    extension,
    blob,
    contentType,
    isWeb,
  );

  const getDownloadUrlResult = await FirebaseStorage.getDownloadUrl({ path });
  const photoUrl = getDownloadUrlResult.downloadUrl;

  return Promise.resolve({
    ...user,
    photoUrl,
  });
};

export const checkUserProfileImageAndMirrorToFirebase = (
  user: PublicUser,
  isWeb: boolean,
): Promise<PublicUser> => {
  if (!user.photoUrl) {
    return Promise.resolve(user);
  }

  if (isIdpAvatarUrl(user.photoUrl)) {
    return mirrorUserProfileImage(user, isWeb);
  }

  return Promise.resolve(user);
};
