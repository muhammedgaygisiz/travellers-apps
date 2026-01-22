import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import {
  DocumentData,
  DocumentSnapshot,
  FirebaseFirestore,
} from '@capacitor-firebase/firestore';
import type { Bite, PublicUser } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { toPublicUser } from './utils/to-public-user';
import { isIdpAvatarUrl } from './utils/is-idp-avatar-url';
import { Platform } from '@ionic/angular';
import { uploadBlobToFirebasestorage } from './bite-api/utils/upload-blob-to-firebasestorage';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { checkUserProfileImageAndMirrorToFirebase } from './utils/check-user-profile-image-and-mirror-to-firebase';
import { USERS_COLLECTION } from './utils/user-collection-key';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly platform = inject(Platform);
  private readonly profileChannel$ = new BehaviorSubject<any>(null);

  isWeb = signal(!this.platform.is('hybrid'));

  private readonly stopped$ = new Subject<void>();
  profileCallbackId = '';

  public publicProfile$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap((isLoggedIn) => {
      if (isLoggedIn) {
        this.startListener();
      }

      return this.profileChannel$.pipe(skip(1), takeUntil(this.stopped$));
    }),
  );

  private async getUser(): Promise<User | null | undefined> {
    const authState = this.authService.authState();
    return authState?.user;
  }

  async startListener(): Promise<any> {
    const user = await this.getUser();

    this.profileCallbackId =
      await FirebaseFirestore.addCollectionSnapshotListener(
        {
          reference: `${USERS_COLLECTION}`,
          compositeFilter: {
            type: 'and',
            queryConstraints: [
              {
                type: 'where',
                fieldPath: 'userId',
                opStr: '==',
                value: user?.uid || '',
              },
            ],
          },
        },
        (publicProfileDoc: any) => this.handleResponse(publicProfileDoc),
      );

    return this.profileChannel$;
  }

  handleResponse(publicProfileDoc: any): void {
    const isPublicProfile = publicProfileDoc?.snapshots?.length > 0;

    if (isPublicProfile) {
      const publicProfile = publicProfileDoc.snapshots[0].data;
      this.profileChannel$.next({
        ...publicProfile,
        id: publicProfileDoc.snapshots[0].id,
      });
    }
  }

  async stopProfileListener(callbackId: string): Promise<void> {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  async saveUser(isPublic: boolean): Promise<void> {
    try {
      const user = await this.getUser();

      const photoUrl = ((user as any)?.providerData as any[]).find(
        (data) => data.photoUrl?.length,
      )?.photoUrl;

      await FirebaseFirestore.setDocument({
        reference: `${USERS_COLLECTION}/${user?.uid}`,
        data: {
          userId: user?.uid || '',
          displayName: user?.displayName || '',
          email: user?.email || '',
          photoUrl: photoUrl || '',
          public: isPublic,
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error saving user:', error);

      this.errorHandler.handleError(error);
    }
  }

  async updateUser(publicUser: PublicUser): Promise<PublicUser | undefined> {
    try {
      const updatedUser: Omit<PublicUser, 'userId' | 'followers'> = {
        displayName: publicUser.displayName,
        email: publicUser.email,
        photoUrl: publicUser.photoUrl,
        city: publicUser.city || '',
        about: publicUser.about || '',
        public: publicUser.public || false,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      };

      await FirebaseFirestore.updateDocument({
        reference: `${USERS_COLLECTION}/${publicUser.userId}`,
        data: updatedUser,
      });

      return { ...publicUser, ...updatedUser } as PublicUser;
    } catch (error) {
      console.error('Error updating public user:', error);
      this.errorHandler.handleError(error);

      return undefined;
    }
  }

  async getUserByBiteId(bite: Bite | undefined): Promise<PublicUser | void> {
    if (!bite?.userId) {
      return Promise.resolve();
    }

    try {
      const reference = `${USERS_COLLECTION}/${bite.userId}`;
      const result = await FirebaseFirestore.getDocument({
        reference,
      });
      const user = toPublicUser(result.snapshot);

      const updatedUser = await checkUserProfileImageAndMirrorToFirebase(
        user,
        this.isWeb(),
      );

      await FirebaseFirestore.setDocument({
        reference,
        data: updatedUser,
      });

      return Promise.resolve(updatedUser);
    } catch (error) {
      console.error('Error fetching user by bite ID:', error);
      this.errorHandler.handleError(error);
      throw error;
    }
  }

  async saveUserIfNotExisting(): Promise<void> {
    const user = await this.getUser();

    const userFromDB = await FirebaseFirestore.getDocument({
      reference: `${USERS_COLLECTION}/${user?.uid}`,
    });

    const userInDb = userFromDB?.snapshot.data;

    if (!userInDb) {
      await this.saveUser(false);
    }

    if (userInDb && userInDb['public'] === undefined) {
      await this.setUserPublicFlag(user?.uid);
    }
  }

  async setUserPublicFlag(uid: string | undefined): Promise<void> {
    try {
      if (uid) {
        await FirebaseFirestore.updateDocument({
          reference: `${USERS_COLLECTION}/${uid}`,
          data: {
            public: true,
            updatedAt: new Date().toISOString(),
            updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
          },
        });
      }
    } catch (error) {
      console.error('Error updating public user:', error);
      this.errorHandler.handleError(error);
    }
  }

  async followUser(user: PublicUser): Promise<void> {
    try {
      const currentUser = await this.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const followRelationship = {
        createdAt: new Date().toISOString(),
        followerUid: currentUser.uid,
        followedUid: user.userId,
      };

      await FirebaseFirestore.setDocument({
        reference: `${USERS_COLLECTION}/${user.userId}/followers/${currentUser.uid}`,
        data: followRelationship,
      });

      await FirebaseFirestore.setDocument({
        reference: `${USERS_COLLECTION}/${currentUser.uid}/following/${user.userId}`,
        data: followRelationship,
      });
    } catch (error) {
      console.error('Error following user:', error);
      this.errorHandler.handleError(error);
    }
  }

  async unfollowUser(user: PublicUser): Promise<void> {
    try {
      const currentUser = await this.getUser();

      console.log('Unfollowing user:', user, 'by', currentUser);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      await FirebaseFirestore.deleteDocument({
        reference: `${USERS_COLLECTION}/${user.userId}/followers/${currentUser.uid}`,
      });

      await FirebaseFirestore.deleteDocument({
        reference: `${USERS_COLLECTION}/${currentUser.uid}/following/${user.userId}`,
      });
    } catch (e) {
      console.error('Error unfollowing user:', e);
      this.errorHandler.handleError(e);
    }
  }

  getTotalNumberOfUsers(): Promise<number> {
    return new Promise((resolve) => {
      FirebaseFirestore.getCountFromServer({
        reference: USERS_COLLECTION,
      }).then((result) => resolve(result.count));
    });
  }

  async fetchFollowers(
    userId: string,
  ): Promise<DocumentSnapshot<DocumentData>[]> {
    return new Promise((resolve) => {
      FirebaseFirestore.getCollection({
        reference: `${USERS_COLLECTION}/${userId}/followers`,
      })
        .then((result) => {
          resolve(result.snapshots);
        })
        .catch((error) => {
          console.error('Error fetching followers:', error);
          resolve([]);
        });
    });
  }

  async fetchFollowing(
    userId: string,
  ): Promise<DocumentSnapshot<DocumentData>[]> {
    return new Promise((resolve) => {
      FirebaseFirestore.getCollection({
        reference: `${USERS_COLLECTION}/${userId}/following`,
      })
        .then((result) => {
          resolve(result.snapshots);
        })
        .catch((error) => {
          console.error('Error fetching following:', error);
          resolve([]);
        });
    });
  }

  async isCurrentUserFollowing(
    followers: DocumentSnapshot<DocumentData>[],
  ): Promise<boolean> {
    const user = await this.getUser();

    if (!user?.uid) {
      return false;
    }

    return followers.some((follower) => follower.id === user.uid);
  }
}
