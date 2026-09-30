import { isBiteVisibleTo, isListableBite } from '../bite-listability';

describe('isListableBite', () => {
  it('lists a Bite whose photo was uploaded', () => {
    expect(isListableBite({ imageStatus: 'uploaded' })).toBe(true);
  });

  it.each([
    ['pending', { imageStatus: 'pending' }],
    ['failed', { imageStatus: 'failed' }],
    ['an absent status', {}],
  ])('does not list a Bite that is %s', (_case, bite) => {
    expect(isListableBite(bite)).toBe(false);
  });
});

describe('isBiteVisibleTo', () => {
  it('shows a listable Bite to anybody', () => {
    expect(
      isBiteVisibleTo({ imageStatus: 'uploaded', userId: 'poster' }, 'viewer'),
    ).toBe(true);
  });

  it('shows a non-listable Bite to its creator', () => {
    expect(
      isBiteVisibleTo({ imageStatus: 'failed', userId: 'poster' }, 'poster'),
    ).toBe(true);
  });

  it('hides a non-listable Bite from everybody else', () => {
    expect(
      isBiteVisibleTo({ imageStatus: 'failed', userId: 'poster' }, 'viewer'),
    ).toBe(false);
  });

  it('never treats an unknown viewer as the creator of a Bite without one', () => {
    expect(isBiteVisibleTo({ imageStatus: 'pending' }, undefined)).toBe(false);
  });
});
