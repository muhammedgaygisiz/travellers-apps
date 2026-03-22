import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type { Bite, BiteTrail, Like, PublicUser } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

const BITE_TRAIL_COLLECTION = 'biteTrails';

@Injectable({ providedIn: 'root' })
export class ProfileDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  bitesByUser = toSignal(this.storeService.bitesByUser$, {
    initialValue: [] as Bite[],
  });

  myUser = toSignal(this.storeService.publicUser$);

  myBites = toSignal(this.storeService.sortedMyBites$, {
    initialValue: [] as Bite[],
  });

  private bites = toSignal(this.storeService.bites$, {
    initialValue: [] as Bite[],
  });

  userLoader: ResourceLoader<any, any> = async ({ params }) => {
    if (!params.userId) {
      return Promise.resolve({});
    }

    const userDoc = await FirebaseFirestore.getDocument({
      reference: `users/${params.userId}`,
    });

    if (!userDoc.snapshot?.data) {
      return Promise.resolve({});
    }

    return userDoc.snapshot.data as PublicUser;
  };

  user = resource({
    params: () => ({
      userId: this.storeService.userIdFromUrl(),
    }),
    loader: this.userLoader.bind(this),
  });

  biteTrailLoader: ResourceLoader<any, any> = async ({ params }) => {
    if (!params.userId) {
      return Promise.resolve([]);
    }

    const result = await FirebaseFirestore.getCollection({
      reference: BITE_TRAIL_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'ownerId',
            opStr: '==',
            value: params.userId,
          },
        ],
      },
    });

    return result.snapshots.map((snapshot) => {
      return {
        id: snapshot.id,
        ...snapshot.data,
      } as BiteTrail;
    });
  };

  biteTrailsByUser = resource({
    params: () => ({
      userId: this.storeService.userIdFromUrl(),
    }),
    loader: this.biteTrailLoader.bind(this),
  });

  myBiteTrails = resource({
    params: () => ({
      userId: this.storeService.user()?.uid,
    }),
    loader: this.biteTrailLoader.bind(this),
  });

  userId = toSignal(this.storeService.userId$, { initialValue: '' });

  isPublicProfile = toSignal(this.storeService.isPublicProfile$);

  profileMetadata = toSignal(this.storeService.profileMetadata$);

  logout(): void {
    this.storeService.logout();
  }

  submitLikeClick(likeType: Like): void {
    const bites = this.bites();
    const userId = this.userId();

    const bite = bites?.find((bite) => bite.id === likeType.biteId);
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

  savePublicProfile(publicUser: PublicUser): void {
    this.storeService.savePublicProfile(publicUser);
  }

  submitFollowClick(user: PublicUser): void {
    this.storeService.followUser(user);
  }

  submitUnfollowClick(user: PublicUser): void {
    this.storeService.unfollowUser(user);
  }
}
