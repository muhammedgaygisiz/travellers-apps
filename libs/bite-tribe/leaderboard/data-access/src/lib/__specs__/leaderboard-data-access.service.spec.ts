import { ApplicationRef } from '@angular/core';
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

  describe('country rankings (#2043)', () => {
    it('should ask the Firebase function for the named country board', async () => {
      const service = createService();
      const ranking = {
        board: 'countriesAllTime',
        countries: [{ countryCode: 'BA', biteCount: 3 }],
      };
      jest
        .mocked(FirebaseFunctions.callByName)
        .mockResolvedValue({ data: ranking });

      expect(await service.loadCountries('countriesAllTime')).toEqual(ranking);
      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'loadLeaderboard',
        data: { board: 'countriesAllTime' },
      });
    });

    it('should read an answer without countries as an empty board', async () => {
      const service = createService();
      // A function deployed before #2043 answers with the all-time users.
      jest
        .mocked(FirebaseFunctions.callByName)
        .mockResolvedValue({ data: users });

      expect(await service.loadCountries('countries')).toEqual({
        board: 'countries',
        countries: [],
      });
    });

    it('should read a failed call as an empty board', async () => {
      const service = createService();
      jest
        .mocked(FirebaseFunctions.callByName)
        .mockRejectedValue(new Error('offline'));

      expect(await service.loadCountries('countriesLastWeek')).toEqual({
        board: 'countriesLastWeek',
        countries: [],
      });
    });

    it('should start on this week', () => {
      jest
        .mocked(FirebaseFunctions.callByName)
        .mockResolvedValue({ data: { board: 'countries', countries: [] } });

      expect(createService().countryBoard()).toBe('countries');
    });
  });

  it('should load both resources for their current boards', async () => {
    jest
      .mocked(FirebaseFunctions.callByName)
      .mockResolvedValue({ data: { board: 'thisWeek', users: [] } });
    createService();

    await TestBed.inject(ApplicationRef).whenStable();

    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'loadLeaderboard',
      data: { board: 'thisWeek' },
    });
    expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
      name: 'loadLeaderboard',
      data: { board: 'countries' },
    });
  });
});
