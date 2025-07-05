import { base64ToFile } from '../base64-to-file';

describe('base64ToFile', () => {
  const validBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wIAAgMBApUAAAAASUVORK5CYII=';

  it('should convert base64 with MIME type to File', () => {
    const result = base64ToFile(`data:image/png;base64,${validBase64}`, 'png');
    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('image/png');
    expect(result.size).toBeGreaterThan(0);
  });

  it('should handle base64 without MIME type', () => {
    const result = base64ToFile(validBase64, 'png');
    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('');
    expect(result.size).toBeGreaterThan(0);
  });

  it('should handle undefined base64', () => {
    const result = base64ToFile(undefined, 'png');
    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('');
    expect(result.size).toBe(0);
  });

  it('should handle empty base64 string', () => {
    const result = base64ToFile('', 'png');
    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('');
    expect(result.size).toBe(0);
  });

  it('should handle invalid base64 content', () => {
    const result = base64ToFile('not-valid-base64', 'png');
    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('');
    expect(result.size).toBe(0);
  });

  it('should handle malformed data URI', () => {
    const result = base64ToFile('data:image/png,not-base64-content', 'png');
    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('');
    expect(result.size).toBe(0);
  });

  it('should handle partial data URI', () => {
    const result = base64ToFile(`data:;base64,${validBase64}`, 'png');
    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('');
    expect(result.size).toBeGreaterThan(0);
  });
});
