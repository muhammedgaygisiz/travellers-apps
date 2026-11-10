import { formatPosition } from '../format-position';

describe('formatPosition', () => {
  it('renders latitude and longitude', () => {
    expect(formatPosition({ latitude: 46.948, longitude: 7.4474 })).toBe(
      '46.948, 7.4474',
    );
  });

  it('renders a dash for each missing part', () => {
    expect(formatPosition({ latitude: 46.948 })).toBe('46.948, -');
  });

  it('renders dashes for a stored Bite that carries no position', () => {
    expect(formatPosition(undefined)).toBe('-, -');
    expect(formatPosition(null)).toBe('-, -');
  });

  it('keeps a zero coordinate rather than treating it as missing', () => {
    expect(formatPosition({ latitude: 0, longitude: 0 })).toBe('0, 0');
  });
});
