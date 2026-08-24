import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { Bite, BiteTrail, PublicUser } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { resourceValue } from 'utils';
import { BiteTribeApiService } from 'bite-tribe/api';

export const USERS_COLLECTION = 'users';
export const BITE_COLLECTION = 'bites';
export const BITE_TRAIL_COLLECTION = 'biteTrails';

interface OwnerLoaderParams {
  userId: string | undefined;
}

@Injectable({ providedIn: 'root' })
export class CreateBiteTrailDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  /**
   * A BiteTrail is owned by the account creating it.
   *
   * Both the owner and the selectable Bites used to arrive from the
   * organisation dashboard, which listed an organisation's "employees" by the
   * `organisationId` field on their user documents. Nothing ever wrote that
   * field, so the list was always empty and no Bite could be reached through
   * it. The organisation concept is gone (see GitHub issue #1371) and creating
   * a BiteTrail is becoming a capability of any user with the right role, so
   * the signed-in account is both the owner and the source of the Bites.
   */
  private readonly signedInUserId = (): string | undefined =>
    this.storeService.user()?.uid;

  ownerLoader: ResourceLoader<PublicUser | undefined, OwnerLoaderParams> =
    async ({ params }) => {
      const { userId } = params;

      if (!userId) {
        return undefined;
      }

      const doc = await FirebaseFirestore.getDocument({
        reference: `${USERS_COLLECTION}/${userId}`,
      });

      if (!doc.snapshot.data) {
        return undefined;
      }

      return { ...doc.snapshot.data, userId: doc.snapshot.id } as PublicUser;
    };

  bitesLoader: ResourceLoader<Bite[], OwnerLoaderParams> = async ({
    params,
  }) => {
    const { userId } = params;

    if (!userId) {
      return [];
    }

    const docs = await FirebaseFirestore.getCollection({
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

    if (!docs?.snapshots?.length) {
      return [];
    }

    return docs.snapshots.map((doc) => ({ ...doc.data, id: doc.id }) as Bite);
  };

  owner = resource({
    params: () => ({ userId: this.signedInUserId() }),
    loader: this.ownerLoader.bind(this),
  });

  bites = resource({
    params: () => ({ userId: this.signedInUserId() }),
    loader: this.bitesLoader.bind(this),
  });

  /** Guarded reads: `value()` throws once the read has failed (#1232). */
  ownerValue = resourceValue(this.owner);
  bitesValue = resourceValue(this.bites, [] as Bite[]);

  createBiteTrail(
    trailData: Omit<
      BiteTrail,
      | 'id'
      | 'createdAt'
      | 'createdAtTimestamp'
      | 'updatedAt'
      | 'updatedAtTimestamp'
    >,
  ): Promise<void> {
    return this.api.createBiteTrail(trailData);
  }
}
