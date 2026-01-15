import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  catchError,
  from,
  Observable,
  of,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite, PublicUser } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';

const USERS_COLLECTION = 'users';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly profileChannel$ = new BehaviorSubject<any>(null);

  private readonly stopped$ = new Subject<void>();
  profileCallbackId = '';

  public publicProfile$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap((isLoggedIn) => {
      if (isLoggedIn) {
        this.startProfileListener();
      } else {
        this.stopProfileListener(this.profileCallbackId);
      }

      return this.profileChannel$.pipe(skip(1), takeUntil(this.stopped$));
    }),
  );

  private async getUser(): Promise<User | null | undefined> {
    const authState = await this.authService.authState();
    return authState?.user;
  }

  private async startProfileListener(): Promise<any> {
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
        (publicProfileDoc: any) => {
          const isPublicProfile = publicProfileDoc?.snapshots?.length > 0;

          if (isPublicProfile) {
            const publicProfile = publicProfileDoc.snapshots[0].data;
            this.profileChannel$.next({
              ...publicProfile,
              id: publicProfileDoc.snapshots[0].id,
            });
          }
        },
      );

    return this.profileChannel$;
  }

  private async stopProfileListener(callbackId: string): Promise<void> {
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
      const updatedUser: Omit<PublicUser, 'userId'> = {
        displayName: publicUser.displayName,
        email: publicUser.email,
        photoUrl: publicUser.photoUrl,
        city: publicUser.city || '',
        about: publicUser.about || '',
        public: true,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      };

      await FirebaseFirestore.updateDocument({
        reference: `${USERS_COLLECTION}/${publicUser.userId}`,
        data: updatedUser,
      });

      return { ...updatedUser, ...publicUser } as PublicUser;
    } catch (error) {
      console.error('Error updating public user:', error);
      this.errorHandler.handleError(error);

      return undefined;
    }
  }

  async deleteUser(): Promise<void> {
    const user = await this.getUser();

    try {
      await FirebaseFirestore.updateDocument({
        reference: `${USERS_COLLECTION}/${user?.uid}`,
        data: {
          public: false,
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      this.errorHandler.handleError(error);
    }
  }

  getUserByBiteId(bite: Bite | undefined): Observable<any> {
    if (!bite?.userId) {
      return of();
    }

    return from(
      FirebaseFirestore.getDocument({
        reference: `${USERS_COLLECTION}/${bite.userId}`,
      }),
    ).pipe(
      catchError((error) => {
        console.error('Error fetching user by bite ID:', error);
        this.errorHandler.handleError(error);
        throw new Error(error);
      }),
    );
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

  private async setUserPublicFlag(uid: string | undefined): Promise<void> {
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
}
