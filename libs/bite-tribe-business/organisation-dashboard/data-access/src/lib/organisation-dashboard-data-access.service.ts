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

  selectedUserIds = signal<string[]>([]);
  selectedBiteIds = signal<string[]>([]);
  loadBitesTrigger = signal<string[]>([]);
  organisationId = this.storeService.organisationIdFromUrl;

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
    const { userIds } = params;

    if (!userIds || userIds.length === 0) {
      return [];
    }

    const allBitesPromises: Promise<Bite[]>[] = userIds.map(
      async (userId: string) => {
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
          return [] as Bite[];
        }

        return biteDocsByUserId.snapshots.map(
          (doc) => ({ ...doc.data, id: doc.id }) as Bite,
        );
      },
    );

    const results = await Promise.all(allBitesPromises);
    return results
      .map((res) => res)
      .reduce((acc, bites) => [...acc, ...bites], []);
  };

  employees = resource({
    params: () => ({
      organisationId: this.storeService.organisationIdFromUrl(),
    }),
    loader: this.employeesLoader.bind(this),
  });

  bites = resource({
    params: () => ({
      userIds: this.loadBitesTrigger(),
    }),
    loader: this.bitesLoader.bind(this),
  });
}
