import type { Bite } from 'model';

/**
 * The address a Bite's photo is shown from - the Display Rule in
 * `Architecture - Storage`. `imagePath` is the download URL the storage
 * trigger writes once the upload has finished; `image` is what a Bite carried
 * before that field existed.
 */
export const biteImageSrc = (
  bite: Pick<Bite, 'imagePath' | 'image'> | undefined,
): string => bite?.imagePath || bite?.image || '';
