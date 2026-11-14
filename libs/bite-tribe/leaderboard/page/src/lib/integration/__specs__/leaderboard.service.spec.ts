import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import {
  LeaderboardBoard,
  LeaderboardDataAccessService,
} from 'bite-tribe/leaderboard-data-access';
import { LeaderboardService } from '../leaderboard.service';

class MockDataAccess {
  board = signal<LeaderboardBoard>('thisWeek');
  ranking = {
    value: jest.fn(() => ({ board: 'thisWeek', users: [] })),
    isLoading: jest.fn(() => false),
    reload: jest.fn(),
  };
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
      ],
    });

    service = TestBed.inject(LeaderboardService);
    navController = TestBed.inject(
      NavController,
    ) as unknown as MockNavController;
  });

  it('should reload the leaderboard resource', () => {
    service.reload();

    expect(service.ranking.reload).toHaveBeenCalledTimes(1);
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
