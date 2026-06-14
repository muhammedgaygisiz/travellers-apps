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

  it('should not call the Firebase function for short search text', async () => {
    const service = createService();
    const result = await service.usersLoader({
      params: { searchText: 'ab' },
    } as never);

    expect(FirebaseFunctions.callByName).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should return users from the Firebase function', async () => {
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

    const result = await service.usersLoader({
      params: { searchText: 'Langone' },
    } as never);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'searchUsers',
      data: {
        searchText: 'Langone',
      },
    });
    expect(result).toEqual(users);
  });
});
