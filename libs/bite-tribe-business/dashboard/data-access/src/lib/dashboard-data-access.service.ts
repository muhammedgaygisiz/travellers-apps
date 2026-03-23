import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PublicUser, Restaurant } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

export const USERS_COLLECTION = 'users';
export const RESTAURANT_COLLECTION = 'restaurants';

@Injectable({
  providedIn: 'root',
})
export class DashboardDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  restaurantsLoader: ResourceLoader<Restaurant[] | undefined, any> =
    async () => {
      const docs = await FirebaseFirestore.getCollection({
        reference: RESTAURANT_COLLECTION,
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

  restaurants = resource({
    loader: this.restaurantsLoader.bind(this),
  });

  organisationsLoader: ResourceLoader<PublicUser[] | undefined, any> =
    async () => {
      const docs = await FirebaseFirestore.getCollection({
        reference: USERS_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'isOrganisation',
              opStr: '==',
              value: true,
            },
          ],
        },
      });

      if (!docs?.snapshots) {
        return [];
      }

      return docs.snapshots.map((doc) => doc.data as PublicUser);
    };

  organisations = resource({
    loader: this.organisationsLoader.bind(this),
  });

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  gpsPosition = toSignal(this.storeService.position$);

  logout(): void {
    this.storeService.logout();
  }

  selectRestaurantToCreate(restaurant: Restaurant): void {
    this.storeService.selectRestaurantToCreate(restaurant);
  }
}
