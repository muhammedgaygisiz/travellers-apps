import { toBase64 } from '../to-base-64';

describe('toBase64', () => {
  it('should convert a Blob to a base64 string', async () => {
    const sampleText = 'Hello, World!';
    const blob = new Blob([sampleText], { type: 'text/plain' });

    const base64String = await toBase64(blob);

    // The expected base64 string for "Hello, World!" is "SGVsbG8sIFdvcmxkIQ=="
    expect(base64String).toBe('SGVsbG8sIFdvcmxkIQ==');
  });

  it('should handle empty Blob', async () => {
    const blob = new Blob([], { type: 'text/plain' });

    const base64String = await toBase64(blob);

    // The expected base64 string for an empty Blob is an empty string
    expect(base64String).toBe('');
  });
});
