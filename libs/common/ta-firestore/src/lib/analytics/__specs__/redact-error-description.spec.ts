import { redactErrorDescription } from '../redact-error-description';

describe('redactErrorDescription', () => {
  it('should leave an ordinary message untouched', () => {
    expect(redactErrorDescription('Cannot read property of undefined')).toBe(
      'Cannot read property of undefined',
    );
  });

  it('should redact an email address', () => {
    expect(
      redactErrorDescription('No account for muhammed.test+tag@gmail.com'),
    ).toBe('No account for [email]');
  });

  it('should redact a firebase uid', () => {
    expect(
      redactErrorDescription('Bite abc123DEF456ghi789JKL012m not found'),
    ).toBe('Bite [id] not found');
  });

  it('should redact a jwt', () => {
    expect(
      redactErrorDescription(
        'Auth failed: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcDEF',
      ),
    ).toBe('Auth failed: [token]');
  });

  it('should drop query strings that carry tokens', () => {
    expect(
      redactErrorDescription(
        'GET https://api.example.com/v1/bites?token=secret123&uid=xyz failed',
      ),
    ).toBe('GET https://api.example.com/v1/bites failed');
  });

  // Stack-shaped text is what makes a report readable, and class names are long
  // without being identifying. The digit requirement is what keeps them.
  it('should keep long words that carry no digits', () => {
    expect(
      redactErrorDescription('RestaurantCandidateStoreException raised'),
    ).toBe('RestaurantCandidateStoreException raised');
  });

  it('should truncate an overlong message', () => {
    const result = redactErrorDescription('x'.repeat(500));

    expect(result).toHaveLength(201);
    expect(result.endsWith('…')).toBe(true);
  });

  it('should handle several kinds at once', () => {
    expect(
      redactErrorDescription('Failed for a@b.com on doc xyz789ABC456def123GHI'),
    ).toBe('Failed for [email] on doc [id]');
  });
});
