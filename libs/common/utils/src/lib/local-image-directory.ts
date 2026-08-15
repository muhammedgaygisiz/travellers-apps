import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const IMAGE_FILE_PATTERN = /\.(gif|heic|heif|jpe?g|png|webp)$/i;

let preparedUid: string | undefined;
let preparing: Promise<void> | undefined;

const currentUid = async (): Promise<string | undefined> => {
  try {
    const { user } = await FirebaseAuthentication.getCurrentUser();

    return user?.uid;
  } catch (error) {
    console.error('Error reading the owner of the local images:', error);

    return undefined;
  }
};

const ensureDirectory = async (uid: string): Promise<void> => {
  try {
    await Filesystem.mkdir({
      path: uid,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch {
    // Already there, which is the normal case after the first write.
  }
};

/**
 * Clears out the flat `Documents` root that predates the per-user directories.
 *
 * Files written before this change carry no owner. On a device the signed-in
 * user is the only plausible one, so they are moved into their directory and
 * the local gallery survives the upgrade. In a browser the previous user is
 * exactly who they may belong to - that is the bug - so they are deleted
 * instead: losing one user's local cache once is the cheaper mistake.
 *
 * Best effort per file. A single failure must not stop the rest, and must not
 * stop the caller from reading or writing its own directory either.
 */
const reconcileLegacyImages = async (uid: string): Promise<void> => {
  let legacyImages;

  try {
    const { files } = await Filesystem.readdir({
      path: '',
      directory: Directory.Documents,
    });

    legacyImages = files.filter(
      (file) => file.type === 'file' && IMAGE_FILE_PATTERN.test(file.name),
    );
  } catch (error) {
    console.error('Error reading the legacy local image directory:', error);

    return;
  }

  const adopt = Capacitor.isNativePlatform();

  for (const { name } of legacyImages) {
    try {
      if (adopt) {
        await Filesystem.rename({
          from: name,
          to: `${uid}/${name}`,
          directory: Directory.Documents,
        });
      } else {
        await Filesystem.deleteFile({
          path: name,
          directory: Directory.Documents,
        });
      }
    } catch (error) {
      console.error(`Error reconciling the legacy local image ${name}:`, error);
    }
  }
};

const prepare = async (uid: string): Promise<void> => {
  await ensureDirectory(uid);
  await reconcileLegacyImages(uid);
};

/**
 * The directory under `Documents` that holds the signed-in user's local image
 * copies, or `undefined` when nobody is signed in.
 *
 * Those copies used to sit in `Documents` itself, which is scoped to the device
 * rather than to the account. On a phone that is defensible - one owner, one
 * app container. In a browser the Capacitor filesystem is IndexedDB keyed to
 * the origin, so every account signing in through the same browser profile read
 * the same directory: the gallery showed a brand-new user their predecessor's
 * photos and, through the file names, which Bites that predecessor had created.
 * See GitHub issue #1328.
 *
 * Naming the directory after the uid scopes reads by construction. A second
 * account reads its own, empty directory whether or not the first one ever
 * logged out, which a "clear on logout" would depend on. Everything that
 * writes, lists, reads back or deletes a local image copy goes through here.
 *
 * The directory is created and the pre-existing flat files are reconciled once
 * per signed-in user, on the first call. Both are best effort: a device that
 * refuses either still has to be able to show an empty gallery.
 */
export const localImageDirectory = async (): Promise<string | undefined> => {
  const uid = await currentUid();

  if (!uid) {
    return undefined;
  }

  if (preparedUid !== uid) {
    preparedUid = uid;
    preparing = prepare(uid);
  }

  await preparing;

  return uid;
};

/**
 * Where a local image copy with `fileName` belongs, relative to `Documents`, or
 * `undefined` when nobody is signed in to own it.
 */
export const localImagePath = async (
  fileName: string,
): Promise<string | undefined> => {
  const directory = await localImageDirectory();

  return directory ? `${directory}/${fileName}` : undefined;
};

/** Forgets which user the directory was last prepared for. */
export const resetLocalImageDirectoryForTesting = (): void => {
  preparedUid = undefined;
  preparing = undefined;
};
