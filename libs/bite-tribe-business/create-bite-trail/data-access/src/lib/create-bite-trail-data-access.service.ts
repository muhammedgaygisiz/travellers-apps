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
import { resourceValue } from 'utils';
import { BiteTribeApiService } from 'bite-tribe/api';

export const USERS_COLLECTION = 'users';
export const BITE_TRAIL_COLLECTION = 'biteTrails';

@Injectable({ providedIn: 'root' })
export class CreateBiteTrailDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

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

  /** Guarded read: `value()` throws once the read has failed (#1232). */
  organisationValue = resourceValue(this.organisation);

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
