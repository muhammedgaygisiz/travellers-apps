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

  describe('loading (#2081)', () => {
    const query = (selector: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(selector);

    it('shows a skeleton and the header progress bar on a first load', () => {
      componentRef.setInput('isLoading', true);
      fixture.detectChanges();

      expect(query('[data-testid="leaderboard-skeleton"]')).toBeTruthy();
      expect(query('[data-testid="leaderboard-podium"]')).toBeFalsy();
      expect(query('[data-testid="leaderboard-empty"]')).toBeFalsy();
      expect(query('ion-spinner')).toBeFalsy();
      expect(query('[data-testid="page-loading-bar"]')).toBeTruthy();
    });

    it('keeps a loaded ranking on screen while it refreshes', () => {
      componentRef.setInput('ranking', {
        board: 'thisWeek',
        users: [
          {
            userId: 'user-1',
            displayName: 'Daniel',
            photoUrl: '',
            public: true,
            biteCount: 3,
          },
        ],
      });
      componentRef.setInput('isLoading', true);
      fixture.detectChanges();

      expect(query('[data-testid="leaderboard-skeleton"]')).toBeFalsy();
      expect(query('[data-testid="leaderboard-entry"]')).toBeTruthy();
      expect(query('[data-testid="page-loading-bar"]')).toBeTruthy();

      componentRef.setInput('isLoading', false);
      fixture.detectChanges();

      expect(query('[data-testid="page-loading-bar"]')).toBeFalsy();
    });

    it('shows a skeleton for a board that never loaded, not the last one', () => {
      componentRef.setInput('board', 'allTime');
      componentRef.setInput('ranking', { board: 'thisWeek', users: [] });
      componentRef.setInput('isLoading', true);
      fixture.detectChanges();

      expect(query('[data-testid="leaderboard-skeleton"]')).toBeTruthy();
      expect(query('[data-testid="leaderboard-empty"]')).toBeFalsy();
    });
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

  describe('Most liked board (#2028)', () => {
    const bites = [
      {
        biteId: 'b-1',
        name: 'Mantı',
        imageUrl: 'https://img/1',
        userId: 'ana',
        displayName: 'Ana',
        likeCount: 9,
      },
      {
        biteId: 'b-2',
        name: 'Burek',
        imageUrl: '',
        userId: 'ana',
        displayName: 'Ana',
        likeCount: 4,
      },
    ];

    it('opens the Most liked tab on this week, with its own week switch', () => {
      const emitted: string[] = [];
      component.boardChange.subscribe((board) => emitted.push(board));

      component.selectTab('mostLiked');
      componentRef.setInput('board', 'mostLiked');

      expect(emitted).toEqual(['mostLiked']);
      expect(component.tab()).toBe('mostLiked');
      expect(component.weekBoards()).toEqual({
        current: 'mostLiked',
        last: 'mostLikedLastWeek',
      });
    });

    it('ranks Bites, one creator in several places, and opens a Bite', () => {
      componentRef.setInput('board', 'mostLiked');
      componentRef.setInput('ranking', {
        board: 'mostLiked',
        users: [],
        bites,
      });
      fixture.detectChanges();

      expect(component.ranksBites()).toBe(true);
      expect(component.isEmpty()).toBe(false);

      const opened: string[] = [];
      component.biteClick.subscribe((bite) => opened.push(bite.biteId));
      (
        fixture.nativeElement.querySelector(
          '[data-testid="podium-place-2"] button',
        ) as HTMLElement
      ).click();

      expect(opened).toEqual(['b-2']);
    });

    it('counts down on this week and dates last week, like the users board', () => {
      componentRef.setInput('board', 'mostLiked');
      componentRef.setInput('ranking', {
        board: 'mostLiked',
        users: [],
        bites,
        start: Date.UTC(2026, 10, 9),
        end: Date.UTC(2026, 10, 16),
      });
      componentRef.setInput('now', Date.UTC(2026, 10, 15, 19));
      expect(component.weekEndsIn()).toBe('in 5 hours');

      componentRef.setInput('board', 'mostLikedLastWeek');
      componentRef.setInput('ranking', {
        board: 'mostLikedLastWeek',
        users: [],
        bites,
        start: Date.UTC(2026, 10, 9),
        end: Date.UTC(2026, 10, 16),
      });
      expect(component.weekEndsIn()).toBe('');
      expect(component.lastWeekDates()).toMatch(/November 9\s*–\s*15/);
      expect(component.emptyKey()).toBe(
        'leaderboard-empty-most-liked-last-week',
      );
    });

    it('falls back to a placeholder when a Bite photo fails', () => {
      component.onBiteImageError('b-1');

      expect(component.hasBiteImage(bites[0])).toBe(false);
      expect(component.hasBiteImage(bites[1])).toBe(false);
    });
  });

  describe('podium (#2032)', () => {
    const user = (userId: string, biteCount: number): LeaderboardUser => ({
      userId,
      displayName: userId,
      photoUrl: '',
      public: true,
      biteCount,
    });
    const five = [
      user('a', 9),
      user('b', 7),
      user('c', 5),
      user('d', 3),
      user('e', 1),
    ];
    const place = (n: number): HTMLElement =>
      fixture.nativeElement.querySelector(`[data-testid="podium-place-${n}"]`);

    it('puts #1 in the middle, #2 left and #3 right, and lists 4 on below', () => {
      componentRef.setInput('ranking', { board: 'thisWeek', users: five });
      fixture.detectChanges();

      expect(component.podiumSlots().map((slot) => slot.place)).toEqual([
        2, 1, 3,
      ]);
      expect(place(1).textContent).toContain('a');
      expect(place(2).textContent).toContain('b');
      expect(place(3).textContent).toContain('c');

      const badges = Array.from(
        fixture.nativeElement.querySelectorAll('ion-list .rank-badge'),
      ).map((badge) => (badge as HTMLElement).textContent?.trim());
      expect(badges).toEqual(['4', '5']);
    });

    it('opens a public user from the podium', () => {
      const opened: string[] = [];
      component.userClick.subscribe((u) => opened.push(u.userId));
      componentRef.setInput('ranking', { board: 'thisWeek', users: five });
      fixture.detectChanges();

      (place(1).querySelector('button') as HTMLElement).click();

      expect(opened).toEqual(['a']);
    });

    it('highlights the signed-in user, on the podium and in the list', () => {
      componentRef.setInput('currentUserId', 'd');
      componentRef.setInput('ranking', { board: 'thisWeek', users: five });
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelectorAll('.leaderboard-item--own'),
      ).toHaveLength(1);

      componentRef.setInput('currentUserId', 'b');
      fixture.detectChanges();
      expect(place(2).querySelector('.podium__entry--own')).not.toBeNull();
    });

    it('invites onto the open places of a running week', () => {
      componentRef.setInput('ranking', {
        board: 'thisWeek',
        users: [user('a', 1)],
      });
      fixture.detectChanges();

      expect(place(2).querySelector('.podium__entry--open')).not.toBeNull();
      expect(place(3).querySelector('.podium__entry--open')).not.toBeNull();
      expect(component.hasOpenPlace()).toBe(true);
    });

    it('shows the open podium, not the empty text, on an empty running week', () => {
      componentRef.setInput('ranking', { board: 'thisWeek', users: [] });
      fixture.detectChanges();

      expect(component.showsEmptyText()).toBe(false);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="leaderboard-podium"]',
        ),
      ).not.toBeNull();
    });

    it('shows only the places that exist on last week, without an invitation', () => {
      componentRef.setInput('board', 'lastWeek');
      componentRef.setInput('ranking', {
        board: 'lastWeek',
        users: [user('a', 1)],
      });
      fixture.detectChanges();

      expect(place(2).querySelector('.podium__entry--open')).toBeNull();
      expect(component.hasOpenPlace()).toBe(false);

      componentRef.setInput('ranking', { board: 'lastWeek', users: [] });
      fixture.detectChanges();
      expect(component.showsEmptyText()).toBe(true);
    });
  });
});
