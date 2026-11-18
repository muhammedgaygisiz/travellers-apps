/**
 * The backend refused user-written text before publishing it (issue #1610):
 * a review, a reply, profile text or a Bite's name, tags or description.
 *
 * Thrown by the API layer so the page can tell the user what happened, which
 * a generic "could not be saved" would not. `field` names the field that
 * failed when the backend said, so a form could point at it.
 */
export class ContentRefusedError extends Error {
  constructor(readonly field?: string) {
    super('content_refused');
    this.name = 'ContentRefusedError';
  }
}

export const isContentRefused = (
  error: unknown,
): error is ContentRefusedError => error instanceof ContentRefusedError;
