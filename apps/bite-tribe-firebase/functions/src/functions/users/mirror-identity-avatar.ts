import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { MAX_CHECKED_IMAGE_BYTES } from '../shared/moderation/check-image';
import { IDENTITY_AVATARS_COLLECTION } from './new-user-profile';

/** How long the provider may take to hand over the avatar. */
export const IDENTITY_AVATAR_FETCH_TIMEOUT_MS = 10_000;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Whether a URL is an avatar this function fetches: HTTPS, on Google's avatar
 * host. The URL comes from the Auth record, and an account can set its own
 * `photoURL` there, so anything else would let a member point this function
 * at an address of their choosing. Apple and email accounts carry no avatar,
 * so this costs no account a photo it would otherwise have had.
 */
export const isMirroredAvatarUrl = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);

    return (
      protocol === 'https:' &&
      (hostname === 'googleusercontent.com' ||
        hostname.endsWith('.googleusercontent.com'))
    );
  } catch {
    return false;
  }
};

/**
 * Copies a new account's identity-provider avatar into its photo folder, so
 * `setUserPhotoUrlOnUpload` checks it before it is published (GitHub issue
 * #2140).
 *
 * Nothing is written to the profile here. The upload finalizes, the finalize
 * trigger runs the image check, and only a passed avatar becomes `photoUrl`; a
 * refused one is deleted and the account keeps no photo. An avatar that cannot
 * be fetched is dropped the same way: the account starts with the placeholder
 * and the member can choose a photo. The queued entry is removed either way.
 */
export const mirrorIdentityAvatar = async (
  uid: string,
  sourceUrl: string,
): Promise<void> => {
  if (!isMirroredAvatarUrl(sourceUrl)) {
    logger.warn(
      `mirrorIdentityAvatar: avatar of user ${uid} is not on a known provider host`,
    );
    return;
  }

  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(IDENTITY_AVATAR_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    logger.warn(
      `mirrorIdentityAvatar: avatar of user ${uid} answered ${response.status}`,
    );
    return;
  }

  const contentType = (response.headers.get('content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType];

  if (!extension) {
    logger.warn(
      `mirrorIdentityAvatar: avatar of user ${uid} is not an image (${contentType})`,
    );
    return;
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.length === 0 || bytes.length > MAX_CHECKED_IMAGE_BYTES) {
    logger.warn(
      `mirrorIdentityAvatar: avatar of user ${uid} has ${bytes.length} bytes`,
    );
    return;
  }

  await getStorage()
    .bucket()
    .file(`images/users/${uid}/identity-avatar-${Date.now()}.${extension}`)
    .save(bytes, {
      contentType,
      metadata: {
        // The token the client SDK would add, so the finalize trigger can
        // build the same download URL an app upload gets.
        metadata: { firebaseStorageDownloadTokens: randomUUID() },
      },
    });

  logger.info(`mirrorIdentityAvatar: avatar of user ${uid} queued for check`);
};

/**
 * Takes each avatar `writeNewUserProfile` queued, mirrors it, and removes the
 * entry. A failure is logged and the entry still removed: a missing avatar is
 * the placeholder, never a broken profile.
 */
export const mirrorIdentityAvatarOnCreate = onDocumentCreated(
  `${IDENTITY_AVATARS_COLLECTION}/{uid}`,
  async (event) => {
    const uid = event.params.uid;
    const sourceUrl = String(event.data?.data()?.['sourceUrl'] ?? '');

    try {
      await mirrorIdentityAvatar(uid, sourceUrl);
    } catch (error) {
      logger.warn(`mirrorIdentityAvatar: could not mirror user ${uid}`, error);
    } finally {
      await getFirestore()
        .collection(IDENTITY_AVATARS_COLLECTION)
        .doc(uid)
        .delete();
    }
  },
);
