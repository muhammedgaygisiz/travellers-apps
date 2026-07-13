import { toUploadErrorCode } from '../to-upload-error-code';

describe('toUploadErrorCode', () => {
  it('prefers the Firebase Storage error code', () => {
    expect(
      toUploadErrorCode({
        code: 'storage/unauthenticated',
        message: 'User is not authenticated',
      }),
    ).toBe('storage/unauthenticated');
  });

  it('falls back to the message when no code is present', () => {
    expect(toUploadErrorCode({ message: 'network request failed' })).toBe(
      'network request failed',
    );
  });

  it('handles plain string errors', () => {
    expect(toUploadErrorCode('storage/canceled')).toBe('storage/canceled');
  });

  it('returns "unknown" for empty or nullish errors', () => {
    expect(toUploadErrorCode(undefined)).toBe('unknown');
    expect(toUploadErrorCode(null)).toBe('unknown');
    expect(toUploadErrorCode({})).toBe('unknown');
    expect(toUploadErrorCode('   ')).toBe('unknown');
  });

  it('truncates long values to the GA4 limit', () => {
    const long = 'x'.repeat(250);

    expect(toUploadErrorCode({ message: long })).toHaveLength(100);
  });
});
