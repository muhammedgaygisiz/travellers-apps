import { Injectable, resource, signal } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { PublicUser } from 'model';

export type LeaderboardUser = Pick<
  PublicUser,
  'userId' | 'displayName' | 'photoUrl' | 'city' | 'public' | 'biteCount'
> &
  Required<Pick<PublicUser, 'biteCount'>>;

/**
 * The rankings the leaderboard shows (issue #2027): the running week (the
 * default), last week's frozen final standings, and all time. `mostLiked`
 * and `mostLikedLastWeek` rank Bites by the likes they received in the
 * running and the previous week (issue #2028).
 */
export type LeaderboardBoard =
  'thisWeek' | 'lastWeek' | 'allTime' | 'mostLiked' | 'mostLikedLastWeek';

/**
 * The country rankings (issue #2043): the running week, last week frozen at
 * the reset, and all time.
 */
export type CountryBoard =
  'countries' | 'countriesLastWeek' | 'countriesAllTime';

/** One country on a country ranking. */
export interface RankedCountry {
  countryCode: string;
  biteCount: number;
}

/** One country ranking as `loadLeaderboard` returns it. */
export interface CountryRanking {
  board: CountryBoard;
  countries: RankedCountry[];
  start?: number;
  end?: number;
}

/** One Bite on a Most liked board. */
export interface MostLikedBite {
  biteId: string;
  name: string;
  imageUrl: string;
  userId: string;
  displayName: string;
  likeCount: number;
}

/** One ranking as `loadLeaderboard` returns it for a named board. */
export interface LeaderboardRanking {
  board: LeaderboardBoard;
  users: LeaderboardUser[];
  /** The ranked Bites; only on the two Most liked boards. */
  bites?: MostLikedBite[];
  /** The week's bounds in epoch ms; absent on the all-time board. */
  start?: number;
  end?: number;
}

const emptyRanking = (board: LeaderboardBoard): LeaderboardRanking => ({
  board,
  users: [],
});

@Injectable({ providedIn: 'root' })
export class LeaderboardDataAccessService {
  readonly board = signal<LeaderboardBoard>('thisWeek');

  // The call is caught below, so this resource never enters an error state and
  // `ranking.value()` is safe to read straight from the template — unlike the
  // resources audited in GitHub issue #1232.
  async loadRanking(board: LeaderboardBoard): Promise<LeaderboardRanking> {
    try {
      const result = await FirebaseFunctions.callByName<
        { board: LeaderboardBoard },
        LeaderboardRanking | LeaderboardUser[]
      >({
        name: 'loadLeaderboard',
        data: { board },
      });
      const data = result.data;

      // A function deployed before the weekly board ignores `board` and
      // answers with the all-time users as a bare array.
      if (Array.isArray(data)) {
        return { board: 'allTime', users: data };
      }

      return data ?? emptyRanking(board);
    } catch {
      return emptyRanking(board);
    }
  }

  readonly countryBoard = signal<CountryBoard>('countries');

  /** Loads a country ranking; a failure reads as an empty one. */
  async loadCountries(board: CountryBoard): Promise<CountryRanking> {
    try {
      const result = await FirebaseFunctions.callByName<
        { board: CountryBoard },
        CountryRanking
      >({
        name: 'loadLeaderboard',
        data: { board },
      });

      return result.data?.countries ? result.data : { board, countries: [] };
    } catch {
      return { board, countries: [] };
    }
  }

  countryRanking = resource({
    params: () => ({ board: this.countryBoard() }),
    loader: ({ params }) => this.loadCountries(params.board),
    defaultValue: { board: 'countries', countries: [] } as CountryRanking,
  });

  ranking = resource({
    params: () => ({ board: this.board() }),
    loader: ({ params }) => this.loadRanking(params.board),
    defaultValue: emptyRanking('thisWeek'),
  });
}
