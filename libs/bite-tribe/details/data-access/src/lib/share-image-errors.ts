/**
 * Raised when this platform cannot hand an image file to a share sheet.
 *
 * Native builds always can. A browser can only through the Web Share API with
 * files, which desktop browsers mostly lack; saving the image instead is
 * issue #1732.
 */
export class ShareImageUnavailableError extends Error {
  constructor() {
    super('This platform cannot share an image file.');

    this.name = 'ShareImageUnavailableError';
  }
}

/**
 * Whether a share failed only because the user closed the share sheet. That is
 * a choice, not an error, and is not reported. Capacitor's Share plugin rejects
 * with "Share canceled"; the Web Share API rejects with an `AbortError`.
 */
export const isShareCancelled = (error: unknown): boolean =>
  (error instanceof Error &&
    (error.name === 'AbortError' || /cancel/i.test(error.message))) ||
  (error instanceof DOMException && error.name === 'AbortError');
