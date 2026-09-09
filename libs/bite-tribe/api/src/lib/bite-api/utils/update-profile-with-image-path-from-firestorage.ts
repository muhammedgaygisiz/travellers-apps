import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { PublicUser } from 'model';
import { getDownloadUrlFromFirebaseStorage } from 'utils';
import { USERS_COLLECTION } from '../../utils/user-collection-key';

/**
 * Points the profile at the image that was just uploaded to Storage.
 *
 * It writes the user-owned profile fields and nothing else. It used to spread
 * the whole `PublicUser` back into the document, which meant every backend-owned
 * field - `biteCount`, `subscriptionTier`, the follow counts, the
 * email-verification state - was rewritten from whatever the client happened to
 * have read earlier. That was harmless while any signed-in account could write
 * any field, and it is not harmless now: the ownership-scoped rules refuse a
 * write that *changes* a backend-owned field, so a count that moved between the
 * read and this save would have failed a profile-image change with a permission
 * error (GitHub issue #1078).
 *
 * The field list is the same one an ordinary profile edit writes, for the same
 * reason: the rest of a `PublicUser` is server-owned or written elsewhere, so a
 * client write has no business carrying it.
 */
export const updateProfileWithImagePathFromFirebaseStorage = async (
  photoUrl: string,
  profileWithoutPhotoUrl: Omit<PublicUser, 'photoUrl'> | undefined,
  userId: string,
): Promise<PublicUser> => {
  const downloadUrl = await getDownloadUrlFromFirebaseStorage(photoUrl);

  const data: Partial<PublicUser> & Pick<PublicUser, 'photoUrl'> = {
    displayName: profileWithoutPhotoUrl?.displayName || '',
    fullName: profileWithoutPhotoUrl?.fullName || '',
    email: profileWithoutPhotoUrl?.email || '',
    city: profileWithoutPhotoUrl?.city || '',
    about: profileWithoutPhotoUrl?.about || '',
    public: profileWithoutPhotoUrl?.public || false,
    photoUrl: downloadUrl as string,
    updatedAt: new Date().toISOString(),
    updatedAtTimestamp: Date.now(),
  };

  await FirebaseFirestore.updateDocument({
    reference: `${USERS_COLLECTION}/${userId}`,
    data,
  });

  return { ...(profileWithoutPhotoUrl ?? {}), ...data } as PublicUser;
};
