import { Bite, Geopoint } from 'model';
import { bitesByRestaurant } from '../bites-by-restaurant.selector';

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

    it('should return the cached bite by restaurant', () => {
      const result = bitesByRestaurant.projector(
        [],
        '123',
        undefined,
        mockBite1
      );
      expect(result).toEqual([mockBite1]);
    });

    it('should return the cached bite by restaurant id or name', () => {
      const result = bitesByRestaurant.projector(
        [],
        '123',
        {} as any,
        mockBite1
      );
      expect(result).toEqual([mockBite1]);
    });
  });
});
