import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  catchError,
  from,
  of,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite, PublicUser } from 'model';

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
    })
  );

  private async getUser() {
    const authState = await this.authService.authState();
    return authState?.user;
  }

  private async startProfileListener() {
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
        }
      );

    return this.profileChannel$;
  }

  private async stopProfileListener(callbackId: string) {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  async saveUser() {
    try {
      const user = await this.getUser();

      const photoUrl = ((user as any)?.providerData as any[]).find(
        (data) => data.photoUrl?.length
      )?.photoUrl;

      FirebaseFirestore.setDocument({
        reference: `${USERS_COLLECTION}/${user?.uid}`,
        data: {
          userId: user?.uid || '',
          displayName: user?.displayName || '',
          email: user?.email || '',
          photoUrl: photoUrl || '',
        },
      });
    } catch (error) {
      console.error('Error saving user:', error);

      this.errorHandler.handleError(error);
    }
  }

  async updateUser(publicUser: PublicUser) {
    try {
      FirebaseFirestore.updateDocument({
        reference: `${USERS_COLLECTION}/${publicUser.userId}`,
        data: {
          displayName: publicUser.displayName,
          email: publicUser.email,
          photoUrl: publicUser.photoUrl,
          city: publicUser.city || '',
          about: publicUser.about || '',
        },
      });
    } catch (error) {
      console.error('Error updating public user:', error);
      this.errorHandler.handleError(error);
    }
  }

  async deleteUser() {
    const user = await this.getUser();

    FirebaseFirestore.deleteDocument({
      reference: `${USERS_COLLECTION}/${user?.uid}`,
    });
  }

  getUserByBiteId(bite: Bite | undefined) {
    if (!bite?.userId) {
      return of();
    }

    return from(
      FirebaseFirestore.getDocument({
        reference: `${USERS_COLLECTION}/${bite.userId}`,
      })
    ).pipe(
      catchError((error) => {
        console.error('Error fetching user by bite ID:', error);
        this.errorHandler.handleError(error);
        throw new Error(error);
      })
    );
  }
}
