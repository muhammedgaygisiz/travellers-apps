import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  from,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Menu } from 'model';

export const MENU_COLLECTION = 'menus';

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly menusChannel$ = new BehaviorSubject<any[]>([]);

  private readonly stopped$ = new Subject<void>();
  menuCallbackId = '';

  public allMenus$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap((isLoggedIn) => {
      if (isLoggedIn) {
        this.startMenusListener();
      } else {
        this.stopMenuListener(this.menuCallbackId);
      }

      return this.menusChannel$.pipe(skip(1), takeUntil(this.stopped$));
    })
  );

  private async startMenusListener() {
    this.menuCallbackId = await FirebaseFirestore.addCollectionSnapshotListener(
      { reference: MENU_COLLECTION },
      async (menusDocs) => {
        // console.debug('#mo Fetched menus from Firestore', menusDocs);

        const menus =
          menusDocs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
          })) || [];

        this.menusChannel$.next(menus);
      }
    );
  }

  private async stopMenuListener(callbackId: string) {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  loadMenu(menuId: string) {
    return this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        // console.debug('#mo - Start Listener for Menu');
        if (menuId) {
          return from(this.getMenuById(menuId)).pipe(
            catchError((err) => {
              console.error('Error fetching menu:', err);
              this.errorHandler.handleError(err);
              return EMPTY;
            })
          );
        }

        return EMPTY;
      })
    );
  }

  private async getMenuById(menuId: string) {
    try {
      const doc = await FirebaseFirestore.getDocument({
        reference: `${MENU_COLLECTION}/${menuId}`,
      });

      if (doc.snapshot.data) {
        const data = doc.snapshot.data;
        return {
          id: data?.['id'] || menuId,
          ...data,
        } as Menu;
      }

      return undefined;
    } catch (error) {
      console.error('Error fetching menu:', error);
      return undefined;
    }
  }

  async saveMenu(menu: Menu) {
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
