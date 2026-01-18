import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  from,
  Observable,
  skip,
  skipWhile,
  Subject,
  switchMap,
} from 'rxjs';
import { DocumentData, FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { Menu } from 'model';
import { AddCollectionSnapshotListenerCallbackEvent } from '@capacitor-firebase/firestore/dist/esm/definitions';

export const MENU_COLLECTION = 'menus';

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly _menusChannel$ = new BehaviorSubject<any[]>([]);
  menus$ = this._menusChannel$.asObservable().pipe(skip(1));

  private readonly stopped$ = new Subject<void>();
  menuCallbackId = '';

  public async startListener(): Promise<void> {
    this.menuCallbackId = await FirebaseFirestore.addCollectionSnapshotListener(
      { reference: MENU_COLLECTION },
      (menusDocs) => {
        this.handleResponse(menusDocs);
      },
    );
  }

  handleResponse(
    menusDocs: AddCollectionSnapshotListenerCallbackEvent<DocumentData> | null,
  ): void {
    const menus =
      menusDocs?.snapshots.map((doc) => ({
        ...doc.data,
        id: doc.id,
      })) || [];

    this._menusChannel$.next(menus);
  }

  async stopMenuListener(callbackId: string): Promise<void> {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  loadMenu(menuId: string): Observable<Menu | undefined> {
    return this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        if (menuId) {
          return from(this.getMenuById(menuId)).pipe(
            catchError((err) => {
              return this.handleError(err);
            }),
          );
        }

        return EMPTY;
      }),
    );
  }

  handleError(err: any): typeof EMPTY {
    console.error('Error fetching menu:', err);
    this.errorHandler.handleError(err);
    return EMPTY;
  }

  async getMenuById(menuId: string): Promise<Menu | undefined> {
    try {
      const doc = await FirebaseFirestore.getDocument({
        reference: `${MENU_COLLECTION}/${menuId}`,
      });

      const data = doc.snapshot.data;
      if (data) {
        return {
          id: data['id'] ?? menuId,
          ...data,
        } as Menu;
      }

      return undefined;
    } catch (error) {
      console.error('Error fetching menu:', error);
      return undefined;
    }
  }

  async saveMenu(menu: Menu): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${MENU_COLLECTION}/${menu.id}`,
      data: {
        categories: menu.categories,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });
  }
}
