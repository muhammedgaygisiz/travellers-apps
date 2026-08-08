import { getRegionForTimeZone } from '../get-region-for-time-zone';

describe('getRegionForTimeZone', () => {
  it('resolves the region of a mapped zone', () => {
    expect(getRegionForTimeZone('Europe/Zurich')).toBe('CH');
    expect(getRegionForTimeZone('America/Argentina/Buenos_Aires')).toBe('AR');
    expect(getRegionForTimeZone('Pacific/Honolulu')).toBe('US');
  });

  it('resolves the deprecated aliases devices still report', () => {
    expect(getRegionForTimeZone('Asia/Calcutta')).toBe('IN');
    expect(getRegionForTimeZone('Asia/Saigon')).toBe('VN');
    expect(getRegionForTimeZone('Europe/Kiev')).toBe('UA');
  });

  it('ignores casing and surrounding whitespace', () => {
    expect(getRegionForTimeZone(' europe/london ')).toBe('GB');
  });

  it('returns undefined for an unknown or missing zone', () => {
    expect(getRegionForTimeZone('Africa/Kampala')).toBeUndefined();
    expect(getRegionForTimeZone('UTC')).toBeUndefined();
    expect(getRegionForTimeZone('')).toBeUndefined();
    expect(getRegionForTimeZone(undefined)).toBeUndefined();
  });
});
