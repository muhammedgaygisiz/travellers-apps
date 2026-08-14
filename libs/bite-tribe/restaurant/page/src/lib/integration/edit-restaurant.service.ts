import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Link } from 'model';
import { PATH } from 'utils';
import { ToastService } from 'toast';

@Injectable({
  providedIn: 'root',
})
export class EditRestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);

  restaurant = this.dataAccess.restaurant;

  gotoEditMenu(restaurantId: string, menuId: string | undefined): void {
    const biteId = this.currentBiteId();
    const normalisedMenuId = this.normaliseMenuId(menuId);

    if (restaurantId && biteId && normalisedMenuId) {
      void this.navController.navigateForward([
        PATH.BITE,
        biteId,
        PATH.RESTAURANT,
        restaurantId,
        PATH.MENU,
        normalisedMenuId,
      ]);
    }
  }

  async createMenu(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant) {
      return;
    }

    try {
      const menuId = await this.dataAccess.createMenuForRestaurant(
        restaurant.id,
      );
      this.gotoEditMenu(restaurant.id, menuId);
    } catch {
      await this.showFailureToast();
    }
  }

  async submitSocialMediaLinks({
    links,
  }: Partial<{ links: Link[] }>): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant && links) {
      try {
        await this.dataAccess.submitSocialMediaLinks(restaurant.id, links);
        await this.toast.present({
          messageKey: 'social-media-links-saved',
          outcome: 'success',
        });
      } catch {
        await this.showFailureToast();
      }
    }
  }

  private currentBiteId(): string | undefined {
    return this.dataAccess.bite()?.id ?? this.dataAccess.biteIdFromUrl();
  }

  private normaliseMenuId(menuId: string | undefined): string | undefined {
    if (!menuId) {
      return undefined;
    }

    return menuId.split('/').filter(Boolean).pop() ?? menuId;
  }

  private showFailureToast(): Promise<void> {
    return this.toast.present({
      messageKey: 'something-went-wrong-please-try-again',
      outcome: 'failure',
    });
  }
}
