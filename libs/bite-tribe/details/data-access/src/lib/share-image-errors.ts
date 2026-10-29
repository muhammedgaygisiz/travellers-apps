/**
 * Raised when this platform cannot hand an image file to a share sheet.
 *
 * Native builds always can. A browser can only through the Web Share API with
 * files, which desktop browsers mostly lack; there the composer offers Save
 * image alone, and this is raised only if Share image… is reached anyway.
 */
export class ShareImageUnavailableError extends Error {
  constructor() {
    super('This platform cannot share an image file.');

    this.name = 'ShareImageUnavailableError';
  }
}

/**
 * Raised when the app a share image was meant for could not take it: it is not
 * installed, or the OS would not open it (issue #1730). The menu hides a target
 * whose app is missing, so this means the app went away while the composer was
 * open, or refused the hand-off.
 */
export class ShareTargetUnavailableError extends Error {
  constructor() {
    super('The target app is not available.');

    this.name = 'ShareTargetUnavailableError';
  }
}

/**
 * Raised when the user has refused BiteTribe permission to add the image to
 * their photos, so they can be told where to change it rather than shown a
 * generic failure. Both native save plugins reject with `permission-denied`, and
 * so does the iOS Instagram Post hand-off, which saves the image first.
 */
export class SaveImageDeniedError extends Error {
  constructor() {
    super('Adding the image to the photo library is not allowed.');

    this.name = 'SaveImageDeniedError';
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
