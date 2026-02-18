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
  Bite,
  Like,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Geolocation, Position } from '@capacitor/geolocation';

const ONE_MINUTE = 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class DetailsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  biteLoader: ResourceLoader<any, any> = async ({ params }) => {
    const biteId = params.biteId;
    if (biteId) {
      const likeDocs = await FirebaseFirestore.getCollection({
        reference: `bites/${biteId}/likes`,
      });

      const likes = likeDocs.snapshots.map(
        (like) =>
          ({
            ...like.data,
          }) as Like,
      );

      return FirebaseFirestore.getDocument({
        reference: `bites/${biteId}`,
      }).then((res) => {
        return {
          ...res.snapshot.data,
          likes,
          id: res.snapshot.id,
        } as Bite;
      });
    }

    return Promise.resolve();
  };

  bite = resource({
    params: () => ({
      biteId: this.storeService.biteIdFromUrl(),
    }),
    loader: this.biteLoader.bind(this),
  });
  imageUploads = toSignal(this.storeService.imageUploads$, {
    initialValue: <Record<string, Record<any, any>>>{},
  });
  reviews = toSignal(this.storeService.reviews$, { initialValue: [] as any });
  bucketlists = toSignal(this.storeService.bucketlists$, {
    initialValue: [] as any,
  });
  exchangeRates = toSignal(this.storeService.exchangeRates$);
  preferredCurrency = toSignal(this.storeService.preferedCurrency$);
  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  biteCreatorId = computed(() => {
    const bite = this.bite.value();
    return bite?.userId;
  });

  uploadState = computed((): any => {
    const bite = this.bite.value();
    const uploads = this.imageUploads();

    if (!bite) {
      return {};
    }

    if (!uploads) {
      return {};
    }

    const id = bite.id;
    if (!id) {
      return {};
    }

    return uploads[id];
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

  positionLoader: ResourceLoader<any, Position> = async () => {
    try {
      const permissionStatus = await Geolocation.checkPermissions();

      if (permissionStatus.location !== 'granted') {
        await Geolocation.requestPermissions();
      }

      return Geolocation.getCurrentPosition({
        maximumAge: ONE_MINUTE,
      });
    } catch (error) {
      console.error('Error getting position:', error);

      return undefined;
    }
  };

  biteCreator = resource({
    params: () => ({
      userId: this.biteCreatorId(),
    }),
    loader: this.biteCreatorLoader.bind(this),
  });

  position = resource({
    loader: this.positionLoader.bind(this),
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
    const bite = this.bite.value();
    const userId = this.userId();

    if (!bite) {
      return;
    }

    const likeFromUser = bite?.likes?.find(
      (like: Like) =>
        like.userId === userId && like.likeType === likeType.likeType,
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
