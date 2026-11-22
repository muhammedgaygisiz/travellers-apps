/**
 * What the image check decided about a restaurant or Bite Trail photo, as its
 * finalize trigger wrote it onto the document (GitHub issue #2141).
 *
 * `uploaded` carries the published photo; `refused` carries why, and the
 * document kept the photo it had.
 */
export type FolderPhotoVerdict =
  | { imageStatus: 'uploaded'; imagePath: string }
  | { imageStatus: 'refused'; imageRefusalCategory?: string };
