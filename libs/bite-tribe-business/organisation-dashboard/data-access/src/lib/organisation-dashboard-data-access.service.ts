import {
  inject,
  Injectable,
  resource,
  ResourceLoader,
  signal,
} from '@angular/core';
import { Bite, PublicUser } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

export const USERS_COLLECTION = 'users';
export const BITE_COLLECTION = 'bites';

@Injectable({ providedIn: 'root' })
export class OrganisationDashboardDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  selectedUserId = signal<string | undefined>(undefined);

  employeesLoader: ResourceLoader<PublicUser[] | undefined, any> = async ({
    params,
  }) => {
    const { organisationId } = params;

    if (!organisationId) {
      return [];
    }

    const userDocsByOrganisationId = await FirebaseFirestore.getCollection({
      reference: USERS_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'organisationId',
            opStr: '==',
            value: organisationId,
          },
        ],
      },
    });

    if (!userDocsByOrganisationId?.snapshots?.length) {
      return [];
    }

    return userDocsByOrganisationId.snapshots.map(
      (doc) => doc.data as PublicUser,
    );
  };

  bitesLoader: ResourceLoader<Bite[] | undefined, any> = async ({ params }) => {
    const { userId } = params;

    if (!userId) {
      return [];
    }

    const biteDocsByUserId = await FirebaseFirestore.getCollection({
      reference: BITE_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'userId',
            opStr: '==',
            value: userId,
          },
        ],
      },
    });

    if (!biteDocsByUserId?.snapshots?.length) {
      return [];
    }

    return biteDocsByUserId.snapshots.map(
      (doc) => ({ ...doc.data, id: doc.id }) as Bite,
    );
  };

  employees = resource({
    params: () => ({
      organisationId: this.storeService.organisationIdFromUrl(),
    }),
    loader: this.employeesLoader.bind(this),
  });

  bites = resource({
    params: () => ({
      userId: this.selectedUserId(),
    }),
    loader: this.bitesLoader.bind(this),
  });

  setSelectedUserId(userId: string): void {
    this.selectedUserId.set(userId);
  }
}
