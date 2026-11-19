import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';

/** An object's creation time in ms, or `NaN` when it cannot be read. */
export const createdAtMs = (timeCreated: unknown): number =>
  typeof timeCreated === 'string' ? Date.parse(timeCreated) : NaN;

/**
 * Deletes the objects under `prefix` that are older than the one just
 * finalized, so a photo folder holds only the current photo. Shared by the
 * profile photo trigger (GitHub issue #1953) and the restaurant photo trigger
 * (#2126), so the two follow the same rule.
 *
 * Older only, never "every other one": two uploads finishing out of order must
 * not let the earlier one delete the later. A file whose age cannot be read is
 * kept, as a leftover costs storage while a wrong delete costs the photo.
 */
export const deleteReplacedObjects = async ({
  bucketName,
  prefix,
  objectPath,
  finalizedAt,
  caller,
}: {
  bucketName: string;
  prefix: string;
  objectPath: string;
  finalizedAt: number;
  /** Names the trigger in the log line of a delete that failed. */
  caller: string;
}): Promise<void> => {
  if (Number.isNaN(finalizedAt)) {
    return;
  }

  const bucket = getStorage().bucket(bucketName);
  const [files] = await bucket.getFiles({ prefix });

  const replaced = files.filter(
    (file) =>
      file.name !== objectPath &&
      createdAtMs(file.metadata?.timeCreated) < finalizedAt,
  );

  await Promise.all(
    replaced.map(async (file) => {
      try {
        await file.delete();
      } catch (error) {
        logger.warn(
          `${caller}: could not delete replaced photo ${file.name}`,
          error,
        );
      }
    }),
  );
};
