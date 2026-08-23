import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const IMAGE_FILE_PATTERN = /\.(gif|heic|heif|jpe?g|png|webp)$/i;

/**
 * The Capacitor directory that holds the local image copies.
 *
 * App-private storage, not the public `Documents` folder these copies used to
 * sit in. Capacitor maps `Documents` to Android's
 * `Environment.getExternalStoragePublicDirectory`, and writing there needs
 * `WRITE_EXTERNAL_STORAGE` on API 29 and below - a permission this app does not
 * declare, cannot be granted, and should not have to ask for. On a phone that
 * old every write was denied, and because the native Storage upload reads its
 * `uri` from this copy, the denial took the entire Bite save down with it: the
 * photo never left the device and nothing said so. `Data` needs no permission on
 * any Android version. See GitHub issue #1229.
 */
export const LOCAL_IMAGE_DIRECTORY = Directory.Data;

/** Where those copies used to live, kept only to migrate them out. */
const LEGACY_IMAGE_DIRECTORY = Directory.Documents;

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
      directory: LOCAL_IMAGE_DIRECTORY,
      recursive: true,
    });
  } catch {
    // Already there, which is the normal case after the first write.
  }
};

/** Image files directly under `path` in the directory copies used to live in. */
const legacyImageNames = async (path: string): Promise<string[]> => {
  try {
    const { files } = await Filesystem.readdir({
      path,
      directory: LEGACY_IMAGE_DIRECTORY,
    });

    return files
      .filter(
        (file) => file.type === 'file' && IMAGE_FILE_PATTERN.test(file.name),
      )
      .map((file) => file.name);
  } catch {
    // Nothing left to migrate, which is the normal case - and on the very
    // devices this move is for, the old public folder cannot be read at all.
    return [];
  }
};

/** Best effort per file: one failure must not stop the rest of the migration. */
const migrateLegacyImage = async (
  from: string,
  to: string,
  adopt: boolean,
): Promise<void> => {
  try {
    if (adopt) {
      await Filesystem.rename({
        from,
        to,
        directory: LEGACY_IMAGE_DIRECTORY,
        toDirectory: LOCAL_IMAGE_DIRECTORY,
      });
    } else {
      await Filesystem.deleteFile({
        path: from,
        directory: LEGACY_IMAGE_DIRECTORY,
      });
    }
  } catch (error) {
    console.error(`Error migrating the legacy local image ${from}:`, error);
  }
};

/**
 * Moves local copies left behind in the public `Documents` folder into the
 * private directory {@link LOCAL_IMAGE_DIRECTORY} names.
 *
 * Two layouts predate it. Files sitting directly under `Documents` carry no
 * owner: on a device the signed-in user is the only plausible one, so they are
 * adopted, while in a browser the previous user is exactly who they may belong
 * to - that is the bug in GitHub issue #1328 - so they are dropped instead.
 * Files already under `Documents/<uid>` are owned and simply move across.
 *
 * Best effort throughout, and must stay that way: a device that refuses every
 * part of this still has to be able to read and write its own directory.
 */
const migrateLegacyImages = async (uid: string): Promise<void> => {
  const adopt = Capacitor.isNativePlatform();

  for (const name of await legacyImageNames('')) {
    await migrateLegacyImage(name, `${uid}/${name}`, adopt);
  }

  for (const name of await legacyImageNames(uid)) {
    await migrateLegacyImage(`${uid}/${name}`, `${uid}/${name}`, true);
  }
};

const prepare = async (uid: string): Promise<void> => {
  await ensureDirectory(uid);
  await migrateLegacyImages(uid);
};

/**
 * The directory under {@link LOCAL_IMAGE_DIRECTORY} that holds the signed-in
 * user's local image copies, or `undefined` when nobody is signed in.
 *
 * Those copies used to sit in the storage root itself, which is scoped to the
 * device rather than to the account. On a phone that is defensible - one owner,
 * one app container. In a browser the Capacitor filesystem is IndexedDB keyed to
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
 * The directory is created and any pre-existing copies are migrated once per
 * signed-in user, on the first call. Both are best effort: a device that refuses
 * either still has to be able to show an empty gallery.
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
 * Where a local image copy with `fileName` belongs, relative to
 * {@link LOCAL_IMAGE_DIRECTORY}, or `undefined` when nobody is signed in to own
 * it.
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
