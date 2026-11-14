import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import {
  CountryBoard,
  LeaderboardBoard,
  LeaderboardDataAccessService,
} from 'bite-tribe/leaderboard-data-access';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { LeaderboardService } from '../leaderboard.service';

class MockDataAccess {
  board = signal<LeaderboardBoard>('thisWeek');
  countryBoard = signal<CountryBoard>('countries');
  countryRanking = {
    value: jest.fn(() => ({ board: 'countries', countries: [] })),
    isLoading: jest.fn(() => false),
    reload: jest.fn(),
  };
  ranking = {
    value: jest.fn(() => ({ board: 'thisWeek', users: [] })),
    isLoading: jest.fn(() => false),
    reload: jest.fn(),
  };
}

class MockStoreService {
  user = signal<{ uid: string } | undefined>({ uid: 'me' });
}

class MockNavController {
  navigateForward = jest.fn();
}

describe(LeaderboardService.name, () => {
  let service: LeaderboardService;
  let navController: MockNavController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LeaderboardService,
        { provide: LeaderboardDataAccessService, useClass: MockDataAccess },
        { provide: NavController, useClass: MockNavController },
        { provide: BiteTribeStoreService, useClass: MockStoreService },
      ],
    });

    service = TestBed.inject(LeaderboardService);
    navController = TestBed.inject(
      NavController,
    ) as unknown as MockNavController;
  });

  it('should name the signed-in user, whose place is highlighted', () => {
    expect(service.currentUserId()).toBe('me');
  });

  it('should reload the leaderboard resource', () => {
    service.reload();

    expect(service.ranking.reload).toHaveBeenCalledTimes(1);
  });

  it('should open a Bite from the Most liked board', () => {
    service.biteClicked({
      biteId: 'bite-1',
      name: 'Mantı',
      imageUrl: '',
      userId: 'ana',
      displayName: 'Ana',
      likeCount: 3,
    });

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'bite',
      'bite-1',
    ]);
  });

  it('should open the country ranking and a country’s Bites (#2043)', () => {
    service.openCountries();
    service.countryClicked('BA');
    service.selectCountryBoard('countriesAllTime');

    expect(navController.navigateForward).toHaveBeenNthCalledWith(1, [
      'leaderboard-countries',
    ]);
    expect(navController.navigateForward).toHaveBeenNthCalledWith(
      2,
      ['search'],
      { queryParams: { country: 'BA' } },
    );
    expect(service.countryBoard()).toBe('countriesAllTime');
  });

  it('should switch the board the ranking is loaded for', () => {
    service.selectBoard('lastWeek');

    expect(service.board()).toBe('lastWeek');
  });

  it('should navigate to public user profiles', () => {
    service.userClicked({
      userId: 'user-1',
      displayName: 'Daniel',
      photoUrl: '',
      public: true,
      biteCount: 7,
    });

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'profile',
      'user-1',
    ]);
  });

  it('should not navigate to private user profiles', () => {
    service.userClicked({
      userId: 'user-1',
      displayName: '',
      photoUrl: '',
      public: false,
      biteCount: 7,
    });

    expect(navController.navigateForward).not.toHaveBeenCalled();
  });
});
