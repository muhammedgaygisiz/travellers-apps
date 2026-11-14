import { TestBed } from '@angular/core/testing';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { LeaderboardDataAccessService } from '../leaderboard-data-access.service';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

const users = [
  {
    userId: 'user-1',
    displayName: 'Daniel Langone',
    photoUrl: '',
    public: true,
    biteCount: 12,
  },
];

describe(LeaderboardDataAccessService.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createService = (): LeaderboardDataAccessService => {
    TestBed.configureTestingModule({
      providers: [LeaderboardDataAccessService],
    });

    return TestBed.inject(LeaderboardDataAccessService);
  };

  it('should ask the Firebase function for the named board', async () => {
    const service = createService();
    const ranking = {
      board: 'lastWeek',
      users,
      start: Date.UTC(2026, 10, 2),
      end: Date.UTC(2026, 10, 9),
    };
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: ranking });

    const result = await service.loadRanking('lastWeek');

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'loadLeaderboard',
      data: { board: 'lastWeek' },
    });
    expect(result).toEqual(ranking);
  });

  it('should read a bare array from a function deployed before the weekly board as all time', async () => {
    const service = createService();
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: users });

    expect(await service.loadRanking('thisWeek')).toEqual({
      board: 'allTime',
      users,
    });
  });

  it('should return an empty ranking when the Firebase function fails', async () => {
    const service = createService();
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockRejectedValue(new Error('Function not found'));

    expect(await service.loadRanking('thisWeek')).toEqual({
      board: 'thisWeek',
      users: [],
    });
  });

  it('should start on this week', () => {
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: { board: 'thisWeek', users: [] } });

    expect(createService().board()).toBe('thisWeek');
  });
});
