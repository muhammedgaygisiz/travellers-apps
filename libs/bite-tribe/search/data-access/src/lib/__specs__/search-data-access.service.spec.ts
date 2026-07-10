import { TestBed } from '@angular/core/testing';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { SearchDataAccessService } from '../search-data-access.service';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

describe(SearchDataAccessService.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({ data: [] });
  });

  const createService = (): SearchDataAccessService => {
    TestBed.configureTestingModule({
      providers: [SearchDataAccessService],
    });

    return TestBed.inject(SearchDataAccessService);
  };

  it('should not call a Firebase function for short search text', async () => {
    const service = createService();
    const result = await service.resultsLoader({
      params: { searchText: 'ab', category: 'user' },
    } as never);

    expect(FirebaseFunctions.callByName).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should return mapped user results from the Firebase function', async () => {
    const service = createService();
    const users = [
      {
        userId: '1',
        displayName: 'Daniel Langone',
        email: 'daniel@example.com',
        photoUrl: '',
      },
    ];
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: users });

    const result = await service.resultsLoader({
      params: { searchText: 'Langone', category: 'user' },
    } as never);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'searchUsers',
      data: {
        searchText: 'Langone',
      },
    });
    expect(result).toEqual([{ category: 'user', value: users[0] }]);
  });

  it('should return mapped bite results from the Firebase function', async () => {
    const service = createService();
    const bites = [
      {
        id: 'bite-1',
        name: 'Butter Chicken',
        place: 'Tandoori House',
      },
    ];
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: bites });

    const result = await service.resultsLoader({
      params: { searchText: 'chicken', category: 'bite' },
    } as never);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'searchBites',
      data: {
        searchText: 'chicken',
      },
    });
    expect(result).toEqual([{ category: 'bite', value: bites[0] }]);
  });

  it('should return mapped city results from the searchBitesByCity function', async () => {
    const service = createService();
    const bites = [
      {
        id: 'bite-2',
        name: 'Margherita',
        place: 'Napoli',
      },
    ];
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: bites });

    const result = await service.resultsLoader({
      params: { searchText: 'Napoli', category: 'city' },
    } as never);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'searchBitesByCity',
      data: {
        searchText: 'Napoli',
      },
    });
    expect(result).toEqual([{ category: 'city', value: bites[0] }]);
  });

  it('should return mapped restaurant results from the Firebase function', async () => {
    const service = createService();
    const restaurants = [
      {
        id: 'restaurant-1',
        name: 'Italian Restaurant Bern',
        biteId: 'bite-1',
        restaurantId: 'restaurant-1',
      },
    ];
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: restaurants });

    const result = await service.resultsLoader({
      params: { searchText: 'italian', category: 'restaurant' },
    } as never);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'searchRestaurants',
      data: {
        searchText: 'italian',
      },
    });
    expect(result).toEqual([{ category: 'restaurant', value: restaurants[0] }]);
  });

  it('should return empty results when a Firebase function fails', async () => {
    const service = createService();
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockRejectedValue(new Error('Function not found'));

    const result = await service.resultsLoader({
      params: { searchText: 'chicken', category: 'bite' },
    } as never);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'searchBites',
      data: {
        searchText: 'chicken',
      },
    });
    expect(result).toEqual([]);
  });
});
