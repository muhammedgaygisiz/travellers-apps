import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { Restaurant } from 'model';
import {
  BITE_COLLECTION,
  BITE_PLACES_LIMIT,
  RESTAURANT_CANDIDATES_COLLECTION,
  RESTAURANT_CANDIDATES_LIMIT,
  RestaurantsDataAccessService,
} from '../restaurants-data-access.service';

jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class BiteTribeStoreService {},
}));

type FirestoreCollection = Awaited<
  ReturnType<typeof FirebaseFirestore.getCollection>
>;
type FirestoreDocument = Awaited<
  ReturnType<typeof FirebaseFirestore.getDocument>
>;

/**
 * The candidate and Bite-place reads, moved out of the business dashboard's
 * data-access with issue #1473. Their assertions moved with them rather than
 * being dropped.
 */
describe(RestaurantsDataAccessService.name, () => {
  let service: RestaurantsDataAccessService;
  let storeServiceMock: {
    restaurantToCreate$: ReturnType<typeof of<undefined>>;
    logout: jest.Mock;
    selectRestaurantToCreate: jest.Mock;
    saveNewRestaurant: jest.Mock;
  };
  let apiMock: {
    searchPlaces: jest.Mock;
    getPlaceDetails: jest.Mock;
    saveRestaurantImage: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    storeServiceMock = {
      restaurantToCreate$: of(undefined),
      logout: jest.fn(),
      selectRestaurantToCreate: jest.fn(),
      saveNewRestaurant: jest.fn(),
    };

    apiMock = {
      searchPlaces: jest.fn(),
      getPlaceDetails: jest.fn(),
      saveRestaurantImage: jest.fn().mockResolvedValue(undefined),
    };

    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
      data: {
        restaurantId: 'restaurant-1',
        menuId: 'menu-1',
        candidateId: 'candidate-1',
        status: 'created',
      },
    });

    TestBed.configureTestingModule({
      providers: [
        RestaurantsDataAccessService,
        { provide: BiteTribeStoreService, useValue: storeServiceMock },
        { provide: BiteTribeApiService, useValue: apiMock },
      ],
    });

    service = TestBed.inject(RestaurantsDataAccessService);
  });

  describe('bitePlacesLoader', () => {
    it('should load unique Bite places with the unassigned Bites behind each', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          { id: 'bite-1', data: { place: 'Pizza Palace' } },
          { id: 'bite-2', data: { place: 'Pizza Palace' } },
          { id: 'bite-3', data: { place: 'Cafe Central' } },
          { id: 'bite-4', data: { place: '' } },
        ],
      } as unknown as FirestoreCollection);

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.bitePlacesLoader({} as never);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: BITE_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'restaurantId',
              opStr: '==',
              value: '',
            },
          ],
        },
        queryConstraints: [
          {
            type: 'limit',
            limit: BITE_PLACES_LIMIT,
          },
        ],
      });
      expect(result).toEqual([
        { place: 'Pizza Palace', biteIds: ['bite-1', 'bite-2'] },
        { place: 'Cafe Central', biteIds: ['bite-3'] },
      ]);
    });

    it('should return an empty list when Bite place snapshots are missing', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({} as unknown as FirestoreCollection);

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.bitePlacesLoader({} as never);

      expect(result).toEqual([]);
    });
  });

  describe('restaurantCandidatesLoader', () => {
    const pendingOnly = {
      type: 'and',
      queryConstraints: [
        {
          type: 'where',
          fieldPath: 'status',
          opStr: '==',
          value: 'pending',
        },
      ],
    };

    const candidateDoc = (
      id: string,
      data: Record<string, unknown> = {},
    ): { id: string; data: Record<string, unknown> } => ({
      id,
      data: {
        name: id,
        status: 'pending',
        biteIds: [],
        evidence: { biteCount: 1 },
        createdAtTimestamp: 1,
        ...data,
      },
    });

    const isOrderedQuery = (options: unknown): boolean =>
      (
        options as { queryConstraints: { type: string }[] }
      ).queryConstraints.some(({ type }) => type === 'orderBy');

    /** Answers the ordered read and the unordered fallback separately. */
    const mockCandidateReads = (
      ordered: ReturnType<typeof candidateDoc>[],
      unordered: ReturnType<typeof candidateDoc>[] = ordered,
    ): void => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockImplementation(
        async (options) =>
          ({
            snapshots: isOrderedQuery(options) ? ordered : unordered,
          }) as unknown as FirestoreCollection,
      );
    };

    it('should order pending candidates by evidence, then newest first, reading one past the limit', async () => {
      mockCandidateReads([]);

      const service = TestBed.inject(RestaurantsDataAccessService);
      await service.restaurantCandidatesLoader({} as never);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: RESTAURANT_CANDIDATES_COLLECTION,
        compositeFilter: pendingOnly,
        queryConstraints: [
          {
            type: 'orderBy',
            fieldPath: 'evidence.biteCount',
            directionStr: 'desc',
          },
          {
            type: 'orderBy',
            fieldPath: 'createdAtTimestamp',
            directionStr: 'desc',
          },
          { type: 'limit', limit: RESTAURANT_CANDIDATES_LIMIT + 1 },
        ],
      });
      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: RESTAURANT_CANDIDATES_COLLECTION,
        compositeFilter: pendingOnly,
        queryConstraints: [
          { type: 'limit', limit: RESTAURANT_CANDIDATES_LIMIT + 1 },
        ],
      });
    });

    it('should load the pending restaurant candidates with Bite evidence', async () => {
      mockCandidateReads([
        candidateDoc('candidate-1', {
          name: 'Pizza Palace',
          biteIds: ['bite-1', 'bite-2'],
        }),
      ]);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValueOnce({
          snapshot: {
            id: 'bite-1',
            data: { name: 'Margherita', place: 'Pizza Palace' },
          },
        } as unknown as FirestoreDocument)
        .mockResolvedValueOnce({
          snapshot: {
            id: 'bite-2',
            data: { name: 'Calzone', place: 'Pizza Palace' },
          },
        } as unknown as FirestoreDocument);

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: `${BITE_COLLECTION}/bite-1`,
      });
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: `${BITE_COLLECTION}/bite-2`,
      });
      expect(result).toEqual({
        candidates: [
          {
            id: 'candidate-1',
            name: 'Pizza Palace',
            status: 'pending',
            biteIds: ['bite-1', 'bite-2'],
            evidence: { biteCount: 1 },
            createdAtTimestamp: 1,
            bites: [
              {
                id: 'bite-1',
                name: 'Margherita',
                place: 'Pizza Palace',
              },
              {
                id: 'bite-2',
                name: 'Calzone',
                place: 'Pizza Palace',
              },
            ],
          },
        ],
        hasMore: false,
      });
    });

    it('should keep the order the query returned', async () => {
      mockCandidateReads([
        candidateDoc('zebra-grill', {
          evidence: { biteCount: 7 },
          createdAtTimestamp: 1,
        }),
        candidateDoc('newer-cafe', {
          evidence: { biteCount: 5 },
          createdAtTimestamp: 20,
        }),
        candidateDoc('older-cafe', {
          evidence: { biteCount: 5 },
          createdAtTimestamp: 10,
        }),
      ]);

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(result?.candidates.map(({ id }) => id)).toEqual([
        'zebra-grill',
        'newer-cafe',
        'older-cafe',
      ]);
    });

    it('should keep at most the limit and say more are pending when one more came back', async () => {
      const docs = Array.from(
        { length: RESTAURANT_CANDIDATES_LIMIT + 1 },
        (_, index) =>
          candidateDoc(`candidate-${index}`, { biteIds: [`bite-${index}`] }),
      );
      mockCandidateReads(docs);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({ snapshot: null } as unknown as FirestoreDocument);

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(result?.candidates).toHaveLength(RESTAURANT_CANDIDATES_LIMIT);
      expect(result?.hasMore).toBe(true);
      // The extra candidate is a signal, not a row: its Bites are not read.
      expect(FirebaseFirestore.getDocument).not.toHaveBeenCalledWith({
        reference: `${BITE_COLLECTION}/bite-${RESTAURANT_CANDIDATES_LIMIT}`,
      });
    });

    it('should not say more are pending when every candidate is shown', async () => {
      mockCandidateReads(
        Array.from({ length: RESTAURANT_CANDIDATES_LIMIT }, (_, index) =>
          candidateDoc(`candidate-${index}`),
        ),
      );

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(result?.candidates).toHaveLength(RESTAURANT_CANDIDATES_LIMIT);
      expect(result?.hasMore).toBe(false);
    });

    it('should list a candidate the ordered read leaves out for lacking an ordered field, after the ordered ones', async () => {
      const ordered = candidateDoc('ordered-cafe');
      const noBiteCount = candidateDoc('no-count-cafe', { evidence: {} });
      const noCreatedAt = candidateDoc('no-created-cafe', {
        createdAtTimestamp: undefined,
      });
      mockCandidateReads([ordered], [noBiteCount, ordered, noCreatedAt]);

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(result?.candidates.map(({ id }) => id)).toEqual([
        'ordered-cafe',
        'no-count-cafe',
        'no-created-cafe',
      ]);
    });

    it('should return an empty list when no pending candidate snapshots are found', async () => {
      mockCandidateReads([]);

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(result).toEqual({ candidates: [], hasMore: false });
      expect(FirebaseFirestore.getDocument).not.toHaveBeenCalled();
    });

    it('should omit missing Bite evidence documents from candidates', async () => {
      mockCandidateReads([
        candidateDoc('candidate-1', {
          name: 'Pizza Palace',
          biteIds: ['bite-1', 'missing-bite'],
        }),
      ]);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValueOnce({
          snapshot: {
            id: 'bite-1',
            data: { name: 'Margherita', place: 'Pizza Palace' },
          },
        } as unknown as FirestoreDocument)
        .mockResolvedValueOnce({
          snapshot: {
            id: 'missing-bite',
          },
        } as unknown as FirestoreDocument);

      const service = TestBed.inject(RestaurantsDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(result?.candidates[0].bites).toEqual([
        {
          id: 'bite-1',
          name: 'Margherita',
          place: 'Pizza Palace',
        },
      ]);
    });

    describe('paging (issue #1507)', () => {
      const startAfterOf = (options: unknown): string | undefined =>
        (
          options as {
            queryConstraints: { type: string; reference?: string }[];
          }
        ).queryConstraints.find(({ type }) => type === 'startAfter')?.reference;

      it('should read the first page without a cursor', async () => {
        mockCandidateReads([]);

        await service.restaurantCandidatesLoader({
          params: undefined,
        } as never);

        jest
          .mocked(FirebaseFirestore.getCollection)
          .mock.calls.forEach(([options]) =>
            expect(startAfterOf(options)).toBeUndefined(),
          );
      });

      it('should resume the ordered read after the last candidate an earlier page rendered', async () => {
        mockCandidateReads([]);

        await service.restaurantCandidatesLoader({
          params: { afterId: 'candidate-4' },
        } as never);

        expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
          reference: RESTAURANT_CANDIDATES_COLLECTION,
          compositeFilter: pendingOnly,
          queryConstraints: [
            {
              type: 'orderBy',
              fieldPath: 'evidence.biteCount',
              directionStr: 'desc',
            },
            {
              type: 'orderBy',
              fieldPath: 'createdAtTimestamp',
              directionStr: 'desc',
            },
            {
              type: 'startAfter',
              reference: `${RESTAURANT_CANDIDATES_COLLECTION}/candidate-4`,
            },
            { type: 'limit', limit: RESTAURANT_CANDIDATES_LIMIT + 1 },
          ],
        });
      });

      it('should point the next page after the last candidate it rendered', async () => {
        mockCandidateReads(
          Array.from({ length: RESTAURANT_CANDIDATES_LIMIT + 1 }, (_, index) =>
            candidateDoc(`candidate-${index}`),
          ),
        );

        const result = await service.restaurantCandidatesLoader({} as never);

        expect(result?.next).toEqual({
          afterId: `candidate-${RESTAURANT_CANDIDATES_LIMIT - 1}`,
          unorderableShown: 0,
        });
        // Only the last ordered page can gain a row from the fallback.
        expect(FirebaseFirestore.getCollection).toHaveBeenCalledTimes(1);
      });

      it('should not offer a next page on the last one', async () => {
        mockCandidateReads([candidateDoc('candidate-1')]);

        const result = await service.restaurantCandidatesLoader({
          params: { afterId: 'candidate-0' },
        } as never);

        expect(result?.hasMore).toBe(false);
        expect(result?.next).toBeUndefined();
      });

      /**
       * The acceptance criterion itself: repeat "next" from the first page and
       * every pending candidate is rendered exactly once. Equal evidence and
       * equal timestamps are the case a cursor on the two values alone would
       * get wrong at a page boundary; the document cursor breaks the tie by id.
       */
      it('should reach every pending candidate exactly once, ties included', async () => {
        const pending = Array.from({ length: 13 }, (_, index) =>
          candidateDoc(`candidate-${String(index).padStart(2, '0')}`, {
            evidence: { biteCount: 9 - Math.floor(index / 4) },
            createdAtTimestamp: 100 - Math.floor(index / 2),
            biteIds: [`bite-${index}`],
          }),
        );
        // First by document id, so the bounded fallback read reaches it.
        const noCreatedAt = candidateDoc('aa-unorderable', {
          createdAtTimestamp: undefined,
          biteIds: ['bite-unorderable'],
        });
        jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockImplementation(async (options) => {
            const limit = (
              options as { queryConstraints: { limit?: number }[] }
            ).queryConstraints.at(-1)?.limit as number;

            if (!isOrderedQuery(options)) {
              return {
                snapshots: [noCreatedAt, ...pending].slice(0, limit),
              } as unknown as FirestoreCollection;
            }

            const after = startAfterOf(options)?.split('/')[1];
            const from = after
              ? pending.findIndex(({ id }) => id === after) + 1
              : 0;

            return {
              snapshots: pending.slice(from, from + limit),
            } as unknown as FirestoreCollection;
          });
        jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
          snapshot: null,
        } as unknown as FirestoreDocument);

        const seen: string[] = [];
        let params: unknown;
        let pages = 0;

        do {
          jest.mocked(FirebaseFirestore.getDocument).mockClear();
          const page = await service.restaurantCandidatesLoader({
            params,
          } as never);
          const ids = page?.candidates.map(({ id }) => id) ?? [];

          expect(ids.length).toBeLessThanOrEqual(RESTAURANT_CANDIDATES_LIMIT);
          // Bites are read for the rendered page and nothing else.
          expect(
            jest
              .mocked(FirebaseFirestore.getDocument)
              .mock.calls.map(([{ reference }]) => reference)
              .sort(),
          ).toEqual(
            (page?.candidates ?? [])
              .flatMap(({ biteIds }) => biteIds ?? [])
              .map((biteId) => `${BITE_COLLECTION}/${biteId}`)
              .sort(),
          );

          seen.push(...ids);
          params = page?.hasMore ? page.next : undefined;
          pages += 1;
        } while (params && pages < 10);

        expect(seen).toEqual([
          ...pending.map(({ id }) => id),
          'aa-unorderable',
        ]);
        expect(pages).toBe(3);
      });

      it('should carry on with the unorderable candidates that did not fit on the last ordered page', async () => {
        const unorderable = Array.from({ length: 3 }, (_, index) =>
          candidateDoc(`unorderable-${index}`, { evidence: {} }),
        );
        mockCandidateReads(
          Array.from({ length: RESTAURANT_CANDIDATES_LIMIT - 1 }, (_, index) =>
            candidateDoc(`candidate-${index}`),
          ),
          unorderable,
        );

        const lastOrdered = await service.restaurantCandidatesLoader(
          {} as never,
        );

        expect(lastOrdered?.candidates.at(-1)?.id).toBe('unorderable-0');
        expect(lastOrdered?.next).toEqual({
          afterId: `candidate-${RESTAURANT_CANDIDATES_LIMIT - 2}`,
          unorderableShown: 1,
        });

        mockCandidateReads([], unorderable);
        const rest = await service.restaurantCandidatesLoader({
          params: lastOrdered?.next,
        } as never);

        expect(rest?.candidates.map(({ id }) => id)).toEqual([
          'unorderable-1',
          'unorderable-2',
        ]);
        expect(rest?.hasMore).toBe(false);
      });
    });

    /**
     * A filter on `status` with an order on other fields needs a composite
     * index, and without one the read fails at runtime naming the index it
     * wants. This proves the declaration exists, not that it is deployed.
     */
    it('should have the composite index its ordered read needs declared', () => {
      const indexes = JSON.parse(
        readFileSync(
          join(
            __dirname,
            '../../../../../../..',
            'apps/bite-tribe-firebase/firestore.indexes.json',
          ),
          'utf8',
        ),
      );

      expect(indexes.indexes).toContainEqual({
        collectionGroup: RESTAURANT_CANDIDATES_COLLECTION,
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'evidence.biteCount', order: 'DESCENDING' },
          { fieldPath: 'createdAtTimestamp', order: 'DESCENDING' },
        ],
      });
    });
  });

  describe('submitNewRestaurant', () => {
    it('should save a normal restaurant through the store', () => {
      const restaurant = { id: '', name: 'Pizza Palace' } as Restaurant;

      service.submitNewRestaurant(restaurant);

      expect(storeServiceMock.saveNewRestaurant).toHaveBeenCalledWith(
        restaurant,
      );
    });
  });

  // Moved here from `bite-tribe/restaurant-data-access` in issue #1317: only
  // the business app edits a restaurant, so the consumer's library had no
  // business owning these and the business edit page was reaching across the
  // scope boundary to call them.
  describe('searchPlaces', () => {
    it('should search places through the API', async () => {
      const position = { latitude: 46.948, longitude: 7.4474 };
      const places = [
        {
          id: 'place-1',
          name: 'Pizza Palace',
          position,
        },
      ];
      apiMock.searchPlaces.mockResolvedValue(places);

      const result = await service.searchPlaces('Pizza', position);

      expect(apiMock.searchPlaces).toHaveBeenCalledWith('Pizza', position);
      expect(result).toBe(places);
    });
  });

  describe('getPlaceDetails', () => {
    it('should load place details through the API', async () => {
      const details = {
        name: 'Pizza Palace',
        address: {
          street: 'Main St',
          postcode: '12345',
          city: 'Bern',
          country: 'Switzerland',
        },
      };
      apiMock.getPlaceDetails.mockResolvedValue(details);

      const result = await service.getPlaceDetails('place-1');

      expect(apiMock.getPlaceDetails).toHaveBeenCalledWith('place-1');
      expect(result).toBe(details);
    });
  });

  describe('candidate pages', () => {
    /**
     * Lets the resource notice its params and finish its loader. The loader
     * chains several reads, so each round drains a macrotask, not only the
     * microtask queue.
     */
    const settle = async (): Promise<void> => {
      for (let round = 0; round < 3; round += 1) {
        TestBed.tick();
        await new Promise((resolve) => setTimeout(resolve));
      }
    };

    const pageOf = (
      ids: string[],
      count = RESTAURANT_CANDIDATES_LIMIT + 1,
    ): { id: string; data: Record<string, unknown> }[] =>
      ids.slice(0, count).map((id) => ({
        id,
        data: {
          name: id,
          status: 'pending',
          evidence: { biteCount: 1 },
          createdAtTimestamp: 1,
        },
      }));

    /** Eleven ordered candidates: three pages of five, five and one. */
    const allIds = Array.from({ length: 11 }, (_, index) => `c${index}`);

    beforeEach(() => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockImplementation(async (options) => {
          const after = (
            options as {
              queryConstraints: { type: string; reference?: string }[];
            }
          ).queryConstraints
            .find(({ type }) => type === 'startAfter')
            ?.reference?.split('/')[1];
          const from = after ? allIds.indexOf(after) + 1 : 0;

          return {
            snapshots: pageOf(allIds.slice(from)),
          } as unknown as FirestoreCollection;
        });
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({ snapshot: null } as unknown as FirestoreDocument);
    });

    const shownIds = (): string[] =>
      service.restaurantCandidatesValue().map(({ id }) => id);

    it('should advance to the next page and back again', async () => {
      await settle();
      expect(shownIds()).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
      expect(service.restaurantCandidatesPageNumber()).toBe(1);

      service.showNextCandidatePage();
      await settle();
      expect(shownIds()).toEqual(['c5', 'c6', 'c7', 'c8', 'c9']);
      expect(service.restaurantCandidatesPageNumber()).toBe(2);
      expect(service.restaurantCandidatesHasMore()).toBe(true);

      service.showNextCandidatePage();
      await settle();
      expect(shownIds()).toEqual(['c10']);
      expect(service.restaurantCandidatesHasMore()).toBe(false);

      // Nothing beyond the last page.
      service.showNextCandidatePage();
      await settle();
      expect(service.restaurantCandidatesPageNumber()).toBe(3);

      service.showPreviousCandidatePage();
      await settle();
      expect(shownIds()).toEqual(['c5', 'c6', 'c7', 'c8', 'c9']);
      expect(service.restaurantCandidatesPageNumber()).toBe(2);
    });

    it('should show the first page again after a verification from a later page', async () => {
      await settle();
      service.showNextCandidatePage();
      await settle();
      expect(service.restaurantCandidatesPageNumber()).toBe(2);

      await service.verifyRestaurantCandidate({
        id: '',
        name: 'c5',
        restaurantCandidateId: 'c5',
      } as Restaurant);
      await settle();

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'verifyRestaurantCandidate',
          data: expect.objectContaining({ candidateId: 'c5' }),
        }),
      );
      expect(service.restaurantCandidatesPageNumber()).toBe(1);
      expect(shownIds()).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
    });

    it('should read the first page again after a verification from it', async () => {
      await settle();
      jest.mocked(FirebaseFirestore.getCollection).mockClear();

      await service.verifyRestaurantCandidate({
        id: '',
        name: 'c0',
        restaurantCandidateId: 'c0',
      } as Restaurant);
      await settle();

      expect(FirebaseFirestore.getCollection).toHaveBeenCalled();
      expect(service.restaurantCandidatesPageNumber()).toBe(1);
    });

    it('should render the empty state rather than throw when a page read fails', async () => {
      await settle();
      jest
        .mocked(FirebaseFirestore.getCollection)
        .mockRejectedValue(new Error('missing index'));

      service.showNextCandidatePage();
      await settle();

      expect(service.restaurantCandidatesValue()).toEqual([]);
      expect(service.restaurantCandidatesHasMore()).toBe(false);
    });
  });

  describe('verifyRestaurantCandidate', () => {
    it('should call the verification callable with sanitized restaurant data', async () => {
      const restaurant = {
        id: '',
        name: 'Pizza Palace',
        image: 'data:image/png;base64,abc',
        position: { latitude: 46.948, longitude: 7.4474 },
        restaurantCandidateId: 'candidate-1',
        biteIds: ['bite-1'],
        bites: [{ id: 'bite-1' }],
        unsaved: true,
      } as Restaurant;

      const result = await service.verifyRestaurantCandidate(restaurant);

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'verifyRestaurantCandidate',
        data: {
          candidateId: 'candidate-1',
          restaurant: {
            name: 'Pizza Palace',
            image: 'data:image/png;base64,abc',
            position: { latitude: 46.948, longitude: 7.4474 },
          },
        },
      });
      expect(result).toEqual({
        restaurantId: 'restaurant-1',
        menuId: 'menu-1',
        candidateId: 'candidate-1',
        status: 'created',
      });
      expect(apiMock.saveRestaurantImage).toHaveBeenCalledWith(
        'restaurant-1',
        'data:image/png;base64,abc',
      );
    });

    it('should not upload the image again for already verified candidates', async () => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: {
          restaurantId: 'restaurant-1',
          candidateId: 'candidate-1',
          status: 'already-verified',
        },
      });

      await service.verifyRestaurantCandidate({
        id: '',
        name: 'Pizza Palace',
        image: 'data:image/png;base64,abc',
        restaurantCandidateId: 'candidate-1',
      } as Restaurant);

      expect(apiMock.saveRestaurantImage).not.toHaveBeenCalled();
    });

    it('should require a candidate id', async () => {
      await expect(
        service.verifyRestaurantCandidate({
          id: '',
          name: 'Pizza Palace',
        } as Restaurant),
      ).rejects.toThrow('restaurantCandidateId is required');

      expect(FirebaseFunctions.callByName).not.toHaveBeenCalled();
    });
  });

  describe('selectRestaurantToCreate', () => {
    it('should delegate the selected restaurant to the store service', () => {
      const restaurant = { id: '', name: 'Pizza Palace' } as never;
      const service = TestBed.inject(RestaurantsDataAccessService);

      service.selectRestaurantToCreate(restaurant);

      expect(storeServiceMock.selectRestaurantToCreate).toHaveBeenCalledWith(
        restaurant,
      );
    });
  });

  describe('logout', () => {
    it('should delegate logout to the store service', () => {
      const service = TestBed.inject(RestaurantsDataAccessService);

      service.logout();

      expect(storeServiceMock.logout).toHaveBeenCalled();
    });
  });
});
