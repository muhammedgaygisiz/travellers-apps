import { biteIdFromImageName } from '../bite-id-from-image-name';

describe('biteIdFromImageName', () => {
  it('reads the Bite id from a name written by the upload flow', () => {
    expect(biteIdFromImageName('bites_abc-123.jpg')).toBe('abc-123');
  });

  it('ignores the extension, whichever one the upload used', () => {
    expect(biteIdFromImageName('bites_abc-123.heic')).toBe('abc-123');
    expect(biteIdFromImageName('bites_abc-123.png')).toBe('abc-123');
  });

  it('keeps ids that contain dots', () => {
    expect(biteIdFromImageName('bites_abc.123.jpg')).toBe('abc.123');
  });

  it('yields nothing for photos predating the convention', () => {
    expect(biteIdFromImageName('IMG_0417.jpg')).toBeUndefined();
  });

  it('yields nothing for another collection', () => {
    expect(biteIdFromImageName('users_abc-123.jpg')).toBeUndefined();
  });

  it('yields nothing when the id part is empty', () => {
    expect(biteIdFromImageName('bites_.jpg')).toBeUndefined();
    expect(biteIdFromImageName('bites_')).toBeUndefined();
  });
});
