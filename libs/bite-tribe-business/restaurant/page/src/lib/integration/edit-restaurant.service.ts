import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe-business/restaurant-data-access';
import { Address, DaySchedule, Geopoint, Link } from 'model';
import { NavController } from '@ionic/angular/standalone';
import { ToastService } from 'toast';

@Injectable({ providedIn: 'root' })
export class EditRestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);

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

  async submitDescription(description: string): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      try {
        await this.dataAccess.submitDescription(restaurant.id, description);
        await this.toast.present({
          messageKey: 'about-restaurant-saved',
          outcome: 'success',
        });
      } catch {
        await this.showFailureToast();
      }
    }
  }

  async submitOpeningHours(openingHours: DaySchedule[]): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      try {
        await this.dataAccess.submitOpeningHours(restaurant.id, openingHours);
        await this.toast.present({
          messageKey: 'opening-hours-saved',
          outcome: 'success',
        });
      } catch {
        await this.showFailureToast();
      }
    }
  }

  async submitAddress(address: Address): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      try {
        await this.dataAccess.submitAddress(restaurant.id, address);
        await this.toast.present({
          messageKey: 'address-saved',
          outcome: 'success',
        });
      } catch {
        await this.showFailureToast();
      }
    }
  }

  async submitPosition(position: Geopoint): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      try {
        await this.dataAccess.submitPosition(restaurant.id, position);
        await this.toast.present({
          messageKey: 'location-saved',
          outcome: 'success',
        });
      } catch {
        await this.showFailureToast();
      }
    }
  }

  private showFailureToast(): Promise<void> {
    return this.toast.present({
      messageKey: 'something-went-wrong-please-try-again',
      outcome: 'failure',
    });
  }
}
