import {
  distanceBetween,
  geohashForLocation,
  geohashQueryBounds,
  Geopoint,
} from 'geofire-common';
import type { RestaurantCandidateEvidence } from '../model/restaurant-candidate';

export const RESTAURANT_CANDIDATE_RADIUS_IN_M = 200;
const DEFAULT_MATCH_SCORE = 0.82;

export interface CandidatePosition {
  latitude: number;
  longitude: number;
}

export interface CandidateBite {
  id: string;
  place?: string;
  position?: CandidatePosition;
  imagePath?: string;
  rating?: number;
}

export interface CandidateRestaurant {
  id: string;
  name?: string;
  position?: CandidatePosition;
}

export interface PendingCandidate {
  id: string;
  name?: string;
  normalizedName?: string;
  status?: string;
  position?: CandidatePosition;
}

export interface RestaurantCandidateDraft {
  name: string;
  normalizedName: string;
  position: CandidatePosition;
  geohash: string;
  biteIds: string[];
  evidence: RestaurantCandidateEvidence;
}

export interface RestaurantCandidateDuplicate<T> {
  item: T;
  distanceInM: number;
  score: number;
}

const isValidPosition = (
  position?: CandidatePosition,
): position is CandidatePosition =>
  !!position &&
  Number.isFinite(position.latitude) &&
  Number.isFinite(position.longitude);

export const normalizePlaceName = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const getEditDistance = (left: string, right: string): number => {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 0; leftIndex < left.length; leftIndex++) {
    let lastDiagonal = previous[0];
    previous[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < right.length; rightIndex++) {
      const oldDiagonal = previous[rightIndex + 1];
      const cost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      previous[rightIndex + 1] = Math.min(
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + 1,
        lastDiagonal + cost,
      );
      lastDiagonal = oldDiagonal;
    }
  }

  return previous[right.length];
};

export const getPlaceNameMatchScore = (left: string, right: string): number => {
  const normalizedLeft = normalizePlaceName(left);
  const normalizedRight = normalizePlaceName(right);

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  const editDistance = getEditDistance(normalizedLeft, normalizedRight);

  return (maxLength - editDistance) / maxLength;
};

export const isFuzzyPlaceNameMatch = (
  left: string,
  right: string,
  minimumScore = DEFAULT_MATCH_SCORE,
): boolean => getPlaceNameMatchScore(left, right) >= minimumScore;

export const planRestaurantCandidateGeohashBounds = (
  center: CandidatePosition,
  radiusInM = RESTAURANT_CANDIDATE_RADIUS_IN_M,
): [string, string][] =>
  geohashQueryBounds([center.latitude, center.longitude], radiusInM);

export const getDistanceInM = (
  left: CandidatePosition,
  right: CandidatePosition,
): number =>
  distanceBetween(
    [left.latitude, left.longitude] as Geopoint,
    [right.latitude, right.longitude] as Geopoint,
  ) * 1000;

export const filterWithinRestaurantCandidateRadius = <T>(
  items: T[],
  center: CandidatePosition,
  getPosition: (item: T) => CandidatePosition | undefined,
  radiusInM = RESTAURANT_CANDIDATE_RADIUS_IN_M,
): T[] =>
  items.filter((item) => {
    const position = getPosition(item);
    return (
      isValidPosition(position) && getDistanceInM(position, center) <= radiusInM
    );
  });

export const filterMatchingBitesForCandidate = (
  bites: CandidateBite[],
  placeName: string,
  center: CandidatePosition,
): CandidateBite[] =>
  filterWithinRestaurantCandidateRadius(
    bites,
    center,
    (bite) => bite.position,
  ).filter((bite) => isFuzzyPlaceNameMatch(bite.place ?? '', placeName));

const getRepresentativePosition = (
  bites: CandidateBite[],
): CandidatePosition => {
  const positions = bites.map((bite) => bite.position).filter(isValidPosition);
  const sum = positions.reduce(
    (total, position) => ({
      latitude: total.latitude + position.latitude,
      longitude: total.longitude + position.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: sum.latitude / positions.length,
    longitude: sum.longitude / positions.length,
  };
};

export const aggregateRestaurantCandidateEvidence = (
  bites: CandidateBite[],
  fallbackPlaceName: string,
  fallbackPosition: CandidatePosition,
): RestaurantCandidateDraft => {
  const biteIds = [...new Set(bites.map((bite) => bite.id))];
  const placeNames = bites.reduce<Record<string, number>>((result, bite) => {
    const place = bite.place?.trim();

    if (place) {
      result[place] = (result[place] ?? 0) + 1;
    }

    return result;
  }, {});
  const ratings = bites
    .map((bite) => bite.rating)
    .filter((rating): rating is number => typeof rating === 'number');
  const imagePaths = [
    ...new Set(
      bites
        .map((bite) => bite.imagePath)
        .filter((imagePath): imagePath is string => !!imagePath),
    ),
  ];
  const name =
    Object.entries(placeNames).sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0] ?? fallbackPlaceName;
  const position = bites.some((bite) => isValidPosition(bite.position))
    ? getRepresentativePosition(bites)
    : fallbackPosition;

  return {
    name,
    normalizedName: normalizePlaceName(name),
    position,
    geohash: geohashForLocation([position.latitude, position.longitude]),
    biteIds,
    evidence: {
      biteCount: biteIds.length,
      placeNames,
      ...(ratings.length
        ? {
            averageRating:
              ratings.reduce((total, rating) => total + rating, 0) /
              ratings.length,
          }
        : {}),
      ...(imagePaths.length ? { imagePaths } : {}),
    },
  };
};

const findNearbyDuplicate = <T extends CandidateRestaurant | PendingCandidate>(
  items: T[],
  placeName: string,
  center: CandidatePosition,
  getName: (item: T) => string,
): RestaurantCandidateDuplicate<T> | undefined =>
  items
    .filter((item) => isValidPosition(item.position))
    .map((item) => ({
      item,
      distanceInM: getDistanceInM(item.position as CandidatePosition, center),
      score: getPlaceNameMatchScore(getName(item), placeName),
    }))
    .filter(
      (match) =>
        match.distanceInM <= RESTAURANT_CANDIDATE_RADIUS_IN_M &&
        match.score >= DEFAULT_MATCH_SCORE,
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.distanceInM - right.distanceInM,
    )[0];

export const findVerifiedRestaurantDuplicate = (
  restaurants: CandidateRestaurant[],
  placeName: string,
  center: CandidatePosition,
): RestaurantCandidateDuplicate<CandidateRestaurant> | undefined =>
  findNearbyDuplicate(
    restaurants,
    placeName,
    center,
    (restaurant) => restaurant.name ?? '',
  );

export const findPendingRestaurantCandidateDuplicate = (
  candidates: PendingCandidate[],
  placeName: string,
  center: CandidatePosition,
): RestaurantCandidateDuplicate<PendingCandidate> | undefined =>
  findNearbyDuplicate(
    candidates.filter((candidate) => candidate.status === 'pending'),
    placeName,
    center,
    (candidate) => candidate.normalizedName ?? candidate.name ?? '',
  );
