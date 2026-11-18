import {
  ContentRefusedError,
  isContentRefused,
} from '../content-refused-error';

describe(ContentRefusedError.name, () => {
  it('carries the refused field and is told apart from other errors', () => {
    const refusal = new ContentRefusedError('about');

    expect(refusal.field).toBe('about');
    expect(isContentRefused(refusal)).toBe(true);
    expect(isContentRefused(new Error('content_refused'))).toBe(false);
    expect(isContentRefused(undefined)).toBe(false);
  });
});
