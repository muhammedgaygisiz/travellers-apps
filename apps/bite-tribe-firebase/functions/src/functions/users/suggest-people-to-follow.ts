import { getAuth } from 'firebase-admin/auth';
import {
  DocumentData,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { distanceBetween, geohashQueryBounds, Geopoint } from 'geofire-common';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { isListableBite } from '../shared/utils/bite-listability';
import { loadBlockedUids } from '../shared/utils/user-blocks';
import { readFollowUpConfig } from './new-user-follow-up-picks';
import { isSuggestableProfile, toHttpsUrl, toText } from './suggestable-person';

/**
 * People a user could follow (GitHub issue #1708).
 *
 * A new account starts with an empty Following list and nothing that points
 * at anyone worth following. This answers with a handful of people who post,
 * ranked by how close their Bites are, then by hand, then by how much they
 * post. The rule is owned by `UC - Manage Profile And Social Graph`.
 */

/** How many people one answer carries, at most. */
export const MAX_SUGGESTIONS = 5;

/**
 * How recently a person must have opened the app to be suggested.
 *
 * A follow pays off as a push when the followed person posts, so somebody who
 * stopped using the app is a follow that never sends anything.
 */
export const ACTIVE_WITHIN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The same horizon as the nearby feed in `load-bites-by-location.ts`, so
 * "posts near you" means the Bites the user would see sorted by distance.
 */
const NEARBY_RADIUS_IN_M = 10 * 1000;

/**
 * How many of the most prolific accounts the last tier reads. The ranking is a
 * single-field order, so it needs no composite index; private and inactive
 * accounts are filtered afterwards, which is why it reads more than it keeps.
 */
const ACTIVE_CANDIDATE_LIMIT = 50;

/**
 * How many eligible people are checked against Firebase Auth before the answer
 * is cut to {@link MAX_SUGGESTIONS}, so a blocked account near the top does not
 * leave the list short.
 */
const AUTH_CHECK_LIMIT = MAX_SUGGESTIONS * 2;

export type SuggestionReason = 'nearby' | 'curated' | 'active';

export interface FollowSuggestion {
  userId: string;
  displayName: string;
  photoUrl?: string;
  biteCount: number;
  reason: SuggestionReason;
}

interface SuggestPeopleToFollowRequest {
  latitude?: unknown;
  longitude?: unknown;
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const biteCountOf = (data: DocumentData | undefined): number =>
  typeof data?.['biteCount'] === 'number' ? data['biteCount'] : 0;

/**
 * Whether one profile may be suggested at all, before anything about the
 * viewer is known: public with a name, at least one Bite, and seen recently.
 */
export const isEligibleSuggestion = (
  data: DocumentData | undefined,
  now: number,
): boolean => {
  const lastSeen = data?.['lastSeenTimestamp'];

  return (
    isSuggestableProfile(data) &&
    biteCountOf(data) >= 1 &&
    typeof lastSeen === 'number' &&
    lastSeen >= now - ACTIVE_WITHIN_MS
  );
};

/**
 * Creators of listable Bites around the position, the one with the most Bites
 * there first. A Bite without a creator is a deleted account's and names
 * nobody.
 */
const nearbyCreatorIds = async (
  db: Firestore,
  center: Geopoint,
): Promise<string[]> => {
  const bounds = geohashQueryBounds(center, NEARBY_RADIUS_IN_M);
  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      db
        .collection('bites')
        .where('geohash', '>=', start)
        .where('geohash', '<=', end)
        .orderBy('geohash', 'asc')
        .get(),
    ),
  );

  const counts = new Map<string, number>();

  snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((doc) => doc.data())
    .filter((bite) => {
      const position = bite['position'];

      return (
        isListableBite(bite) &&
        typeof bite['userId'] === 'string' &&
        isValidCoordinate(position?.latitude) &&
        isValidCoordinate(position?.longitude) &&
        distanceBetween([position.latitude, position.longitude], center) *
          1000 <=
          NEARBY_RADIUS_IN_M
      );
    })
    .forEach((bite) => {
      const userId = bite['userId'] as string;

      counts.set(userId, (counts.get(userId) ?? 0) + 1);
    });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([userId]) => userId);
};

const readProfiles = async (
  db: Firestore,
  userIds: string[],
): Promise<Map<string, DocumentData | undefined>> => {
  if (userIds.length === 0) {
    return new Map();
  }

  const snapshots = await db.getAll(
    ...userIds.map((userId) => db.doc(`users/${userId}`)),
  );

  return new Map(
    snapshots.map((snapshot) => [
      snapshot.id,
      snapshot.exists ? snapshot.data() : undefined,
    ]),
  );
};

/**
 * Drops accounts Firebase Auth no longer has or has blocked. A blocked account
 * keeps its public profile document, and suggesting it to a newcomer would
 * advertise exactly the account an operator took out.
 */
const keepEnabledAccounts = async (
  suggestions: FollowSuggestion[],
): Promise<FollowSuggestion[]> => {
  if (suggestions.length === 0) {
    return suggestions;
  }

  const { users } = await getAuth().getUsers(
    suggestions.map(({ userId }) => ({ uid: userId })),
  );
  const enabled = new Set(
    users.filter((user) => !user.disabled).map((user) => user.uid),
  );

  return suggestions.filter(({ userId }) => enabled.has(userId));
};

export const suggestPeopleToFollowFor = async (
  db: Firestore,
  viewerUid: string,
  center: Geopoint | undefined,
  now: number,
): Promise<FollowSuggestion[]> => {
  const [followingSnapshot, blockedUids, nearbyIds, config, activeSnapshot] =
    await Promise.all([
      db.collection(`users/${viewerUid}/following`).get(),
      loadBlockedUids(db, viewerUid),
      center ? nearbyCreatorIds(db, center) : Promise.resolve([]),
      readFollowUpConfig(db),
      db
        .collection('users')
        .orderBy('biteCount', 'desc')
        .limit(ACTIVE_CANDIDATE_LIMIT)
        .get(),
    ]);

  // Nobody the viewer blocked either (GitHub issue #1609): a blocked
  // account appears to the blocker nowhere, and a suggestion to follow it
  // would be the opposite of the boundary they set.
  const excluded = new Set([
    viewerUid,
    ...followingSnapshot.docs.map((doc) => doc.id),
    ...blockedUids,
  ]);

  const activeProfiles = new Map<string, DocumentData>(
    activeSnapshot.docs.map((doc) => [doc.id, doc.data()]),
  );

  const tiers: [SuggestionReason, string[]][] = [
    ['nearby', nearbyIds],
    ['curated', config.userIds],
    ['active', [...activeProfiles.keys()]],
  ];

  const unread = [...new Set([...nearbyIds, ...config.userIds])].filter(
    (userId) => !excluded.has(userId) && !activeProfiles.has(userId),
  );
  const readBack = await readProfiles(db, unread);
  const profileOf = (userId: string): DocumentData | undefined =>
    activeProfiles.get(userId) ?? readBack.get(userId);

  const seen = new Set<string>();
  const candidates: FollowSuggestion[] = [];

  for (const [reason, userIds] of tiers) {
    for (const userId of userIds) {
      if (candidates.length >= AUTH_CHECK_LIMIT) {
        break;
      }

      if (excluded.has(userId) || seen.has(userId)) {
        continue;
      }

      seen.add(userId);

      const profile = profileOf(userId);

      if (!isEligibleSuggestion(profile, now)) {
        continue;
      }

      const photoUrl = toHttpsUrl(profile?.['photoUrl']);

      candidates.push({
        userId,
        displayName: toText(profile?.['displayName']) as string,
        ...(photoUrl ? { photoUrl } : {}),
        biteCount: biteCountOf(profile),
        reason,
      });
    }
  }

  return (await keepEnabledAccounts(candidates)).slice(0, MAX_SUGGESTIONS);
};

export const suggestPeopleToFollow = onAppCheck<SuggestPeopleToFollowRequest>(
  async (request) => {
    requireMember(request, 'You must be signed in to get suggestions.');

    const { latitude, longitude } = request.data ?? {};
    const hasPosition = latitude !== undefined || longitude !== undefined;

    if (
      hasPosition &&
      (!isValidCoordinate(latitude) || !isValidCoordinate(longitude))
    ) {
      throw new HttpsError(
        'invalid-argument',
        'latitude and longitude must both be numbers when given.',
      );
    }

    return suggestPeopleToFollowFor(
      getFirestore(),
      request.auth.uid,
      hasPosition ? [latitude as number, longitude as number] : undefined,
      Date.now(),
    );
  },
);
