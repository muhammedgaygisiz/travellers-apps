import {
  isShareCancelled,
  ShareImageUnavailableError,
} from '../share-image-errors';

describe(isShareCancelled.name, () => {
  it("treats the Share plugin's cancellation as a choice", () => {
    expect(isShareCancelled(new Error('Share canceled'))).toBe(true);
  });

  it('treats the Web Share API abort as a choice', () => {
    expect(
      isShareCancelled(new DOMException('Share aborted', 'AbortError')),
    ).toBe(true);
  });

  it('reports any other failure', () => {
    expect(isShareCancelled(new Error('disk full'))).toBe(false);
    expect(isShareCancelled(new ShareImageUnavailableError())).toBe(false);
    expect(isShareCancelled('Share canceled')).toBe(false);
  });
});
