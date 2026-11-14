import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { LeaderboardUser } from 'bite-tribe/leaderboard-data-access';
import { LeaderboardListComponent } from '../leaderboard-list.component';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(LeaderboardListComponent.name, () => {
  let component: LeaderboardListComponent;
  let fixture: ComponentFixture<LeaderboardListComponent>;
  let componentRef: ComponentRef<LeaderboardListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaderboardListComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaderboardListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sort users by biteCount descending', () => {
    const users: LeaderboardUser[] = [
      {
        userId: 'user-1',
        displayName: 'A',
        photoUrl: '',
        public: true,
        biteCount: 3,
      },
      {
        userId: 'user-2',
        displayName: 'B',
        photoUrl: '',
        public: true,
        biteCount: 10,
      },
    ];

    componentRef.setInput('ranking', { board: 'thisWeek', users });

    expect(component.rankedUsers().map((user) => user.userId)).toEqual([
      'user-2',
      'user-1',
    ]);
  });

  it('should not mutate the original users input when sorting', () => {
    const users: LeaderboardUser[] = [
      {
        userId: 'user-1',
        displayName: 'A',
        photoUrl: '',
        public: true,
        biteCount: 3,
      },
      {
        userId: 'user-2',
        displayName: 'B',
        photoUrl: '',
        public: true,
        biteCount: 10,
      },
    ];

    componentRef.setInput('ranking', { board: 'thisWeek', users });
    component.rankedUsers();

    expect(users.map((user) => user.userId)).toEqual(['user-1', 'user-2']);
  });

  it('should run the header progress bar while the spinner shows', () => {
    componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeTruthy();

    componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeFalsy();
  });

  it('should track image errors by user id', () => {
    component.onImageError('user-1');

    expect(component.imageErroredUserIds().has('user-1')).toBe(true);
  });

  it('should return false for hasImage after an image error', () => {
    const user = {
      userId: 'user-1',
      displayName: 'A',
      photoUrl: 'photo.jpg',
      public: true,
      biteCount: 3,
    };

    component.onImageError(user.userId);

    expect(component.hasImage(user)).toBe(false);
  });

  describe('weekly board (#2027)', () => {
    const MONDAY = Date.UTC(2026, 10, 9);
    const NEXT_MONDAY = Date.UTC(2026, 10, 16);
    const user: LeaderboardUser = {
      userId: 'user-1',
      displayName: 'A',
      photoUrl: '',
      public: true,
      biteCount: 2,
    };

    it('should open on the week tab with this week selected', () => {
      expect(component.tab()).toBe('week');
      expect(component.board()).toBe('thisWeek');
    });

    it('should switch to all time and back to this week', () => {
      const emitted: string[] = [];
      component.boardChange.subscribe((board) => emitted.push(board));

      component.selectTab('allTime');
      component.selectTab('week');

      expect(emitted).toEqual(['allTime', 'thisWeek']);
    });

    it('should not show the previous board while the next one loads', () => {
      componentRef.setInput('board', 'lastWeek');
      componentRef.setInput('ranking', { board: 'thisWeek', users: [user] });

      expect(component.rankedUsers()).toEqual([]);
    });

    it('should count down to the reset in days, then hours', () => {
      componentRef.setInput('ranking', {
        board: 'thisWeek',
        users: [user],
        start: MONDAY,
        end: NEXT_MONDAY,
      });

      componentRef.setInput('now', NEXT_MONDAY - 2.5 * 24 * 3600 * 1000);
      expect(component.weekEndsIn()).toBe('in 2 days');

      componentRef.setInput('now', NEXT_MONDAY - 5 * 3600 * 1000);
      expect(component.weekEndsIn()).toBe('in 5 hours');
    });

    it('should date last week’s final standings', () => {
      componentRef.setInput('board', 'lastWeek');
      componentRef.setInput('ranking', {
        board: 'lastWeek',
        users: [user],
        start: MONDAY,
        end: NEXT_MONDAY,
      });

      expect(component.lastWeekDates()).toMatch(/November 9\s*–\s*15/);
      expect(component.weekEndsIn()).toBe('');
    });

    it('should say why each board can be empty', () => {
      expect(component.emptyKey()).toBe('leaderboard-empty-this-week');

      componentRef.setInput('board', 'lastWeek');
      expect(component.emptyKey()).toBe('leaderboard-empty-last-week');

      componentRef.setInput('board', 'allTime');
      expect(component.emptyKey()).toBe('no-leaderboard-users-yet');
      expect(component.tab()).toBe('allTime');
    });
  });
});
