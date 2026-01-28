import type { Bite, Bucketlist, Geopoint, PublicUser } from 'model';
import * as fromSelectors from '../selectors';
import { BitesState } from '../adapter';

describe('Bites Selectors', () => {
  const mockPosition: Geopoint = {
    latitude: 48.2082,
    longitude: 16.3738,
  };

  const mockBite1: Bite = {
    id: '1',
    name: 'Test Bite 1',
    position: mockPosition,
    tags: ['#food', '#vienna'],
    place: 'Test Place 1',
  } as Bite;

  const mockBite2: Bite = {
    id: '2',
    name: 'Test Bite 2',
    position: {
      latitude: 48.2083,
      longitude: 16.3739,
    },
    tags: ['#drink', '#coffee'],
    place: 'Test Place 2',
  } as Bite;

  const mockUser: PublicUser = {
    name: 'Test User',
  } as unknown as PublicUser;

  const mockLikes = [
    { id: 'like1', biteId: '1', userId: 'user1' },
    { id: 'like2', biteId: '1', userId: 'user2' },
  ];

  const initialState: BitesState = {
    ids: ['1', '2'],
    entities: {
      '1': mockBite1,
      '2': mockBite2,
    },
    cachedBite: mockBite1,
    biteCreator: mockUser,
    latestBites: [],
  };

  describe('cachedBite', () => {
    it('should return the cached bite', () => {
      const result = fromSelectors.cachedBite.projector(initialState);
      expect(result).toEqual(mockBite1);
    });

    it('should return undefined if cached bite does not exist', () => {
      const result = fromSelectors.cachedBite.projector({
        ...initialState,
        cachedBite: undefined,
      });
      expect(result).toBeUndefined();
    });

    it('should return undefined if slice is undefined', () => {
      const result = fromSelectors.cachedBite.projector(undefined as any);
      expect(result).toBeUndefined();
    });
  });

  describe('biteCreator', () => {
    it('should return the bite creator', () => {
      const result = fromSelectors.biteCreator.projector(initialState);
      expect(result).toEqual(mockUser);
    });

    it('should return undefined if bite creator does not exist', () => {
      const result = fromSelectors.biteCreator.projector({
        ...initialState,
        biteCreator: undefined,
      });
      expect(result).toBeUndefined();
    });

    it('should return undefined if slice is undefined', () => {
      const result = fromSelectors.biteCreator.projector(undefined as any);
      expect(result).toBeUndefined();
    });
  });

  describe('bites', () => {
    it('should return all bites with metadata when no filters are applied', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bites.projector(
        bitesWithMetadata,
        [], // no filters
        0, // no max price
        'EUR', // preferred currency
        mockPosition, // mock GPS position
        undefined,
        {}, // no exchange rates
      );

      expect(result).toEqual(bitesWithMetadata);
    });

    it('should filter bites by tags', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bites.projector(
        bitesWithMetadata,
        ['food'], // filter by food tag
        0, // no max price
        'EUR', // preferred currency
        mockPosition,
        undefined,
        {}, // no exchange rates
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter bites by max price', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0', price: 10 },
        { ...mockBite2, likes: [], distance: '0.01', price: 20 },
      ] as any[];

      const result = fromSelectors.bites.projector(
        bitesWithMetadata,
        [], // no tags filter
        15, // max price
        'EUR', // preferred currency
        mockPosition,
        undefined,
        {}, // no exchange rates
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should sort bites by distance', () => {
      const bitesWithMetadata = [
        { ...mockBite2, likes: [], distance: '0' },
        { ...mockBite1, likes: mockLikes, distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bites.projector(
        bitesWithMetadata,
        [], // no filters
        0, // no max price
        'EUR', // preferred currency
        mockPosition,
        undefined,
        {}, // no exchange rates
      );

      expect(result[0].id).toBe('2'); // closest bite first
    });

    it('should handle no gps position gracefully', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bites.projector(
        bitesWithMetadata,
        [], // no filters
        0, // no max price
        'EUR', // preferred currency
        undefined, // no GPS position
        undefined,
        {}, // no exchange rates
      );

      expect(result).toEqual(bitesWithMetadata);
    });
  });

  describe('allTags', () => {
    it('should return unique sorted tags without # symbol', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.allTags.projector(bitesWithMetadata);
      expect(result).toEqual(['coffee', 'drink', 'food', 'vienna']);
    });
  });

  describe('bite', () => {
    it('should return specific bite by id', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bite.projector(
        '1',
        bitesWithMetadata,
        {},
        'EUR',
      );
      expect(result).toEqual({
        ...bitesWithMetadata[0],
        priceInPreferredCurrencySymbol: 'EUR',
      });
    });

    it('should return undefined for non-existing bite id', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bite.projector(
        '3',
        bitesWithMetadata,
        {},
        'EUR',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('bitesWithMetadata', () => {
    it('should return bites with likes and distance', () => {
      const result = fromSelectors.bitesWithMetadata.projector(
        [mockBite1, mockBite2],
        [],
        mockLikes,
        mockPosition,
      );

      expect(result).toMatchSnapshot();
    });

    it('should return bites without likes', () => {
      const result = fromSelectors.bitesWithMetadata.projector(
        [mockBite1, mockBite2],
        [],
        [],
        mockPosition,
      );

      expect(result).toMatchSnapshot();
    });

    it('should return bites without likes if no matching likes', () => {
      const result = fromSelectors.bitesWithMetadata.projector(
        [mockBite1, mockBite2],
        [],
        [{ id: 'like1', biteId: '5', userId: 'user1' }],
        mockPosition,
      );

      expect(result).toMatchSnapshot();
    });

    it('should return bites no distance if no position', () => {
      const result = fromSelectors.bitesWithMetadata.projector(
        [mockBite1, mockBite2],
        [],
        mockLikes,
        undefined,
      );

      expect(result).toMatchSnapshot();
    });
  });

  describe('bitesBySelectedBucketlist', () => {
    const mockBucketlist = {
      id: 'bucketlist1',
      biteIds: ['1'],
    } as Bucketlist;

    it('should return bites in the selected bucketlist', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bitesBySelectedBucketlist.projector(
        bitesWithMetadata,
        mockBucketlist,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return empty array if no bucketlist is selected', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bitesBySelectedBucketlist.projector(
        bitesWithMetadata,
        undefined,
      );

      expect(result).toEqual([]);
    });
  });

  describe('mybites', () => {
    it('should return bites created by the user', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0', userId: 'User-1' },
        { ...mockBite2, likes: [], distance: '0.01', userId: 'User-1' },
      ] as any[];

      const result = fromSelectors.mybites.projector(
        bitesWithMetadata,
        'User-1',
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should return empty array if no bites created by the user', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.mybites.projector(
        bitesWithMetadata,
        'Another User',
      );

      expect(result).toEqual([]);
    });
  });

  describe('sortedMyBites', () => {
    it('should return my bites sorted by distance', () => {
      const myBites = [
        { ...mockBite2, likes: [], distance: 10, userId: 'User-1' },
        { ...mockBite1, likes: mockLikes, distance: 5, userId: 'User-1' },
      ] as any[];

      const result = fromSelectors.sortedMyBites.projector(
        myBites,
        'distance',
        {},
      );

      expect(result[0].id).toBe('1'); // closest bite first
      expect(result[1].id).toBe('2');
    });

    it('should return my bites sorted by likes', () => {
      const myBites = [
        { ...mockBite1, likes: mockLikes, distance: 5, userId: 'User-1' },
        { ...mockBite2, likes: [], distance: 10, userId: 'User-1' },
      ] as any[];

      const result = fromSelectors.sortedMyBites.projector(
        myBites,
        'likes',
        {},
      );

      expect(result[0].id).toBe('1'); // most liked bite first
      expect(result[1].id).toBe('2');
    });

    it('should return empty array if no bites exist', () => {
      const result = fromSelectors.sortedMyBites.projector([], 'distance', {});
      expect(result).toEqual([]);
    });
  });

  describe('sortedHomeBites', () => {
    it('should return bites sorted by distance', () => {
      const bitesWithMetadata = [
        { ...mockBite2, likes: [], distance: '0' },
        { ...mockBite1, likes: mockLikes, distance: '0.01' },
      ] as any[];

      const result = fromSelectors.sortedHomeBites.projector(
        bitesWithMetadata,
        'other-sorting',
        {},
      );

      expect(result[0].id).toBe('2'); // closest bite first
    });

    it('should return empty array if no bites exist', () => {
      const result = fromSelectors.sortedHomeBites.projector(
        [],
        'distance',
        {},
      );
      expect(result).toEqual([]);
    });
  });

  describe('bitesByUser', () => {
    it('should return bites created by a specific user', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0', userId: 'User-1' },
        { ...mockBite2, likes: [], distance: '0.01', userId: 'User-2' },
      ] as any[];

      const result = fromSelectors.bitesByUser.projector(
        bitesWithMetadata,
        'User-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return empty array if no bites created by the user', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ] as any[];

      const result = fromSelectors.bitesByUser.projector(bitesWithMetadata, {
        userId: 'Another User',
      } as PublicUser);

      expect(result).toEqual([]);
    });
  });

  describe('nearbyRestaurants', () => {
    it('should return sorted place names from nearby bites', () => {
      const PLACE_1 = 'Fish & Chips Deli';
      const PLACE_2 = 'Beef Burger Lovers Place';
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0', place: PLACE_1 },
        { ...mockBite2, likes: [], distance: '0.01', place: PLACE_2 },
      ] as any[];

      const result =
        fromSelectors.nearbyRestaurants.projector(bitesWithMetadata);

      expect(result).toEqual([PLACE_2, PLACE_1]);
    });
  });

  describe('editingBite', () => {
    it('should return the editing bite', () => {
      const result = fromSelectors.editingBite.projector({
        ...initialState,
        editingBite: mockBite2,
      });

      expect(result).toEqual(mockBite2);
    });

    it('should return undefined if no editing bite', () => {
      const result = fromSelectors.editingBite.projector({
        ...initialState,
        editingBite: undefined,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('nearbyBitesWithTags', () => {
    it('should return empty array if no bites exist', () => {
      const result = fromSelectors.nearbyBitesWithTags.projector([]);

      expect(result).toEqual([]);
    });

    it('should return bites that have tags', () => {
      const bitesWithMetadata = [
        { ...mockBite1, tags: ['tag1'], distance: '0' } as any,
        { ...mockBite2, tags: [], distance: '0.01' } as any,
        { ...mockBite2, tags: ['tag2'], distance: '0.02' } as any,
      ];

      const result =
        fromSelectors.nearbyBitesWithTags.projector(bitesWithMetadata);

      expect(result).toHaveLength(2);
      expect(result).toContain(bitesWithMetadata[0]);
      expect(result).toContain(bitesWithMetadata[2]);
    });
  });

  describe('tagSuggestionsForEditingBite', () => {
    it('should return tag suggestions based on editing bite place', () => {
      const bitesWithMetadata = [
        {
          ...mockBite1,
          place: 'Pizza Hut',
          tags: ['pizza', 'italian'],
        },
        {
          ...mockBite2,
          place: 'Pizza Hut',
          tags: ['pasta', 'italian'],
        },
      ] as any[];

      const editingBite = {
        place: 'Pizza Hut',
      } as Bite;

      const result = fromSelectors.tagSuggestionsForEditingBite.projector(
        editingBite,
        bitesWithMetadata,
      );

      expect(result).toContain('pizza');
      expect(result).toContain('italian');
      expect(result).toContain('pasta');
    });

    it('should return empty array if editing bite has no place', () => {
      const bitesWithMetadata = [mockBite1, mockBite2] as any[];
      const editingBite = {} as Bite;

      const result = fromSelectors.tagSuggestionsForEditingBite.projector(
        editingBite,
        bitesWithMetadata,
      );

      expect(result).toEqual([]);
    });

    it('should return empty array if editing bite is null', () => {
      const bitesWithMetadata = [mockBite1, mockBite2] as any[];

      const result = fromSelectors.tagSuggestionsForEditingBite.projector(
        null as any,
        bitesWithMetadata,
      );

      expect(result).toEqual([]);
    });

    it('should return empty array if no matching bites found', () => {
      const bitesWithMetadata = [mockBite1, mockBite2] as any[];
      const editingBite = {
        place: 'Non-existent Restaurant',
      } as Bite;

      const result = fromSelectors.tagSuggestionsForEditingBite.projector(
        editingBite,
        bitesWithMetadata,
      );

      expect(result).toEqual([]);
    });
  });
});
