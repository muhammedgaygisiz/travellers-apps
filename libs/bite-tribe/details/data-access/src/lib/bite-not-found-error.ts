/**
 * Raised when the requested Bite document does not exist.
 *
 * Firestore answers a read for a deleted document with a successful snapshot
 * that simply carries no data, so without this the loader would hand the page a
 * Bite-shaped object holding nothing but an id and the page would render an
 * empty shell. Reachable from the gallery, the home feed and shared links.
 * See GitHub issue #1232.
 */
export class BiteNotFoundError extends Error {
  constructor(readonly biteId: string) {
    super(`Bite ${biteId} does not exist.`);

    this.name = 'BiteNotFoundError';
  }
}
