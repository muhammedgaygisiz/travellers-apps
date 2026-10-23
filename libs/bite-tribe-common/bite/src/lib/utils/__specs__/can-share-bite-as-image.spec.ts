import { canShareBiteAsImage } from '../can-share-bite-as-image';

describe(canShareBiteAsImage.name, () => {
  it('allows the viewer to share their own Bite', () => {
    expect(canShareBiteAsImage({ userId: 'me' }, 'me')).toBe(true);
  });

  it("refuses somebody else's Bite", () => {
    expect(canShareBiteAsImage({ userId: 'someone-else' }, 'me')).toBe(false);
  });

  it('refuses a Bite whose creator deleted their account', () => {
    expect(canShareBiteAsImage({ userId: undefined }, 'me')).toBe(false);
  });

  it('refuses a viewer who is not signed in', () => {
    expect(canShareBiteAsImage({ userId: undefined }, undefined)).toBe(false);
  });
});
