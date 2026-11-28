import { dietaryLabelRemovalId } from '../dietary-restoration';

/** See GitHub issue #2199. */
describe('dietary restoration', () => {
  it('names one removal by restaurant, dish and label', () => {
    expect(dietaryLabelRemovalId('r1', 'm1', 'vegan')).toBe('r1__m1__vegan');
  });
});
