import {
  computed,
  inject,
  Injectable,
  resource,
  ResourceLoader,
} from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Like,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class DetailsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bite = toSignal(this.storeService.bite$);
  reviews = toSignal(this.storeService.reviews$, { initialValue: [] as any });
  bucketlists = toSignal(this.storeService.bucketlists$, {
    initialValue: [] as any,
  });
  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  biteCreatorId = computed(() => {
    const bite = this.bite();
    return bite?.userId;
  });

  biteCreatorLoader: ResourceLoader<any, any> = ({ params }) => {
    const userId = params.userId;
    if (userId) {
      return FirebaseFirestore.getDocument({
        reference: `users/${userId}`,
      }).then((res) => res.snapshot.data as PublicUser);
    }

    return Promise.resolve();
  };

  biteCreator = resource({
    params: () => ({
      userId: this.biteCreatorId(),
    }),
    loader: this.biteCreatorLoader.bind(this),
  });

  saveNewReview(newReview: { review: string; biteId: string }): void {
    this.storeService.saveReview(newReview);
  }

  saveToBucketList(saveToBucketListEvent: SaveToBucketListParams): void {
    this.storeService.saveToBucketList(saveToBucketListEvent);
  }

  createAndSaveToBucketList(param: {
    bucketListName: string;
    biteId: string | undefined;
  }): void {
    this.storeService.createAndSaveToBucketList(param);
  }

  removeBiteFromBucketlist($event: RemoveBiteFromBucketlistParams): void {
    this.storeService.removeBiteFromBucketlist($event);
  }

  submitLikeClick(likeType: Like): void {
    const bite = this.bite();
    const userId = this.userId();

    const likeFromUser = bite?.likes?.find(
      (like) => like.userId === userId && like.likeType === likeType.likeType,
    );

    if (likeFromUser) {
      this.storeService.removeLike(likeType);
      return;
    }

    this.storeService.submitLikeClick(likeType);
  }

  logout(): void {
    this.storeService.logout();
  }
}
