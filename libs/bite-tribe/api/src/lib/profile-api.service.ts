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
import type {
  Bite,
  CreateAndUploadImageCallbackParams,
  PublicUser,
} from 'model';
import { toPublicUser } from './utils/to-public-user';
import { Platform } from '@ionic/angular';
import { checkUserProfileImageAndMirrorToFirebase } from './utils/check-user-profile-image-and-mirror-to-firebase';
import { USERS_COLLECTION } from './utils/user-collection-key';
import { getDownloadUrlFromFirebaseStorage, isBase64String } from 'utils';
import { deleteCurrentImage } from './utils/delete-current-image';
import { uploadBase64ToFirebaseStorage } from './utils/upload-base64-to-firebase-storage';
import { updateProfileWithImagePathFromFirebaseStorage } from './bite-api/utils/update-profile-with-image-path-from-firestorage';
import { loadProfileById } from './bite-api/utils/load-profile-by-id';

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

  async startListener(): Promise<any> {
    const user = this.authService.getUser();

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
      const user = this.authService.getUser();

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

  async updateUser(publicUser: PublicUser): Promise<PublicUser> {
    try {
      const photoUrl = publicUser.photoUrl;

      if (isBase64String(photoUrl)) {
        console.log('You must upload the image before updating the user.');

        await deleteCurrentImage(publicUser);

        const { photoUrl: base64Image, ...restOfPublicUser } = publicUser;
        const newPhotoRef = await uploadBase64ToFirebaseStorage({
          base64: base64Image,
          docId: publicUser.userId,
          collection: USERS_COLLECTION,
        });

        const newPhotoUrl =
          await getDownloadUrlFromFirebaseStorage(newPhotoRef);

        const updatedUser: PublicUser = {
          ...restOfPublicUser,
          photoUrl: newPhotoUrl || '',
          displayName: publicUser.displayName,
          email: publicUser.email,
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
      }

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

      return publicUser;
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
      return Promise.resolve();
    }
  }

  async getUserById(biteCreatorId: string): Promise<PublicUser | void> {
    if (!biteCreatorId) {
      return Promise.resolve();
    }

    try {
      const reference = `${USERS_COLLECTION}/${biteCreatorId}`;
      const result = await FirebaseFirestore.getDocument({
        reference,
      });
      const user = toPublicUser(result.snapshot);

      return Promise.resolve(user);
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      this.errorHandler.handleError(error);
      return Promise.resolve();
    }
  }

  async updateLastSeen(): Promise<void> {
    try {
      const user = this.authService.getUser();

      if (!user?.uid) {
        return;
      }

      await FirebaseFirestore.updateDocument({
        reference: `${USERS_COLLECTION}/${user.uid}`,
        data: {
          lastSeen: new Date().toISOString(),
          lastSeenTimestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Error updating last seen:', error);
      this.errorHandler.handleError(error);
    }
  }

  async saveUserIfNotExisting(): Promise<void> {
    const user = this.authService.getUser();

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
      const currentUser = this.authService.getUser();
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
      const currentUser = this.authService.getUser();

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
    const user = this.authService.getUser();

    if (!user?.uid) {
      return false;
    }

    return followers.some((follower) => follower.id === user.uid);
  }

  async fetchFollowersWithDetails(userId: string): Promise<PublicUser[]> {
    try {
      const followers = await this.fetchFollowers(userId);
      const userIds = followers.map((follower) => follower.id);

      if (userIds.length === 0) {
        return [];
      }

      const users: PublicUser[] = [];
      for (const uid of userIds) {
        const userDoc = await FirebaseFirestore.getDocument({
          reference: `${USERS_COLLECTION}/${uid}`,
        });

        if (userDoc.snapshot?.data) {
          users.push(userDoc.snapshot.data as PublicUser);
        }
      }

      return users;
    } catch (error) {
      console.error('Error fetching followers with details:', error);
      this.errorHandler.handleError(error);
      return [];
    }
  }

  async fetchFollowingWithDetails(userId: string): Promise<PublicUser[]> {
    try {
      const following = await this.fetchFollowing(userId);
      const followingData = following.map((doc) => doc.data);
      const userIds = followingData
        .map((data: any) => data?.followedUid)
        .filter(Boolean);

      if (userIds.length === 0) {
        return [];
      }

      const users: PublicUser[] = [];
      for (const uid of userIds) {
        const userDoc = await FirebaseFirestore.getDocument({
          reference: `${USERS_COLLECTION}/${uid}`,
        });

        if (userDoc.snapshot.data) {
          users.push(userDoc.snapshot.data as PublicUser);
        }
      }

      return users;
    } catch (error) {
      console.error('Error fetching following with details:', error);
      this.errorHandler.handleError(error);
      return [];
    }
  }

  public async uploadImage(
    profile: PublicUser,
    callbackFn: (p: CreateAndUploadImageCallbackParams) => void,
  ): Promise<void> {
    const { photoUrl, ...profileWithoutImage } = profile;

    uploadBase64ToFirebaseStorage({
      base64: photoUrl,
      docId: profile.userId,
      collection: USERS_COLLECTION,
      callbackFn,
    });
  }

  public async updatePhotoUrlInUser(
    profile: PublicUser,
    photoUrl: string,
  ): Promise<PublicUser> {
    const { photoUrl: base64Photo, ...profileWithoutImage } = profile;

    await updateProfileWithImagePathFromFirebaseStorage(
      photoUrl,
      profileWithoutImage,
      profile.userId,
    );

    return loadProfileById(profile.userId);
  }
}
