import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Address, DaySchedule, Geopoint, Link } from 'model';
import { NavController, ToastController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class EditRestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toastController = inject(ToastController);

  restaurant = this.dataAccess.restaurant;

  gotoEditMenu(restaurantId: string, menuId: string | undefined): void {
    if (menuId) {
      void this.navController.navigateForward([
        'restaurant',
        restaurantId,
        'menu',
        menuId,
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

  async submitDescription(description: string): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      try {
        await this.dataAccess.submitDescription(restaurant.id, description);
        await this.showToast('About restaurant saved successfully.', 'success');
      } catch {
        await this.showToast(
          'Something went wrong. Please try again.',
          'danger',
        );
      }
    }
  }

  async submitOpeningHours(openingHours: DaySchedule[]): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      try {
        await this.dataAccess.submitOpeningHours(restaurant.id, openingHours);
        await this.showToast('Opening hours saved successfully.', 'success');
      } catch {
        await this.showToast(
          'Something went wrong. Please try again.',
          'danger',
        );
      }
    }
  }

  async submitAddress(address: Address): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      try {
        await this.dataAccess.submitAddress(restaurant.id, address);
        await this.showToast('Address saved successfully.', 'success');
      } catch {
        await this.showToast(
          'Something went wrong. Please try again.',
          'danger',
        );
      }
    }
  }

  async submitPosition(position: Geopoint): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      try {
        await this.dataAccess.submitPosition(restaurant.id, position);
        await this.showToast('Location saved successfully.', 'success');
      } catch {
        await this.showToast(
          'Something went wrong. Please try again.',
          'danger',
        );
      }
    }
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
