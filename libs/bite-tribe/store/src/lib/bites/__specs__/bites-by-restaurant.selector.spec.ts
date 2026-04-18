import type { Bite, Geopoint, Restaurant } from 'model';
import {
  bitesByRestaurant,
  sortedBitesByRestaurant,
} from '../bites-by-restaurant.selector';

const getBitesByRestaurantNameMock = jest.fn();
jest.mock('../utils/get-bites-by-restaurant-name', () => ({
  getBitesByRestaurantName: (): void => getBitesByRestaurantNameMock(),
}));

const normalizeMock = jest.fn();
jest.mock('utils', () => ({
  normalize: (): void => normalizeMock(),
}));

const getBitesByRestaurantIdOrNameMock = jest.fn();
jest.mock('../utils/get-bites-by-restaurant-id-or-name', () => ({
  getBitesByRestaurantIdOrName: (): void => getBitesByRestaurantIdOrNameMock(),
}));

const getCloseBitesMock = jest.fn();
jest.mock('../utils/get-close-bites', () => ({
  getCloseBites: (): void => getCloseBitesMock(),
}));

describe('BitesByRestaurant Selectors', () => {
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

  describe('bitesByRestaurant', () => {
    beforeEach(() => {
      normalizeMock.mockReturnValue('name');
      getBitesByRestaurantNameMock.mockReturnValue([mockBite1]);
      getBitesByRestaurantIdOrNameMock.mockReturnValue([mockBite1]);
    });

    describe('given no restaurant and restaurantIdOrName', () => {
      it('should return an empty array', () => {
        const result = bitesByRestaurant.projector(
          [],
          undefined,
          undefined,
          undefined,
        );
        expect(result).toEqual([]);
      });
    });

    describe('given a restaurant id and a source bite', () => {
      it('should return the cached bite by restaurant', () => {
        const result = bitesByRestaurant.projector(
          [],
          '123',
          undefined,
          mockBite1,
        );
        expect(result).toEqual([mockBite1]);
      });
    });

    describe('given a restaurant and a source bite', () => {
      describe('and bites by restaurant name not including source bite', () => {
        it('should return source bite and found bites by restaurant', () => {
          const mockRestaurant = {
            id: '123',
            name: 'Test Restaurant',
          } as Restaurant;

          const anotherBite: Bite = {
            id: '2',
            name: 'Test Bite 2',
            position: mockPosition,
            tags: ['#food', '#vienna'],
            place: 'Test Place 2',
          } as Bite;

          getBitesByRestaurantNameMock.mockReturnValue([anotherBite]);

          const result = bitesByRestaurant.projector(
            [],
            undefined,
            mockRestaurant as any,
            mockBite1,
          );
          expect(result).toEqual([mockBite1, anotherBite]);
        });
      });
    });

    describe('given a restaurant id, no restaurant and a source bite', () => {
      describe('and bites by restaurant id not including source bite', () => {
        it('should return source bite and found bites by restaurant id or name', () => {
          const anotherBite: Bite = {
            id: '2',
            name: 'Test Bite 2',
            position: mockPosition,
            tags: ['#food', '#vienna'],
            place: 'Test Place 2',
          } as Bite;

          getBitesByRestaurantIdOrNameMock.mockReturnValue([anotherBite]);

          const result = bitesByRestaurant.projector(
            [],
            '123',
            undefined,
            mockBite1,
          );
          expect(result).toEqual([mockBite1, anotherBite]);
        });
      });
    });

    describe('given empty restaurant and no restaurant id', () => {
      it('should return an empty array', () => {
        const result = bitesByRestaurant.projector(
          [],
          undefined,
          {} as any,
          mockBite1,
        );
        expect(result).toEqual([]);
      });
    });

    it('should return the cached bite by restaurant id or name', () => {
      const result = bitesByRestaurant.projector(
        [],
        '123',
        {} as any,
        mockBite1,
      );
      expect(result).toEqual([mockBite1]);
    });
  });

  describe('sortedBitesByRestaurant', () => {
    it('should sort bites by the given criteria', () => {
      const mockExchangeRates = { EUR: 1, USD: 1.1 };
      const bites = [mockBite1];
      const sorting = 'createdAt';

      const result = sortedBitesByRestaurant.projector(
        bites,
        sorting,
        mockExchangeRates,
      );

      expect(result).toEqual(bites); // Assuming sortByCriteria returns sorted array
    });
  });
});
