import { ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  LeaderboardApiService,
  WEEKLY_LEADERBOARD,
  type WeeklyLeaderboardSnapshot,
} from '../leaderboard-api.service';

// A factory rather than an automock: the plugin object is built by
// `registerPlugin` at import time, so an automock of it has none of the
// methods the listener calls.
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addDocumentSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
  },
}));

type Callback = (event: unknown, error: unknown) => void;

const addDocument = FirebaseFirestore.addDocumentSnapshotListener as jest.Mock;
const removeListener = FirebaseFirestore.removeSnapshotListener as jest.Mock;

const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe(LeaderboardApiService.name, () => {
  let api: LeaderboardApiService;
  let handleError: jest.Mock;
  let deliver: Callback;

  beforeEach(() => {
    addDocument.mockReset();
    removeListener.mockReset().mockResolvedValue(undefined);
    addDocument.mockImplementation((_options, callback: Callback) => {
      deliver = callback;
      return Promise.resolve('listener-1');
    });
    handleError = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    api = TestBed.inject(LeaderboardApiService);
  });

  it('listens to the running week’s board document', () => {
    const subscription = api.weeklyLeaderboard$.subscribe();

    expect(addDocument).toHaveBeenCalledWith(
      { reference: WEEKLY_LEADERBOARD },
      expect.any(Function),
    );
    expect(WEEKLY_LEADERBOARD).toBe('meta/leaderboardWeekly');

    subscription.unsubscribe();
  });

  it('delivers the week and each ranked user’s id and weekly count, in order', () => {
    const boards: WeeklyLeaderboardSnapshot[] = [];
    const subscription = api.weeklyLeaderboard$.subscribe((board) =>
      boards.push(board),
    );

    deliver(
      {
        snapshot: {
          data: {
            week: '2026-11-09',
            users: [
              { userId: 'a', biteCount: 4, displayName: 'A', public: true },
              { userId: 'b', biteCount: 2 },
              { userId: 'broken' },
              null,
            ],
          },
        },
      },
      undefined,
    );

    expect(boards).toEqual([
      {
        week: '2026-11-09',
        users: [
          { userId: 'a', biteCount: 4 },
          { userId: 'b', biteCount: 2 },
        ],
      },
    ]);

    subscription.unsubscribe();
  });

  it('reads a board without a users list as an empty week', () => {
    const boards: WeeklyLeaderboardSnapshot[] = [];
    const subscription = api.weeklyLeaderboard$.subscribe((board) =>
      boards.push(board),
    );

    deliver({ snapshot: { data: { week: '2026-11-16' } } }, undefined);

    expect(boards).toEqual([{ week: '2026-11-16', users: [] }]);

    subscription.unsubscribe();
  });

  it('skips a missing document and reports a listener error', () => {
    const boards: WeeklyLeaderboardSnapshot[] = [];
    const subscription = api.weeklyLeaderboard$.subscribe((board) =>
      boards.push(board),
    );
    const error = new Error('permission-denied');

    deliver({ snapshot: { data: null } }, undefined);
    deliver(null, error);

    expect(boards).toEqual([]);
    expect(handleError).toHaveBeenCalledWith(error);

    subscription.unsubscribe();
  });

  it('removes the listener when the subscription ends', async () => {
    const subscription = api.weeklyLeaderboard$.subscribe();
    await flush();

    subscription.unsubscribe();

    expect(removeListener).toHaveBeenCalledWith({ callbackId: 'listener-1' });
  });
});
