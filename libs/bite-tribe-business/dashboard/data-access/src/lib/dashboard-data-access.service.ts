import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Restaurant } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeApiService } from 'bite-tribe/api';
import {
  averageRatingOf,
  closeTo,
  matchRestaurantBites,
  ratedBitesOf,
  resourceValue,
} from 'utils';

export const RESTAURANT_COLLECTION = 'restaurants';
/** The field listing every account a restaurant is assigned to (epic #1614). */
export const RESTAURANT_OWNERS_FIELD = 'ownerUserIds';
export const MENU_COLLECTION = 'menus';

/**
 * How a restaurant is doing, as guests see it (GitHub issue #2133): the Bites
 * its consumer page shows, their average rating and how many of them carry
 * one, and its followers.
 */
export interface RestaurantFigures {
  bites: number;
  ratings: number;
  averageRating: number;
  followers: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  /**
   * The restaurants assigned to the signed-in account, and nothing else.
   *
   * This read used to return the whole collection, which made the business app
   * a view over every restaurant in BiteTribe: an account was listed - and
   * could open the edit form of - a restaurant assigned to somebody else
   * (issue #1079). Ownership is membership of `Restaurant.ownerUserIds`
   * (epic #1614), written by the
   * operator callables of issue #1077, and the same fields issue #1078's rules
   * authorise a write from. The filter is strict and has no fallback to the
   * unowned restaurants: an account holding nothing sees nothing, which is the
   * empty state the restaurants page renders.
   *
   * Filtering here rather than after the read is what keeps this honest once
   * the rules narrow reads too. Until they do, the rules still allow any
   * signed-in account to read any restaurant, so this is the visible boundary
   * rather than the enforced one - the enforced one is the route guard and the
   * write rules.
   */
  restaurantsLoader: ResourceLoader<
    Restaurant[] | undefined,
    { userId: string | undefined }
  > = async ({ params }) => {
    const { userId } = params;

    if (!userId) {
      return [];
    }

    const docs = await FirebaseFirestore.getCollection({
      reference: RESTAURANT_COLLECTION,
      // An `array-contains` on one field needs no composite index.
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: RESTAURANT_OWNERS_FIELD,
            opStr: 'array-contains',
            value: userId,
          },
        ],
      },
    });

    if (!docs?.snapshots) {
      return [];
    }

    return docs.snapshots.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data,
        }) as Restaurant,
    );
  };

  /**
   * Keyed on the uid, so an assignment or a revocation lands on the next load
   * without a re-login: ownership is a document field rather than a custom
   * claim, so there is no token to refresh (issue #1069).
   */
  restaurants = resource({
    params: () => ({ userId: this.storeService.user()?.uid }),
    loader: this.restaurantsLoader.bind(this),
  });

  // This reads Firestore and can reject. `value()` throws in that state, and
  // the pages bind it directly, so one failed collection read would otherwise
  // take the whole binding update with it. See issue #1232.
  restaurantsValue = resourceValue(this.restaurants, [] as Restaurant[]);

  /**
   * The ids of the held restaurants whose menu was built from guests' Bites
   * and not yet confirmed, so the setup checklist names that menu (GitHub
   * issue #2302). One read per menu: an owner holds a restaurant or two. A
   * menu that fails to read counts as the owner's own, which only changes a
   * label.
   */
  menusBuiltFromBitesLoader: ResourceLoader<
    ReadonlySet<string>,
    { restaurants: readonly Restaurant[] }
  > = async ({ params }) => {
    const built = await Promise.all(
      params.restaurants.map(async (restaurant) => {
        const menuId = restaurant.menuId?.split('/').filter(Boolean).pop();

        if (!menuId || !restaurant.id) {
          return undefined;
        }

        try {
          const { snapshot } = await FirebaseFirestore.getDocument({
            reference: `${MENU_COLLECTION}/${menuId}`,
          });

          return snapshot?.data?.['derivedFromBites'] === true
            ? restaurant.id
            : undefined;
        } catch {
          return undefined;
        }
      }),
    );

    return new Set(built.filter((id): id is string => !!id));
  };

  menusBuiltFromBites = resource({
    params: () => ({ restaurants: this.restaurantsValue() }),
    loader: this.menusBuiltFromBitesLoader.bind(this),
  });
  menusBuiltFromBitesValue = resourceValue(
    this.menusBuiltFromBites,
    new Set<string>() as ReadonlySet<string>,
  );

  /**
   * Each held restaurant's figures, keyed by its id (GitHub issue #2133).
   *
   * Worked out exactly as the consumer restaurant page opened without a Bite
   * does (#2320): the Bites near the restaurant's own position that the shared
   * rule in `utils` matches to it, so an owner reads the numbers a guest sees.
   * Those numbers are public in the consumer app already, which is why this is
   * the client's read rather than an owner-only callable. The follower count
   * is the restaurant's backend-kept `followersCount`.
   *
   * A restaurant without a position, or whose nearby read fails, has no
   * figures, so the dashboard leaves its card out rather than claiming 0.
   */
  figuresLoader: ResourceLoader<
    ReadonlyMap<string, RestaurantFigures>,
    { restaurants: readonly Restaurant[] }
  > = async ({ params }) => {
    const entries = await Promise.all(
      params.restaurants.map(
        async (
          restaurant,
        ): Promise<[string, RestaurantFigures] | undefined> => {
          const position = restaurant.position;

          if (
            !restaurant.id ||
            !Number.isFinite(position?.latitude) ||
            !Number.isFinite(position?.longitude)
          ) {
            return undefined;
          }

          try {
            const nearby = await this.api.bitesByPosition({
              coords: {
                latitude: position.latitude,
                longitude: position.longitude,
              },
            } as GeolocationPosition);
            const bites = matchRestaurantBites(
              closeTo(nearby, position),
              restaurant,
              restaurant.id,
            );

            return [
              restaurant.id,
              {
                bites: bites.length,
                ratings: ratedBitesOf(bites).length,
                averageRating: averageRatingOf(bites),
                followers: restaurant.followersCount ?? 0,
              },
            ];
          } catch {
            return undefined;
          }
        },
      ),
    );

    return new Map(
      entries.filter((entry): entry is [string, RestaurantFigures] => !!entry),
    );
  };

  figures = resource({
    params: () => ({ restaurants: this.restaurantsValue() }),
    loader: this.figuresLoader.bind(this),
  });
  figuresValue = resourceValue(
    this.figures,
    new Map() as ReadonlyMap<string, RestaurantFigures>,
  );

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  gpsPosition = toSignal(this.storeService.position$);

  logout(): void {
    this.storeService.logout();
  }
}
