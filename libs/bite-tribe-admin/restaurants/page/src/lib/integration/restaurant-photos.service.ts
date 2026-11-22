import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { RestaurantsDataAccessService } from 'bite-tribe-admin/restaurants-data-access';
import { photoRefusalReasonKey } from 'bite-tribe-common/bite';
import { ToastService } from 'toast';

/**
 * Attaching a photo to a restaurant that has none (GitHub issue #1510).
 *
 * A restaurant with an owner gets its photo in the business app, where the
 * setup checklist asks for it. One with no owner - created by verification
 * before anyone held it - could be fixed from no app at all; this is the
 * operator's way to.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantPhotosService {
  private readonly dataAccess = inject(RestaurantsDataAccessService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly restaurants = this.dataAccess.restaurantsWithoutPhoto;
  readonly loading = computed(() => this.dataAccess.restaurants.isLoading());

  /** The restaurant whose photo is uploading or being checked. */
  readonly attachingId = signal<string | undefined>(undefined);

  /**
   * Uploads the photo and says what became of it. Only the image check
   * publishes it, so a passed photo takes the restaurant off the list, a
   * refused one says why, and one still being checked says so.
   */
  async attach(restaurantId: string, photo: string): Promise<void> {
    if (this.attachingId()) {
      return;
    }

    this.attachingId.set(restaurantId);

    try {
      const verdict = await this.dataAccess.attachRestaurantPhoto(
        restaurantId,
        photo,
      );

      if (verdict?.imageStatus === 'uploaded') {
        await this.toast.present({
          messageKey: 'restaurant-photos-attached',
          outcome: 'success',
        });
      } else if (verdict?.imageStatus === 'refused') {
        await this.toast.present({
          message: `${this.transloco.translate('restaurant-photos-refused')} ${this.transloco.translate(photoRefusalReasonKey(verdict.imageRefusalCategory))}`,
          outcome: 'failure',
        });
      } else {
        await this.toast.present({
          messageKey: 'restaurant-photos-checking',
          outcome: 'success',
        });
      }
    } catch {
      await this.toast.present({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    } finally {
      this.attachingId.set(undefined);
    }
  }

  logout(): void {
    this.dataAccess.logout();
  }
}
