import { TestBed } from '@angular/core/testing';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { LeaderboardDataAccessService } from '../leaderboard-data-access.service';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

describe(LeaderboardDataAccessService.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({ data: [] });
  });

  const createService = (): LeaderboardDataAccessService => {
    TestBed.configureTestingModule({
      providers: [LeaderboardDataAccessService],
    });

    return TestBed.inject(LeaderboardDataAccessService);
  };

  it('should load leaderboard users from the Firebase function', async () => {
    const service = createService();
    const users = [
      {
        userId: 'user-1',
        displayName: 'Daniel Langone',
        email: 'daniel@example.com',
        photoUrl: '',
        public: true,
        biteCount: 12,
      },
    ];
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: users });

    const result = await service.usersLoader({} as never);

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'loadLeaderboard',
      data: undefined,
    });
    expect(result).toEqual(users);
  });

  it('should return an empty list when the Firebase function fails', async () => {
    const service = createService();
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockRejectedValue(new Error('Function not found'));

    const result = await service.usersLoader({} as never);

    expect(result).toEqual([]);
  });
});
