import type { Bite } from 'model';

/**
 * The Bite fields that publish its photo. `setBiteImagePathOnUpload` writes
 * them once the image check has passed or refused the upload, and the
 * Firestore rules refuse a client write that sets or changes them (GitHub
 * issue #2139). `imageStatus` is in the list because only the trigger may
 * write `uploaded` or `refused`; the client's own `pending` and `failed`
 * go through `setImageStatus`.
 */
export const PUBLISHED_IMAGE_FIELDS = [
  'imagePath',
  'imageStatus',
  'imageRefusalCategory',
] as const;

type PublishedImageField = (typeof PUBLISHED_IMAGE_FIELDS)[number];

/**
 * A Bite write without the fields only the backend may write, so an edit that
 * sends the whole Bite back cannot overwrite what the trigger decided - a
 * stale `uploaded` over a `refused`, or the URL of a photo it deleted.
 */
export const withoutPublishedImageFields = <T extends Partial<Bite>>(
  data: T,
): Omit<T, PublishedImageField> => {
  const { imagePath, imageStatus, imageRefusalCategory, ...rest } = data;
  void imagePath;
  void imageStatus;
  void imageRefusalCategory;

  return rest;
};
