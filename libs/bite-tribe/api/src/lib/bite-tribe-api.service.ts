import { inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BehaviorSubject, EMPTY, from, skipWhile, switchMap } from 'rxjs';
import { AuthService } from 'ta-firestore';
import {
  CreateAndSaveToBucketListParams,
  Menu,
  RemoveBiteFromBucketlistParams,
  Restaurant,
  SaveToBucketListParams,
  Settings,
} from 'model';

const BITE_COLLECTION = 'bites';
const BUCKETLIST_COLLECTION = 'bucketlists';
const LIKES_COLLECTION_GROUP = 'likes';
const REVIEW_COLLECTION = 'reviews';
const RESTAURANT_COLLECTION = 'restaurants';
const SETTINGS_COLLECTION = 'settings';
const MENU_COLLECTION = 'menus';

@Injectable({
  providedIn: 'root',
})
export class BiteTribeApiService {
  private readonly authService = inject(AuthService);

  private readonly bitesChannel$ = new BehaviorSubject<any[]>([]);
  private readonly bucketlistsChannel$ = new BehaviorSubject<any[]>([]);
  private readonly restaurantsChannel$ = new BehaviorSubject<any[]>([]);
  private readonly menusChannel$ = new BehaviorSubject<any[]>([]);
  private readonly reviewsChannel$ = new BehaviorSubject<any[]>([]);
  private readonly settingsChannel$ = new BehaviorSubject<Settings>(
    {} as Settings
  );
  private readonly likesChannel$ = new BehaviorSubject<any[]>([]);

  public allBucketlists$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap(() => {
      this.startBucketlistsListener();

      return this.bucketlistsChannel$;
    })
  );

  public allBites$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap(() => {
      // console.debug('#mo - Start Listener for Bites');
      this.startBitesListener();

      return this.bitesChannel$;
    })
  );

  public allLikes$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap(() => {
      // console.debug('#mo - Start Listener for Likes');
      this.startLikesListener();

      return this.likesChannel$;
    })
  );

  public allRestaurants$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap(() => {
      // console.debug('#mo - Start Listener for Restaurants');
      this.startRestaurantsListener();

      return this.restaurantsChannel$;
    })
  );

  private async startRestaurantsListener() {
    // console.debug('#mo Fetching bites from Firestore');

    await FirebaseFirestore.addCollectionSnapshotListener(
      { reference: RESTAURANT_COLLECTION },
      async (restaurantsDocs) => {
        // console.debug(
        //   '#mo Fetched restaurants from Firestore',
        //   restaurantsDocs
        // );

        const restaurants =
          restaurantsDocs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
          })) || [];

        this.restaurantsChannel$.next(restaurants);
      }
    );
  }

  public allMenus$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap(() => {
      // console.debug('#mo - Start Listener for Menus');
      this.startMenusListener();

      return this.menusChannel$;
    })
  );

  private async startMenusListener() {
    // console.debug('#mo Fetching menus from Firestore');

    await FirebaseFirestore.addCollectionSnapshotListener(
      { reference: MENU_COLLECTION },
      async (menusDocs) => {
        // console.debug('#mo Fetched menus from Firestore', menusDocs);

        const menus =
          menusDocs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
          })) || [];

        this.menusChannel$.next(menus);
      }
    );
  }

  public settings$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap(() => {
      // console.debug('#mo - Start Listener for Settings');
      this.startSettingsListener();

      return this.settingsChannel$;
    })
  );

  private async startBucketlistsListener() {
    const user = await this.getUser();

    await FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: BUCKETLIST_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'userId',
              opStr: '==',
              value: user?.uid,
            },
          ],
        },
      },
      async (bucketlistDocs) => {
        const bucketlists =
          bucketlistDocs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
          })) || [];

        this.bucketlistsChannel$.next(bucketlists);
      }
    );
  }

  private async startBitesListener() {
    // console.debug('#mo Fetching bites from Firestore');

    await FirebaseFirestore.addCollectionSnapshotListener(
      { reference: BITE_COLLECTION },
      async (biteDocs) => {
        // console.debug('#mo Fetched bites from Firestore', biteDocs);

        const bites =
          biteDocs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
            likes: [],
          })) || [];

        // bites.forEach((bite) => this.startLikesListener(bite));

        this.bitesChannel$.next(bites);
      }
    );
  }

  private startLikesListener() {
    FirebaseFirestore.addCollectionGroupSnapshotListener(
      { reference: `${LIKES_COLLECTION_GROUP}` },
      (likeDocs: any) => {
        const likes =
          likeDocs?.snapshots.map((likeDoc: any) => ({
            ...likeDoc.data,
          })) || [];

        if (likes.length) {
          this.likesChannel$.next(likes);
        }
      }
    );
  }

  async saveNewBite(bite: any) {
    const user = await this.getUser();

    FirebaseFirestore.addDocument({
      reference: BITE_COLLECTION,
      data: {
        ...bite,
        userId: user?.uid || '',
      },
    });
  }

  async saveEditedBite(bite: any) {
    FirebaseFirestore.updateDocument({
      reference: `${BITE_COLLECTION}/${bite.id}`,
      data: {
        ...bite,
      },
    });
  }

  async saveTagsToExistingBite(payload: { newTags: string[]; id: string }) {
    try {
      // First get the current document
      const doc = await FirebaseFirestore.getDocument({
        reference: `${BITE_COLLECTION}/${payload.id}`,
      });

      const data = doc.snapshot.data;
      // Combine existing and new tags, removing duplicates
      const existingTags = data && (data['tags'] || []);
      const uniqueTags = [...new Set([...existingTags, ...payload.newTags])];

      // Update the document with merged tags
      await FirebaseFirestore.updateDocument({
        reference: `${BITE_COLLECTION}/${payload.id}`,
        data: {
          tags: uniqueTags,
        },
      });
    } catch (error) {
      console.error('Error updating tags:', error);
    }
  }

  private async startReviewListener(biteId: string) {
    // console.debug('#mo Fetching reviews from Firestore');

    await FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: REVIEW_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'biteId',
              opStr: '==',
              value: `/${BITE_COLLECTION}/${biteId}`,
            },
          ],
        },
      },
      (docs) => {
        // console.debug('#mo Fetched reviews from Firestore', docs);

        const reviews =
          docs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
          })) || [];

        this.reviewsChannel$.next(reviews);
      }
    );
  }

  private async startSettingsListener() {
    const user = await this.getUser();

    await FirebaseFirestore.addDocumentSnapshotListener(
      { reference: `${SETTINGS_COLLECTION}/${user?.uid}` },
      async (settingsDoc) => {
        // console.debug('#mo Fetched settings from Firestore', settingsDoc);

        const settings = settingsDoc?.snapshot.data as any;
        this.settingsChannel$.next(settings);
      }
    );
  }

  async saveLike(like: {
    likeType: string;
    biteId: string;
    createdAt: string;
  }) {
    try {
      const user = await this.getUser();

      FirebaseFirestore.setDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}/likes/${user?.uid}`,
        data: {
          ...like,
          userId: user?.uid,
        },
      });
    } catch (error) {
      console.error('Error saving like:', error);
    }
  }

  private async getUser() {
    const authState = await this.authService.authState();
    return authState?.user;
  }

  async removeLike(like: any) {
    try {
      const user = await this.getUser();
      const uid = user?.uid;

      await FirebaseFirestore.deleteDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}/likes/${uid}`,
      });

      return { ...like, userId: uid };
    } catch (e) {
      console.error('Error removing like:', e);
    }
  }

  reviewsByBiteId(biteId: string) {
    return this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        // console.debug('#mo - Start Listener for Reviews');
        this.startReviewListener(biteId);

        return this.reviewsChannel$;
      })
    );
  }

  loadRestaurant(restaurantId: string) {
    return this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        // console.debug('#mo - Start Listener for Restaurant');
        if (restaurantId) {
          return from(this.getRestaurantById(restaurantId));
        }

        return EMPTY;
      })
    );
  }

  private async getRestaurantById(restaurantId: string) {
    try {
      // First try to get by ID
      const doc = await FirebaseFirestore.getDocument({
        reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      });

      if (doc.snapshot.data) {
        const data = doc.snapshot.data;
        return {
          id: data?.['id'] || restaurantId,
          ...data,
        } as Restaurant;
      }

      // If no restaurant found by ID, try to find by name
      const queryResult = await FirebaseFirestore.getCollection({
        reference: RESTAURANT_COLLECTION,
        queryConstraints: [
          {
            type: 'limit',
            limit: 10,
          },
        ],
      });

      const restaurantName = decodeURIComponent(restaurantId);
      const matchingRestaurant = queryResult.snapshots?.find(
        (snapshot) =>
          snapshot.data?.['name']?.toLowerCase() ===
          restaurantName.toLowerCase()
      );

      if (matchingRestaurant) {
        const data = matchingRestaurant.data;
        return {
          id: data?.['id'] || matchingRestaurant.id,
          ...data,
        } as Restaurant;
      }

      return undefined;
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      return undefined;
    }
  }

  async saveNewReview(payload: { review: string; biteId: string }) {
    const user = await this.getUser();

    await FirebaseFirestore.addDocument({
      reference: REVIEW_COLLECTION,
      data: {
        review: payload.review,
        biteId: `/${BITE_COLLECTION}/${payload.biteId}`,
        createdAt: new Date().toISOString(),
        authorId: user?.uid || '',
        author: user?.displayName || '',
      },
    });

    // console.debug('#mo', addDocumentResult);
  }

  async saveSettings(settings: any) {
    try {
      const user = await this.getUser();
      if (!user?.uid) {
        throw new Error('No user logged in');
      }

      await FirebaseFirestore.setDocument({
        reference: `${SETTINGS_COLLECTION}/${user.uid}`,
        data: {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
      });

      // console.debug('#mo', updateDocumentResult);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  loadMenu(menuId: string) {
    return this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        // console.debug('#mo - Start Listener for Menu');
        if (menuId) {
          return from(this.getMenuById(menuId));
        }

        return EMPTY;
      })
    );
  }

  private async getMenuById(menuId: string) {
    try {
      const doc = await FirebaseFirestore.getDocument({
        reference: `${MENU_COLLECTION}/${menuId}`,
      });

      if (doc.snapshot.data) {
        const data = doc.snapshot.data;
        return {
          id: data?.['id'] || menuId,
          ...data,
        } as Menu;
      }

      return undefined;
    } catch (error) {
      console.error('Error fetching menu:', error);
      return undefined;
    }
  }

  async saveNewRestaurant(restaurant: Restaurant) {
    // console.debug('Restaurant to be saved: ', restaurant);
    const { biteIds, ...restaurantToBeSaved } = restaurant;

    // Add the new restaurant
    const addRestaurantResult = await FirebaseFirestore.addDocument({
      reference: RESTAURANT_COLLECTION,
      data: {
        ...restaurantToBeSaved,
      },
    });

    const newRestaurantId = addRestaurantResult.reference.id;

    // Add a new menu for the restaurant
    const addMenuResult = await FirebaseFirestore.addDocument({
      reference: MENU_COLLECTION,
      data: {
        categories: [],
      },
    });

    // Update the restaurant with the menu ID
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${newRestaurantId}`,
      data: {
        menuId: `/menus/${addMenuResult.reference.id}`,
      },
    });

    // Update the bites with the new restaurant ID
    if (biteIds && biteIds.length > 0) {
      await Promise.all(
        biteIds.map((biteId) =>
          FirebaseFirestore.updateDocument({
            reference: `${BITE_COLLECTION}/${biteId}`,
            data: {
              restaurantId: `/restaurants/${newRestaurantId}`,
            },
          })
        )
      );
    }
  }

  async saveMenu(menu: Menu) {
    await FirebaseFirestore.updateDocument({
      reference: `${MENU_COLLECTION}/${menu.id}`,
      data: {
        categories: menu.categories,
      },
    });
  }

  async saveSocialMediaLinksForRestaurant(restaurantId: any, links: any) {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        socialMediaLinks: links,
      },
    });
  }

  async saveBiteIdToBucketList({
    bucketListId,
    biteId,
  }: SaveToBucketListParams) {
    const bucketListDoc = await FirebaseFirestore.getDocument({
      reference: `${BUCKETLIST_COLLECTION}/${bucketListId}`,
    });

    if (bucketListDoc?.snapshot?.data) {
      const uniqueBiteIds = [
        ...new Set([...(bucketListDoc.snapshot.data['biteIds'] || []), biteId]),
      ];

      FirebaseFirestore.updateDocument({
        reference: bucketListDoc.snapshot.path,
        data: {
          biteIds: uniqueBiteIds,
        },
      });
    }
  }

  async createBucketListAndSaveBiteIdToBucketList(
    params: CreateAndSaveToBucketListParams
  ) {
    const user = await this.getUser();

    FirebaseFirestore.addDocument({
      reference: BUCKETLIST_COLLECTION,
      data: {
        userId: user?.uid || '',
        name: params.bucketListName,
        biteIds: params.biteId ? [params.biteId] : [],
      },
    });
  }

  async removeBiteFromBucketlist({
    bucketlistId,
    biteId,
  }: RemoveBiteFromBucketlistParams) {
    const bucketListDoc = await FirebaseFirestore.getDocument({
      reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
    });

    const newBiteIdListInBucketList = bucketListDoc?.snapshot?.data?.[
      'biteIds'
    ]?.filter((currBiteId: string) => currBiteId !== biteId);

    FirebaseFirestore.updateDocument({
      reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
      data: {
        biteIds: newBiteIdListInBucketList,
      },
    });
  }
}
