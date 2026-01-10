import { Bite } from 'model';
import { distanceBetween, geohashQueryBounds, Geopoint } from 'geofire-common';
import {
  DocumentData,
  FirebaseFirestore,
  GetCollectionResult,
} from '@capacitor-firebase/firestore';
import { BITE_COLLECTION, DEFAULT_SEARCH_RADIUS_IN_M } from './constants';
import { toBite } from '../../utils/to-bite';

const querySingleBound = (
  b: [string, string],
): Promise<GetCollectionResult<DocumentData>> => {
  return new Promise((resolve) => {
    FirebaseFirestore.getCollection({
      reference: BITE_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'geohash',
            opStr: '>=',
            value: b[0],
          },
          {
            type: 'where',
            fieldPath: 'geohash',
            opStr: '<=',
            value: b[1],
          },
        ],
      },
      queryConstraints: [
        {
          type: 'orderBy',
          fieldPath: 'geohash',
          directionStr: 'asc',
        },
      ],
    })
      .then((data) => resolve(data))
      .catch(() => resolve({ snapshots: [] }));
  });
};

export const loadBitesByLocation = async (
  position?: GeolocationPosition,
): Promise<Bite[]> => {
  const coords = position?.coords;

  if (coords) {
    const matchingBites: Bite[] = [];
    const center: Geopoint = [coords.latitude, coords.longitude];
    const bounds = geohashQueryBounds(center, DEFAULT_SEARCH_RADIUS_IN_M);

    const promises: Promise<GetCollectionResult<DocumentData>>[] = [];
    for (const b of bounds) {
      promises.push(querySingleBound(b));
    }

    const snapshots = await Promise.all(promises);

    for (const snapshot of snapshots) {
      for (const document of snapshot.snapshots) {
        const bite = toBite(document);
        const position = bite.position;

        const distanceInKm = distanceBetween(
          [position.latitude, position.longitude],
          center,
        );
        const distanceInM = distanceInKm * 1000;
        if (distanceInM <= DEFAULT_SEARCH_RADIUS_IN_M) {
          matchingBites.push(bite);
        }
      }
    }

    return matchingBites;
  }

  return [];
};
