import type { Geopoint } from './geopoint';

/**
 * What a Bite's author keeps about it and nobody else may read, stored at
 * `bites/{biteId}/authorPrivate/{userId}` (GitHub issue #1290).
 *
 * The Bite document is readable by every member, so nothing here may ever be
 * copied onto it.
 */
export interface BiteAuthorPrivate {
  userId: string;

  /**
   * The position read from the photo's EXIF when the Bite was posted, kept even
   * when the author chose another source. The photo is re-encoded before
   * upload, which strips its EXIF, so this is the only copy left.
   */
  photoPosition: Pick<Geopoint, 'latitude' | 'longitude'>;
}
