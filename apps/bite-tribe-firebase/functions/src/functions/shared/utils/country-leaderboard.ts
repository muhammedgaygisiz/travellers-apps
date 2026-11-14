import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  BITE_COUNTRIES_DOCUMENT,
  BITE_COUNTRIES_FIELD,
} from './bite-countries';
import { LEADERBOARD_LIMIT, META_COLLECTION } from './leaderboard';
import { normalizeCountryCode } from './user-country-codes';
import {
  LeaderboardWeek,
  previousWeekOf,
  weekKey,
  weekOf,
} from './weekly-leaderboard';

const BITES_COLLECTION = 'bites';

/** The running week's country ranking, cached (issue #2043). */
export const LEADERBOARD_COUNTRIES_DOC = 'leaderboardCountries';
/** Last week's country ranking, frozen at the Monday reset. */
export const LEADERBOARD_COUNTRIES_LAST_WEEK_DOC =
  'leaderboardCountriesLastWeek';
/** The all-time country ranking, cached. */
export const LEADERBOARD_COUNTRIES_ALL_TIME_DOC = 'leaderboardCountriesAllTime';

/**
 * How long a computed ranking is served before it is computed again. The
 * country of a Bite is only known seconds after it is posted, and its photo
 * may still be uploading, so a ranking computed on read and kept briefly is
 * simpler and as current as one rebuilt by triggers.
 */
export const WEEK_CACHE_MS = 5 * 60 * 1000;
export const ALL_TIME_CACHE_MS = 60 * 60 * 1000;

/** States in which a Bite is not shown to other people (issue #1717). */
const UNLISTED_IMAGE_STATES = ['pending', 'failed'];

/** One country on the ranking: its code and how many Bites are in it. */
export interface RankedCountry {
  countryCode: string;
  biteCount: number;
}

export interface CountryBoard {
  /** The week's Monday as `YYYY-MM-DD`; absent on the all-time board. */
  week?: string;
  start?: number;
  end?: number;
  countries: RankedCountry[];
  /** When the ranking was computed, epoch ms. */
  computedAt: number;
}

/** A Bite as the country tally needs it. */
export interface CountryBite {
  countryCode?: unknown;
  imageStatus?: unknown;
}

/**
 * Counts listable Bites per country and keeps the top
 * {@link LEADERBOARD_LIMIT}. A Bite whose country is not resolved yet, or
 * whose photo is still uploading or failed, does not count. A tie is ordered
 * by country code, so the order is stable between reads.
 */
export const tallyCountries = (bites: CountryBite[]): RankedCountry[] => {
  const counts = new Map<string, number>();

  for (const bite of bites) {
    const code = normalizeCountryCode(bite.countryCode);

    if (!code || UNLISTED_IMAGE_STATES.includes(bite.imageStatus as string)) {
      continue;
    }

    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  return rankCountries(
    [...counts].map(([countryCode, biteCount]) => ({ countryCode, biteCount })),
  );
};

const rankCountries = (countries: RankedCountry[]): RankedCountry[] =>
  countries
    .filter((country) => country.biteCount > 0)
    .sort(
      (a, b) =>
        b.biteCount - a.biteCount || a.countryCode.localeCompare(b.countryCode),
    )
    .slice(0, LEADERBOARD_LIMIT);

/** The country ranking of one week, from the Bites created in it. */
export const collectWeekCountries = async (
  db: Firestore,
  week: LeaderboardWeek,
): Promise<RankedCountry[]> => {
  const snapshot = await db
    .collection(BITES_COLLECTION)
    .where('createdAtTimestamp', '>=', week.start)
    .where('createdAtTimestamp', '<', week.end)
    .get();

  return tallyCountries(snapshot.docs.map((doc) => doc.data() as CountryBite));
};

/**
 * The all-time ranking: for every country `meta/biteCountries` lists, the
 * number of its listable Bites, as `count()` aggregations rather than reads -
 * a country with a thousand Bites costs one read, not a thousand.
 */
export const collectAllTimeCountries = async (
  db: Firestore,
): Promise<RankedCountry[]> => {
  const listed = (
    await db.collection(META_COLLECTION).doc(BITE_COUNTRIES_DOCUMENT).get()
  ).data()?.[BITE_COUNTRIES_FIELD];
  const codes = Array.isArray(listed)
    ? [...new Set(listed.map(normalizeCountryCode).filter(Boolean))]
    : [];

  const countries = await Promise.all(
    (codes as string[]).map(async (countryCode) => {
      const inCountry = db
        .collection(BITES_COLLECTION)
        .where('countryCode', '==', countryCode);
      const [all, unlisted] = await Promise.all([
        inCountry.count().get(),
        inCountry
          .where('imageStatus', 'in', UNLISTED_IMAGE_STATES)
          .count()
          .get(),
      ]);

      return {
        countryCode,
        biteCount: all.data().count - unlisted.data().count,
      };
    }),
  );

  return rankCountries(countries);
};

const readBoard = async (
  db: Firestore,
  docId: string,
): Promise<CountryBoard | null> => {
  const data = (await db.collection(META_COLLECTION).doc(docId).get()).data();

  return data && Array.isArray(data['countries'])
    ? (data as CountryBoard)
    : null;
};

const storeBoard = async (
  db: Firestore,
  docId: string,
  board: CountryBoard,
): Promise<CountryBoard> => {
  await db
    .collection(META_COLLECTION)
    .doc(docId)
    .set({ ...board, updatedAt: FieldValue.serverTimestamp() });

  logger.info('country leaderboard computed', {
    docId,
    week: board.week,
    countries: board.countries.length,
  });

  return board;
};

const weekBoard = (
  week: LeaderboardWeek,
  countries: RankedCountry[],
  now: number,
): CountryBoard => ({
  week: weekKey(week),
  start: week.start,
  end: week.end,
  countries,
  computedAt: now,
});

/** The running week's ranking, served from cache for {@link WEEK_CACHE_MS}. */
export const readWeekCountries = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<CountryBoard> => {
  const week = weekOf(now);
  const stored = await readBoard(db, LEADERBOARD_COUNTRIES_DOC);

  if (
    stored?.week === weekKey(week) &&
    now - stored.computedAt < WEEK_CACHE_MS
  ) {
    return stored;
  }

  return storeBoard(
    db,
    LEADERBOARD_COUNTRIES_DOC,
    weekBoard(week, await collectWeekCountries(db, week), now),
  );
};

/**
 * Last week's ranking, frozen: computed once, at the reset or on the first
 * read after it, and never again.
 */
export const freezeCountriesLastWeek = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<CountryBoard> => {
  const week = previousWeekOf(now);
  const stored = await readBoard(db, LEADERBOARD_COUNTRIES_LAST_WEEK_DOC);

  if (stored?.week === weekKey(week)) {
    return stored;
  }

  return storeBoard(
    db,
    LEADERBOARD_COUNTRIES_LAST_WEEK_DOC,
    weekBoard(week, await collectWeekCountries(db, week), now),
  );
};

/** The all-time ranking, served from cache for {@link ALL_TIME_CACHE_MS}. */
export const readAllTimeCountries = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<CountryBoard> => {
  const stored = await readBoard(db, LEADERBOARD_COUNTRIES_ALL_TIME_DOC);

  if (stored && now - stored.computedAt < ALL_TIME_CACHE_MS) {
    return stored;
  }

  return storeBoard(db, LEADERBOARD_COUNTRIES_ALL_TIME_DOC, {
    countries: await collectAllTimeCountries(db),
    computedAt: now,
  });
};
