import {
  creatorLabelsBySource,
  dietaryLabelTalliesOf,
  dietaryOwnVotesId,
  dietaryScopeOwnVotesOf,
  dietaryScopeTalliesOf,
  dietaryVoteScopeKey,
  dietaryVoteSubjectId,
  isReportedByDiners,
} from '../dietary-vote';

/** See GitHub issue #2197. */
describe('dietary votes', () => {
  it('keeps one scope per Bite and one per restaurant menu', () => {
    const bite = { type: 'bite', biteId: 'b1' } as const;
    const dish = {
      type: 'menuItem',
      restaurantId: 'r1',
      menuItemId: 'm1',
    } as const;

    expect(dietaryVoteScopeKey(bite)).toBe('bite__b1');
    expect(dietaryVoteSubjectId(bite)).toBe('b1');
    expect(dietaryVoteScopeKey(dish)).toBe('menu__r1');
    expect(dietaryVoteSubjectId(dish)).toBe('m1');
    expect(dietaryOwnVotesId('menu__r1', 'u1')).toBe('menu__r1__u1');
  });

  it('reads stored counts as known labels with whole positive numbers', () => {
    expect(
      dietaryLabelTalliesOf({
        vegan: { confirm: 2, dispute: 1 },
        keto: { confirm: 9, dispute: 0 },
        halal: { confirm: -1, dispute: 'x' },
        kosher: null,
        'nut-free': { confirm: 1.7 },
      }),
    ).toEqual({
      vegan: { confirm: 2, dispute: 1 },
      'nut-free': { confirm: 1, dispute: 0 },
    });
    expect(dietaryLabelTalliesOf(undefined)).toEqual({});
  });

  it('reads a scope document by subject', () => {
    expect(
      dietaryScopeTalliesOf({
        items: { m1: { vegan: { confirm: 1, dispute: 0 } } },
      }),
    ).toEqual({ m1: { vegan: { confirm: 1, dispute: 0 } } });
    expect(dietaryScopeTalliesOf({})).toEqual({});
    expect(dietaryScopeTalliesOf(undefined)).toEqual({});
  });

  it('reads the caller own votes, dropping unknown values', () => {
    expect(
      dietaryScopeOwnVotesOf({
        items: {
          m1: {
            vegan: { vote: 'confirm' },
            halal: { vote: 'maybe' },
            keto: { vote: 'dispute' },
          },
          m2: null,
        },
      }),
    ).toEqual({ m1: { vegan: 'confirm' }, m2: {} });
    expect(dietaryScopeOwnVotesOf(undefined)).toEqual({});
  });

  describe('reported by diners', () => {
    it('needs three confirmations and no dispute', () => {
      expect(
        isReportedByDiners('vegan', { confirm: 3, dispute: 0 }, false),
      ).toBe(true);
      expect(
        isReportedByDiners('vegan', { confirm: 2, dispute: 0 }, false),
      ).toBe(false);
      expect(
        isReportedByDiners('vegan', { confirm: 9, dispute: 1 }, false),
      ).toBe(false);
      expect(isReportedByDiners('vegan', undefined, false)).toBe(false);
    });

    it('reports halal and kosher only where the restaurant declares them', () => {
      const tally = { confirm: 5, dispute: 0 };

      expect(isReportedByDiners('halal', tally, false)).toBe(false);
      expect(isReportedByDiners('kosher', tally, false)).toBe(false);
      expect(isReportedByDiners('halal', tally, true)).toBe(true);
      expect(isReportedByDiners('gluten-free', tally, false)).toBe(true);
    });

    it('splits the creator labels by who claims them now', () => {
      expect(
        creatorLabelsBySource(
          ['vegan', 'halal', 'gluten-free', 'keto'],
          {
            vegan: { confirm: 3, dispute: 0 },
            halal: { confirm: 4, dispute: 0 },
          },
          [],
        ),
      ).toEqual({ reported: ['vegan'], creator: ['gluten-free', 'halal'] });
    });
  });
});
