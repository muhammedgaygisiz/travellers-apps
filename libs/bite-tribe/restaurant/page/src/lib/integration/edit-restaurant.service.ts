import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { Link } from 'model';
import { PATH } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class EditRestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toastController = inject(ToastController);

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
      await this.showToast('Something went wrong. Please try again.', 'danger');
    }
  }

  async submitSocialMediaLinks({
    links,
  }: Partial<{ links: Link[] }>): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant && links) {
      try {
        await this.dataAccess.submitSocialMediaLinks(restaurant.id, links);
        await this.showToast(
          'Social media links saved successfully.',
          'success',
        );
      } catch {
        await this.showToast(
          'Something went wrong. Please try again.',
          'danger',
        );
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

  private async showToast(
    message: string,
    color: 'success' | 'danger',
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
