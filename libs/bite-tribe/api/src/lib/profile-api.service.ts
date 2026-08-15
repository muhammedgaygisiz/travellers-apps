import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { EMPTY, Observable, skipWhile, switchMap } from 'rxjs';
import {
  DocumentData,
  DocumentSnapshot,
  FirebaseFirestore,
} from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type {
  Bite,
  CreateAndUploadImageCallbackParams,
  PublicUser,
} from 'model';
import { toPublicUser } from './utils/to-public-user';
import { Platform } from '@ionic/angular';
import { checkUserProfileImageAndMirrorToFirebase } from './utils/check-user-profile-image-and-mirror-to-firebase';
import { USERS_COLLECTION } from './utils/user-collection-key';
import {
  getDownloadUrlFromFirebaseStorage,
  isBase64String,
  loadAppRelease,
} from 'utils';
import { deleteCurrentImage } from './utils/delete-current-image';
import { uploadBase64ToFirebaseStorage } from './utils/upload-base64-to-firebase-storage';
import { updateProfileWithImagePathFromFirebaseStorage } from './bite-api/utils/update-profile-with-image-path-from-firestorage';
import { loadProfileById } from './bite-api/utils/load-profile-by-id';
import {
  markUserMetadataUpdated,
  shouldUpdateUserMetadata,
} from './utils/user-metadata-throttle';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly platform = inject(Platform);
  isWeb = signal(!this.platform.is('hybrid'));

  /**
   * The signed-in user's own document, for as long as someone is listening.
   *
   * The listener is owned by the subscription. A Firestore snapshot listener
   * bills a document read for its first snapshot and for every change after it,
   * and the native one outlives any RxJS teardown on its own, so registering it
   * without owning its removal meant paying for updates nobody read until the
   * process ended — and paying twice after a sign-out and back in, because the
   * second registration overwrote the only id that could have removed the first
   * (issue #1310). Whoever subscribes now decides what that costs: the store
   * takes a single snapshot at login, and the listener goes with it.
   *
   * A consumer that wants a live profile only has to stay subscribed. See
   * [[Architecture - State Management]] for what the store does instead.
   */
  public publicProfile$: Observable<PublicUser & { id?: string }> =
    this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap((isLoggedIn) =>
        isLoggedIn ? this.profileSnapshots$() : EMPTY,
      ),
    );

  private profileSnapshots$(): Observable<PublicUser & { id?: string }> {
    return new Observable<PublicUser & { id?: string }>((subscriber) => {
      const user = this.authService.getUser();
      let callbackId: string | undefined;
      let unsubscribed = false;

      void FirebaseFirestore.addCollectionSnapshotListener(
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
        (publicProfileDoc) => {
          const profile = this.handleResponse(publicProfileDoc);

          if (profile) {
            subscriber.next(profile);
          }
        },
      ).then((id) => {
        callbackId = id;

        // The subscription can end before the registration resolves — a
        // consumer taking a single snapshot off a listener that answers
        // immediately does exactly that — so the teardown below may already
        // have run with no id to act on.
        if (unsubscribed) {
          void this.removeListener(id);
        }
      });

      return (): void => {
        unsubscribed = true;

        if (callbackId) {
          void this.removeListener(callbackId);
        }
      };
    });
  }

  private async removeListener(callbackId: string): Promise<void> {
    try {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    } catch (error) {
      // A listener that cannot be removed is a leak worth reporting, but it
      // must not take down the flow that was merely finished with it.
      this.errorHandler.handleError(error);
    }
  }

  handleResponse(
    publicProfileDoc: {
      snapshots?: Array<{ id?: string; data?: DocumentData | null }>;
    } | null,
  ): (PublicUser & { id?: string }) | undefined {
    const snapshot = publicProfileDoc?.snapshots?.[0];
    const publicProfile = snapshot?.data;

    if (!publicProfile) {
      return undefined;
    }

    return {
      ...publicProfile,
      ...(snapshot.id ? { id: snapshot.id } : {}),
    } as PublicUser & { id?: string };
  }

  async saveUser(isPublic: boolean): Promise<void> {
    try {
      const user = this.authService.getUser();

      const photoUrl = user?.providerData.find(
        (data) => data.photoUrl?.length,
      )?.photoUrl;

      await FirebaseFirestore.setDocument({
        reference: `${USERS_COLLECTION}/${user?.uid}`,
        data: {
          userId: user?.uid || '',
          displayName: user?.displayName || '',
          // Not seeded from the display name: a profile that repeats one name
          // on both of its lines is the bug in GitHub issue #1270. A real name
          // is only ever set by the user, in the edit-profile form.
          fullName: '',
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

        const newPhotoRef = await uploadBase64ToFirebaseStorage({
          base64: photoUrl,
          docId: publicUser.userId,
          collection: USERS_COLLECTION,
        });

        const newPhotoUrl =
          await getDownloadUrlFromFirebaseStorage(newPhotoRef);

        const updatedUser = this.toProfileUpdate(publicUser, newPhotoUrl || '');

        await FirebaseFirestore.updateDocument({
          reference: `${USERS_COLLECTION}/${publicUser.userId}`,
          data: updatedUser,
        });

        return { ...publicUser, ...updatedUser } as PublicUser;
      }

      const updatedUser = this.toProfileUpdate(publicUser, publicUser.photoUrl);

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

  /**
   * Stamps the onboarding completion fields on the current user's document.
   *
   * This is a dedicated write rather than part of {@link updateUser}: the
   * completion fields are set once, at the end of the assistant, and must not be
   * carried on every ordinary profile edit. The `onboardingVersion` records
   * which assistant flow the user finished, so a future flow change can decide
   * whether an already-onboarded user should be shown a delta.
   */
  async markOnboardingComplete(version: number): Promise<void> {
    const uid = this.authService.getUser()?.uid;

    if (!uid) {
      throw new Error(
        'Cannot complete onboarding without an authenticated user',
      );
    }

    const now = new Date();

    await FirebaseFirestore.updateDocument({
      reference: `${USERS_COLLECTION}/${uid}`,
      data: {
        onboardingCompletedAt: now.toISOString(),
        onboardingCompletedAtTimestamp: now.getTime(),
        onboardingVersion: version,
      },
    });
  }

  /**
   * The user-owned fields a profile update may write, for both the plain and the
   * upload path.
   *
   * It lists the fields explicitly rather than spreading the caller's object:
   * the rest of a `PublicUser` is server-owned (`biteCount`, `subscriptionTier`,
   * the created/last-seen stamps) or written elsewhere (`normalizedDisplayName`,
   * by the `claimDisplayName` transaction), so a client write has no business
   * carrying it. Spreading also forwarded keys whose value is `undefined` —
   * which a caller produces just by reading a document that never had the field
   * — and Firestore rejects the whole update for those.
   */
  private toProfileUpdate(
    publicUser: PublicUser,
    photoUrl: string,
  ): Omit<PublicUser, 'userId' | 'followers'> {
    return {
      displayName: publicUser.displayName,
      fullName: publicUser.fullName || '',
      email: publicUser.email,
      photoUrl,
      city: publicUser.city || '',
      about: publicUser.about || '',
      public: publicUser.public || false,
      updatedAt: new Date().toISOString(),
      updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
    };
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
      await FirebaseFunctions.callByName<void, void>({
        name: 'updateLastSeen',
      });
    } catch (error) {
      console.warn('Error updating last seen:', error);
      this.errorHandler.handleError(error);
    }
  }

  async updateUserMetadata(): Promise<void> {
    const uid = this.authService.getUser()?.uid;
    if (!uid) {
      return;
    }

    // Throttled to once per day per user: this only refreshes `lastSeen`, so
    // there's no value in calling the Cloud Function on every foreground/login.
    if (!(await shouldUpdateUserMetadata(uid))) {
      return;
    }

    // `appVersion` on the user document is read long after the fact, to answer
    // which build a user was on. It is only worth writing if it is the build's
    // own version rather than a build-time placeholder (issue #1303).
    const { version, buildNumber } = await loadAppRelease();

    try {
      await FirebaseFunctions.callByName<
        { version?: string; buildNumber?: string },
        void
      >({
        name: 'updateUserMetadata',
        data: { version, buildNumber },
      });

      await markUserMetadataUpdated(uid);
    } catch (error) {
      console.warn('Error updating user metadata:', error);
      this.errorHandler.handleError(error);
    }
  }

  async syncEmailVerificationStatus(): Promise<
    Pick<
      PublicUser,
      | 'emailVerified'
      | 'emailVerificationRequired'
      | 'emailVerificationProvider'
      | 'emailVerificationReminderCount'
      | 'emailVerificationLastSentAt'
      | 'emailVerificationLastSentAtTimestamp'
      | 'emailVerificationManualLastSentAt'
      | 'emailVerificationManualLastSentAtTimestamp'
    >
  > {
    const result = await FirebaseFunctions.callByName<
      void,
      Pick<
        PublicUser,
        | 'emailVerified'
        | 'emailVerificationRequired'
        | 'emailVerificationProvider'
        | 'emailVerificationReminderCount'
        | 'emailVerificationLastSentAt'
        | 'emailVerificationLastSentAtTimestamp'
        | 'emailVerificationManualLastSentAt'
        | 'emailVerificationManualLastSentAtTimestamp'
      >
    >({
      name: 'syncEmailVerificationStatus',
    });

    return result.data;
  }

  async resendEmailVerification(): Promise<void> {
    await FirebaseFunctions.callByName<void, { status: 'sent' }>({
      name: 'resendEmailVerification',
    });
  }

  async claimDisplayName(displayName: string): Promise<{
    displayName: string;
    normalizedDisplayName: string;
  }> {
    const result = await FirebaseFunctions.callByName<
      { displayName: string },
      { displayName: string; normalizedDisplayName: string }
    >({
      name: 'claimDisplayName',
      data: { displayName },
    });

    return result.data;
  }

  async checkDisplayNameAvailability(displayName: string): Promise<{
    available: boolean;
    normalizedDisplayName: string;
  }> {
    const result = await FirebaseFunctions.callByName<
      { displayName: string },
      { available: boolean; normalizedDisplayName: string }
    >({
      name: 'checkDisplayNameAvailability',
      data: { displayName },
    });

    return result.data;
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

  /**
   * Checks whether the current user follows `userId` by reading the single
   * follower relationship document instead of the whole followers subcollection.
   *
   * This is the cheap read path used once the aggregate follow counts are
   * available on the user document, so the counts no longer require loading
   * every follower to answer "does the current user follow this profile?".
   */
  async isFollowedByCurrentUser(userId: string): Promise<boolean> {
    const user = this.authService.getUser();

    if (!user?.uid) {
      return false;
    }

    try {
      const result = await FirebaseFirestore.getDocument({
        reference: `${USERS_COLLECTION}/${userId}/followers/${user.uid}`,
      });

      return Boolean(result.snapshot?.data);
    } catch (error) {
      console.error('Error checking follow relationship:', error);
      return false;
    }
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
        .map((data) => (data as { followedUid?: string })?.followedUid)
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
    void profileWithoutImage;

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
    void base64Photo;

    await updateProfileWithImagePathFromFirebaseStorage(
      photoUrl,
      profileWithoutImage,
      profile.userId,
    );

    return loadProfileById(profile.userId);
  }
}
