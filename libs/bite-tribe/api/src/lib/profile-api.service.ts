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
  AcceptFollowRequestResult,
  Bite,
  CreateAndUploadImageCallbackParams,
  DeclineFollowRequestResult,
  FollowSuggestion,
  ListFollowRequestsResult,
  PendingFollowRequest,
  PublicUser,
  RequestFollowResult,
  WithdrawFollowRequestResult,
  ReportUserResult,
  UserReportReason,
} from 'model';
import {
  FOLLOW_REQUESTS_COLLECTION,
  followRequestId,
  normalizePronouns,
} from 'model';
import { toPublicUser } from './utils/to-public-user';
import { loadVisibleProfile } from './utils/load-visible-profile';
import { Platform } from '@ionic/angular';
import { checkUserProfileImageAndMirrorToFirebase } from './utils/check-user-profile-image-and-mirror-to-firebase';
import { USERS_COLLECTION } from './utils/user-collection-key';
import {
  ContentRefusedError,
  isBase64String,
  isContentRefused,
  loadAppRelease,
} from 'utils';
import { findLocalUploadedImage } from './utils/local-image-file';
import { readLocalImageAsDataUrl } from './utils/read-local-image-as-data-url';
import { uploadBase64ToFirebaseStorage } from './utils/upload-base64-to-firebase-storage';
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
   * (issue #1310). Whoever subscribes now decides what that costs. The store
   * and `celebrateProfileProgress$` share one subscription for the session
   * (`ownProfileSessions$`, issue #2148), so the signed-in user's document is
   * listened to once, and signing out removes the listener. See
   * [[Architecture - State Management]].
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
        (publicProfileDoc, error) => {
          // The SDK detaches a listener that errors, so this one has stopped
          // delivering: say so rather than go quiet (issue #1835).
          if (error) {
            this.errorHandler.handleError(error);
            return;
          }

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

      // No photo: the provider's avatar is mirrored and checked on the
      // backend before it becomes `photoUrl` (GitHub issue #2140).
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
          photoUrl: '',
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

  /**
   * Writes the profile, then uploads a newly chosen photo, and swallows a
   * failure: the caller's copy comes back unchanged. A refused text is the
   * exception, and is thrown (issue #1610).
   *
   * Onboarding's path, which waits for the upload. Edit Profile uploads in
   * the background instead, through {@link saveProfile} and
   * {@link uploadProfilePhoto}. Either way the document is marked `pending`
   * before the transfer starts, and only the storage finalize trigger
   * publishes the photo, once the image check passed it (GitHub issue #2140).
   * So the profile that comes back still carries its previous photo.
   */
  async updateUser(
    publicUser: PublicUser,
    currentPhotoUrl = '',
  ): Promise<PublicUser> {
    try {
      const photo = publicUser.photoUrl;

      if (!isBase64String(photo)) {
        return await this.saveProfile(publicUser);
      }

      // Pending first: a status written after the upload could land after
      // the trigger's verdict and hide it.
      const saved = await this.saveProfile(
        { ...publicUser, photoUrl: currentPhotoUrl },
        Date.now(),
      );

      try {
        await uploadBase64ToFirebaseStorage({
          base64: photo,
          docId: publicUser.userId,
          collection: USERS_COLLECTION,
        });
      } catch (error) {
        await this.setProfilePhotoStatus(publicUser.userId, 'failed');

        throw error;
      }

      return saved;
    } catch (error) {
      // A refusal is the user's to act on, so it reaches the step that
      // asked (issue #1610); any other failure is swallowed as before.
      if (isContentRefused(error)) {
        throw error;
      }

      console.error('Error updating public user:', error);
      this.errorHandler.handleError(error);

      return publicUser;
    }
  }

  /**
   * Writes the profile's user-owned fields and lets a failure through, for a
   * page that has to tell the user a save failed.
   *
   * The text other accounts read - real name, city, about and pronouns - goes
   * to the `updateProfileText` callable first, which checks it and refuses
   * what breaks the community guidelines (issue #1610); a refusal is thrown as
   * a {@link ContentRefusedError} and nothing is written. The rest is written
   * here. The display name is neither: `claimDisplayName` writes it, and the
   * rules refuse a client changing any of these fields.
   *
   * `photoUrl` is never written: only the storage finalize trigger publishes
   * a photo, once the image check passed it (GitHub issue #2140). The caller's
   * `photoUrl` is what comes back. With `photoUploadStartedAt`, the document
   * is marked as waiting for a new photo, and the current one stays on show
   * until the trigger replaces it (GitHub issue #1953).
   */
  async saveProfile(
    publicUser: PublicUser,
    photoUploadStartedAt?: number,
  ): Promise<PublicUser> {
    const updatedUser = {
      ...this.toProfileUpdate(publicUser),
      ...(photoUploadStartedAt === undefined
        ? {}
        : {
            photoStatus: 'pending' as const,
            photoUploadStartedAtTimestamp: photoUploadStartedAt,
          }),
    };
    const { displayName, fullName, city, about, pronouns, ...rest } =
      updatedUser;
    void displayName;

    const textResult = await FirebaseFunctions.callByName<
      Pick<PublicUser, 'fullName' | 'city' | 'about' | 'pronouns'>,
      { status: 'saved' } | { status: 'refused'; field: string }
    >({
      name: 'updateProfileText',
      data: { fullName, city, about, pronouns: pronouns ?? '' },
    });

    if (textResult.data?.status === 'refused') {
      throw new ContentRefusedError(textResult.data.field);
    }

    await FirebaseFirestore.updateDocument({
      reference: `${USERS_COLLECTION}/${publicUser.userId}`,
      data: rest,
    });

    return this.toUpdatedUser(publicUser, updatedUser);
  }

  /**
   * Uploads a profile photo, reporting progress, completion and failure
   * through `callbackFn` as a Bite photo upload does. Started, not awaited, by
   * the caller.
   */
  async uploadProfilePhoto(
    userId: string,
    photo: string,
    callbackFn: (p: CreateAndUploadImageCallbackParams) => void,
  ): Promise<void> {
    await uploadBase64ToFirebaseStorage({
      base64: photo,
      docId: userId,
      collection: USERS_COLLECTION,
      callbackFn,
    });
  }

  /**
   * The copy of the last profile photo this device uploaded, as a data URL,
   * so a failed upload can be sent again after a reload. `undefined` when the
   * copy is gone or was never written here.
   */
  async findLocalProfilePhoto(userId: string): Promise<string | undefined> {
    const localCopy = await findLocalUploadedImage(USERS_COLLECTION, userId);

    if (!localCopy) {
      return undefined;
    }

    try {
      return await readLocalImageAsDataUrl(localCopy.uri);
    } catch {
      return undefined;
    }
  }

  /**
   * Records an upload attempt's status. Not awaited by the upload flow:
   * offline the write lands in the local cache at once but only resolves once
   * the server acknowledges it (see GitHub issue #1390).
   */
  async setProfilePhotoStatus(
    userId: string,
    photoStatus: 'pending' | 'failed',
    photoUploadStartedAt?: number,
  ): Promise<void> {
    try {
      await FirebaseFirestore.updateDocument({
        reference: `${USERS_COLLECTION}/${userId}`,
        data: {
          photoStatus,
          ...(photoUploadStartedAt === undefined
            ? {}
            : { photoUploadStartedAtTimestamp: photoUploadStartedAt }),
        },
      });
    } catch (error) {
      console.error('Error writing the profile photo status:', error);
      this.errorHandler.handleError(error);
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
   *
   * `pronouns` is the one field that is absent rather than empty, so it is left
   * out here when there are none, and `updateProfileText` removes the stored
   * value (issue #1826).
   */
  private toProfileUpdate(
    publicUser: PublicUser,
  ): Omit<PublicUser, 'userId' | 'followers' | 'photoUrl'> {
    const pronouns = normalizePronouns(publicUser.pronouns);

    return {
      displayName: publicUser.displayName,
      fullName: publicUser.fullName || '',
      ...(pronouns ? { pronouns } : {}),
      email: publicUser.email,
      city: publicUser.city || '',
      about: publicUser.about || '',
      public: publicUser.public || false,
      updatedAt: new Date().toISOString(),
      updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
    };
  }

  /**
   * The profile as it stands after an update. Cleared pronouns leave the object
   * too, as they leave the document, rather than surviving from the caller's
   * copy.
   */
  private toUpdatedUser(
    publicUser: PublicUser,
    updatedUser: Omit<PublicUser, 'userId' | 'followers' | 'photoUrl'>,
  ): PublicUser {
    const { pronouns: previousPronouns, ...rest } = publicUser;
    void previousPronouns;

    return { ...rest, ...updatedUser } as PublicUser;
  }

  /**
   * **Unreachable, and refused by the rules if it is ever wired up.** Nothing in
   * either app calls this. It mirrors another account's IdP avatar into our own
   * Storage and then writes it back to `users/{bite.userId}` - a write to a
   * document belonging to somebody else, which the ownership-scoped rules deny
   * (GitHub issue #1078). Mirroring somebody else's avatar has to move to a
   * Function before this can be used; wiring it up as it stands would surface as
   * a permission error on an ordinary Bite detail view.
   */
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
      // A private profile is a stand-in without counts (issue #1863), which
      // sends the follow metadata to the subcollections it falls back on.
      return await loadVisibleProfile(biteCreatorId);
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

  /** Follows the user, answering whether the write worked. */
  async followUser(user: PublicUser): Promise<boolean> {
    try {
      await this.follow(user.userId);

      return true;
    } catch (error) {
      console.error('Error following user:', error);
      this.errorHandler.handleError(error);

      return false;
    }
  }

  /**
   * Whether the signed-in user follows anybody, read as a single document of
   * their `following` subcollection, or `undefined` when that cannot be told:
   * signed out, or the read failed.
   *
   * Not read off the profile. The store's copy of `followingCount` trails the
   * follower-count trigger by seconds, and `profileMetadata.following` is the count of
   * whichever profile is open - on a follow, the person being followed
   * (issue #1799).
   */
  async followsAnyone(): Promise<boolean | undefined> {
    const currentUser = this.authService.getUser();

    if (!currentUser) {
      return undefined;
    }

    try {
      const result = await FirebaseFirestore.getCollection({
        reference: `${USERS_COLLECTION}/${currentUser.uid}/following`,
        queryConstraints: [{ type: 'limit', limit: 1 }],
      });

      return result.snapshots.length > 0;
    } catch (error) {
      console.warn('Could not tell whether the user follows anybody:', error);

      return undefined;
    }
  }

  /**
   * Writes both halves of a follow and lets a failure through.
   *
   * {@link followUser} swallows its error, which the profile button can live
   * with because it updates optimistically. A follow suggestion has to put its
   * button back when the write fails, so it needs to hear about it
   * (GitHub issue #1708).
   */
  async follow(userId: string): Promise<void> {
    const currentUser = this.authService.getUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const followRelationship = {
      createdAt: new Date().toISOString(),
      followerUid: currentUser.uid,
      followedUid: userId,
    };

    await FirebaseFirestore.setDocument({
      reference: `${USERS_COLLECTION}/${userId}/followers/${currentUser.uid}`,
      data: followRelationship,
    });

    await FirebaseFirestore.setDocument({
      reference: `${USERS_COLLECTION}/${currentUser.uid}/following/${userId}`,
      data: followRelationship,
    });
  }

  /**
   * Asks a private profile's owner to let the signed-in user follow them
   * (GitHub issue #2164). A private profile is followed by request, and the
   * rules refuse a client writing its follow edges, so this goes through the
   * `requestFollow` callable rather than {@link follow}. Errors are left to the
   * caller, which tells the user the request did not go out.
   */
  async requestFollow(userId: string): Promise<RequestFollowResult> {
    const result = await FirebaseFunctions.callByName<
      { userId: string },
      RequestFollowResult
    >({
      name: 'requestFollow',
      data: { userId },
    });

    return result.data;
  }

  /** Withdraws the signed-in user's pending request to `userId` (issue #2164). */
  async withdrawFollowRequest(
    userId: string,
  ): Promise<WithdrawFollowRequestResult> {
    const result = await FirebaseFunctions.callByName<
      { userId: string },
      WithdrawFollowRequestResult
    >({
      name: 'withdrawFollowRequest',
      data: { userId },
    });

    return result.data;
  }

  /**
   * Whether the signed-in user has a pending request to follow `userId`, read
   * from `/followRequests/{ownerUid}_{viewerUid}` so the button still reads
   * Requested after a reload (issue #2164). A read that fails is taken for no
   * request: the button then offers Follow, and `requestFollow` answers a
   * duplicate without a second request.
   */
  async followRequestPending(userId: string): Promise<boolean> {
    const user = this.authService.getUser();

    if (!user?.uid || user.uid === userId) {
      return false;
    }

    try {
      const result = await FirebaseFirestore.getDocument({
        reference: `${FOLLOW_REQUESTS_COLLECTION}/${followRequestId(userId, user.uid)}`,
      });

      return Boolean(result.snapshot?.data);
    } catch (error) {
      console.warn(
        'Could not tell whether a follow request is pending:',
        error,
      );

      return false;
    }
  }

  /**
   * How many requests to follow the signed-in user's profile are pending
   * (GitHub issue #2165), for the row on the own profile. A count query over
   * `/followRequests` rather than the `listFollowRequests` callable, so the
   * profile does not wait on a function each time it is opened; the rules let
   * the owner list what is addressed to them. A read that fails counts none,
   * which hides the row rather than the profile.
   */
  async countPendingFollowRequests(): Promise<number> {
    const uid = this.authService.getUser()?.uid;

    if (!uid) {
      return 0;
    }

    try {
      const { count } = await FirebaseFirestore.getCountFromServer({
        reference: FOLLOW_REQUESTS_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            { type: 'where', fieldPath: 'ownerUid', opStr: '==', value: uid },
          ],
        },
      });

      return count;
    } catch (error) {
      console.warn('Could not count the pending follow requests:', error);

      return 0;
    }
  }

  /**
   * The signed-in user's pending follow requests, newest first, from the
   * `listFollowRequests` callable (issue #2165). A callable, because the owner
   * may not read a private requester's user document. Errors are left to the
   * caller, which says the list could not be read.
   */
  async listFollowRequests(): Promise<PendingFollowRequest[]> {
    const result = await FirebaseFunctions.callByName<
      Record<string, never>,
      ListFollowRequestsResult
    >({
      name: 'listFollowRequests',
      data: {},
    });

    return result.data.requests;
  }

  /** Lets `userId` follow the signed-in user's private profile (issue #2165). */
  async acceptFollowRequest(
    userId: string,
  ): Promise<AcceptFollowRequestResult> {
    const result = await FirebaseFunctions.callByName<
      { userId: string },
      AcceptFollowRequestResult
    >({
      name: 'acceptFollowRequest',
      data: { userId },
    });

    return result.data;
  }

  /** Turns down the request `userId` sent (issue #2165); no follow is written. */
  async declineFollowRequest(
    userId: string,
  ): Promise<DeclineFollowRequestResult> {
    const result = await FirebaseFunctions.callByName<
      { userId: string },
      DeclineFollowRequestResult
    >({
      name: 'declineFollowRequest',
      data: { userId },
    });

    return result.data;
  }

  /**
   * People the signed-in user could follow, from the `suggestPeopleToFollow`
   * callable (GitHub issue #1708). The position is optional and only ever one
   * the caller already holds: asking for it is not this call's business.
   */
  async fetchFollowSuggestions(position?: {
    latitude: number;
    longitude: number;
  }): Promise<FollowSuggestion[]> {
    const result = await FirebaseFunctions.callByName<
      { latitude?: number; longitude?: number },
      FollowSuggestion[]
    >({
      name: 'suggestPeopleToFollow',
      data: position
        ? { latitude: position.latitude, longitude: position.longitude }
        : {},
    });

    return result.data ?? [];
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

  /**
   * Blocks another account for the signed-in user (GitHub issue #1609).
   *
   * A callable rather than a client write: blocking also removes the other
   * account's follow of this one, which the rules let no client delete.
   * Errors are left to the caller, which has to tell the user it did not work.
   */
  async blockUser(userId: string): Promise<void> {
    await FirebaseFunctions.callByName<{ uid: string }, { blocked: boolean }>({
      name: 'blockUser',
      data: { uid: userId },
    });
  }

  async unblockUser(userId: string): Promise<void> {
    await FirebaseFunctions.callByName<{ uid: string }, { blocked: boolean }>({
      name: 'unblockUser',
      data: { uid: userId },
    });
  }

  /**
   * Reports a profile to the BiteTribe operators (GitHub issue #1829).
   *
   * Errors are not swallowed, as on a Bite report: a reporter told their report
   * went through when it did not will not report the profile again.
   */
  async reportUser(
    userId: string,
    reason: UserReportReason,
  ): Promise<ReportUserResult> {
    const result = await FirebaseFunctions.callByName<
      { uid: string; reason: UserReportReason },
      ReportUserResult
    >({
      name: 'reportUser',
      data: { uid: userId, reason },
    });

    return result.data;
  }

  /**
   * The uids the signed-in user has blocked. The list is readable by its owner
   * alone, and only its document ids are needed.
   */
  async fetchBlockedUserIds(): Promise<string[]> {
    const uid = this.authService.getUser()?.uid;

    if (!uid) {
      return [];
    }

    try {
      const result = await FirebaseFirestore.getCollection({
        reference: `${USERS_COLLECTION}/${uid}/blocked`,
      });

      return result.snapshots.map((snapshot) => snapshot.id);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      this.errorHandler.handleError(error);

      return [];
    }
  }

  /**
   * A refused read resolves to an empty list and logs nothing. The empty list
   * is the outcome every caller already handles, and a `console.error` for it
   * buried the failures that matter in the web console (issue #1905).
   */
  async fetchFollowers(
    userId: string,
  ): Promise<DocumentSnapshot<DocumentData>[]> {
    return this.fetchFollowCollection(userId, 'followers');
  }

  /** See {@link fetchFollowers}. */
  async fetchFollowing(
    userId: string,
  ): Promise<DocumentSnapshot<DocumentData>[]> {
    return this.fetchFollowCollection(userId, 'following');
  }

  private async fetchFollowCollection(
    userId: string,
    collection: 'followers' | 'following',
  ): Promise<DocumentSnapshot<DocumentData>[]> {
    try {
      const result = await FirebaseFirestore.getCollection({
        reference: `${USERS_COLLECTION}/${userId}/${collection}`,
      });

      return result.snapshots;
    } catch {
      return [];
    }
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

      return await this.loadListedProfiles(userIds as string[]);
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

      return await this.loadListedProfiles(userIds as string[]);
    } catch (error) {
      console.error('Error fetching following with details:', error);
      this.errorHandler.handleError(error);
      return [];
    }
  }

  /**
   * The profiles behind a follower or following list, one read each.
   *
   * A private account in the list is refused by the rules since issue #1863,
   * and comes back as a stand-in carrying its uid alone: the list hides it as
   * it hid a private row before, without its profile reaching this device.
   * A missing profile is left out, as it always was.
   *
   * The reads run concurrently (issue #1876). One after another, a list took
   * a round trip per person to load.
   */
  private async loadListedProfiles(userIds: string[]): Promise<PublicUser[]> {
    const users = await Promise.all(userIds.map(loadVisibleProfile));

    return users.filter((user): user is PublicUser => !!user);
  }
}
