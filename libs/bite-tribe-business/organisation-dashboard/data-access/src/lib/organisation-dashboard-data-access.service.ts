import {
  inject,
  Injectable,
  resource,
  ResourceLoader,
  signal,
} from '@angular/core';
import { Bite, BiteTrail, PublicUser } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

export const USERS_COLLECTION = 'users';
export const BITE_COLLECTION = 'bites';
export const BITE_TRAIL_COLLECTION = 'biteTrails';

interface OrganisationLoaderParams {
  organisationId: string | undefined;
}

interface BitesLoaderParams {
  userIds: string[] | undefined;
}

@Injectable({ providedIn: 'root' })
export class OrganisationDashboardDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  selectedUserIds = signal<string[]>([]);
  selectedBiteIds = signal<string[]>([]);
  loadBitesTrigger = signal<string[]>([]);
  organisationId = this.storeService.organisationIdFromUrl;

  employeesLoader: ResourceLoader<
    PublicUser[] | undefined,
    OrganisationLoaderParams
  > = async ({ params }) => {
    const { organisationId } = params;

    if (!organisationId) {
      return [];
    }

    const userDocsByOrganisationId =
      await FirebaseFirestore.getCollection<PublicUser>({
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

  bitesLoader: ResourceLoader<Bite[] | undefined, BitesLoaderParams> = async ({
    params,
  }) => {
    const { userIds } = params;

    if (!userIds || userIds.length === 0) {
      return [];
    }

    const allBitesPromises: Promise<Bite[]>[] = userIds.map(
      async (userId: string) => {
        const biteDocsByUserId = await FirebaseFirestore.getCollection<Bite>({
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

  biteTrailsLoader: ResourceLoader<
    BiteTrail[] | undefined,
    OrganisationLoaderParams
  > = async ({ params }) => {
    const { organisationId } = params;

    if (!organisationId) {
      return [];
    }

    const biteTrailDocs = await FirebaseFirestore.getCollection<BiteTrail>({
      reference: BITE_TRAIL_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'ownerId',
            opStr: '==',
            value: organisationId,
          },
        ],
      },
    });

    if (!biteTrailDocs?.snapshots?.length) {
      return [];
    }

    return biteTrailDocs.snapshots.map(
      (doc) => ({ ...doc.data, id: doc.id }) as BiteTrail,
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
      userIds: this.loadBitesTrigger(),
    }),
    loader: this.bitesLoader.bind(this),
  });

  biteTrails = resource({
    params: () => ({
      organisationId: this.storeService.organisationIdFromUrl(),
    }),
    loader: this.biteTrailsLoader.bind(this),
  });
}
