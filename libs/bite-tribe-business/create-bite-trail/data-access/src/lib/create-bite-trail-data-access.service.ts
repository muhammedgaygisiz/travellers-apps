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
export const BITE_TRAIL_COLLECTION = 'biteTrails';

@Injectable({ providedIn: 'root' })
export class CreateBiteTrailDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  selectedBites = signal<Bite[]>([]);
  employees = signal<PublicUser[]>([]);

  organisationLoader: ResourceLoader<
    PublicUser | undefined,
    { organisationId: string | undefined }
  > = async ({ params }) => {
    const { organisationId } = params;

    if (!organisationId) {
      return undefined;
    }

    const doc = await FirebaseFirestore.getDocument({
      reference: `${USERS_COLLECTION}/${organisationId}`,
    });

    if (!doc.snapshot.data) {
      return undefined;
    }

    return { ...doc.snapshot.data, userId: doc.snapshot.id } as PublicUser;
  };

  organisation = resource({
    params: () => ({
      organisationId: this.storeService.organisationIdFromUrl(),
    }),
    loader: this.organisationLoader.bind(this),
  });

  async createBiteTrail(
    trailData: Omit<
      BiteTrail,
      | 'id'
      | 'createdAt'
      | 'createdAtTimestamp'
      | 'updatedAt'
      | 'updatedAtTimestamp'
    >,
  ): Promise<void> {
    const now = new Date().toISOString();
    const nowTimestamp = Date.now();
    await FirebaseFirestore.addDocument({
      reference: BITE_TRAIL_COLLECTION,
      data: {
        ...trailData,
        createdAt: now,
        createdAtTimestamp: nowTimestamp,
        updatedAt: now,
        updatedAtTimestamp: nowTimestamp,
      },
    });
  }
}
