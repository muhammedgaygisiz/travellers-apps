import { Bite, Geopoint, PublicUser, Settings } from 'model';
import * as fromSelectors from '../selectors';
import { EntityState } from '@ngrx/entity';

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

  const initialState: EntityState<Bite> & {
    cachedBite?: Bite;
    editingBite?: Bite;
    biteCreator?: PublicUser;
  } = {
    ids: ['1', '2'],
    entities: {
      '1': mockBite1,
      '2': mockBite2,
    },
    cachedBite: mockBite1,
    biteCreator: mockUser,
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
      ];

      const result = fromSelectors.bites.projector(
        bitesWithMetadata,
        [], // no filters
        {} as Settings,
        mockPosition // GPS position
      );

      expect(result).toEqual(bitesWithMetadata);
    });

    it('should filter bites by tags', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ];

      const result = fromSelectors.bites.projector(
        bitesWithMetadata,
        ['food'], // filter by food tag
        {} as Settings,
        mockPosition
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('allTags', () => {
    it('should return unique sorted tags without # symbol', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ];

      const result = fromSelectors.allTags.projector(bitesWithMetadata);
      expect(result).toEqual(['coffee', 'drink', 'food', 'vienna']);
    });
  });

  describe('bite', () => {
    it('should return specific bite by id', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ];

      const result = fromSelectors.bite.projector('1', bitesWithMetadata);
      expect(result).toEqual(bitesWithMetadata[0]);
    });

    it('should return undefined for non-existing bite id', () => {
      const bitesWithMetadata = [
        { ...mockBite1, likes: mockLikes, distance: '0' },
        { ...mockBite2, likes: [], distance: '0.01' },
      ];

      const result = fromSelectors.bite.projector('3', bitesWithMetadata);
      expect(result).toBeUndefined();
    });
  });

  describe('bitesWithMetadata', () => {
    it('should return bites with likes and distance', () => {
      const result = fromSelectors.bitesWithMetadata.projector(
        [mockBite1, mockBite2],
        mockLikes,
        mockPosition
      );

      expect(result).toMatchSnapshot();
    });
  });
});
