import { computed, inject, Injectable, resource } from '@angular/core';
import {
  RestaurantDataAccessService,
  RestaurantImageUploadService,
} from 'bite-tribe-business/restaurant-data-access';
import {
  Address,
  DaySchedule,
  Geopoint,
  Link,
  RestaurantCategory,
  RestaurantSection,
  TableOrderingSettings,
} from 'model';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from 'toast';

@Injectable({ providedIn: 'root' })
export class EditRestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);
  private readonly photoUpload = inject(RestaurantImageUploadService);
  private readonly loadingController = inject(LoadingController);
  private readonly transloco = inject(TranslocoService);

  /** A section save is under way; a second one is not started (#2225). */
  private saving = false;

  restaurant = this.dataAccess.restaurant;
  gpsPosition = this.dataAccess.gpsPosition;

  /**
   * The Bites waiting for a link to a dish (GitHub issue #2216). Read again
   * whenever the restaurant changes, so coming back from Guest Bites shows
   * what is left. A failed read shows no count rather than an error: the
   * button still works.
   */
  readonly guestBitesToLink = resource({
    params: () => this.restaurant()?.id,
    loader: ({ params }) =>
      this.dataAccess.countBitesAwaitingMenuLink(params).catch(() => 0),
  });

  /** This session's photo upload, when it is for the restaurant on screen. */
  private readonly ownUpload = computed(() => {
    const upload = this.photoUpload.upload();

    return upload && upload.restaurantId === this.restaurant()?.id
      ? upload
      : undefined;
  });

  photoStatus = computed(() => this.photoUpload.statusFor(this.restaurant()));
  pendingPhoto = computed(() => this.ownUpload()?.photo);
  uploadedImagePath = computed(() => this.ownUpload()?.imagePath);
  canRetryPhoto = computed(() => !!this.ownUpload()?.photo);
  photoChecking = computed(() => !!this.ownUpload()?.checking);
  photoRefusalCategory = computed(() =>
    this.photoUpload.refusalCategoryFor(this.restaurant()),
  );

  /**
   * Starts the background upload of a newly chosen photo (GitHub issue
   * #2126). Not awaited: the page shows its progress from the upload service.
   */
  savePhoto(photo: string): void {
    const restaurant = this.restaurant();

    if (restaurant) {
      this.photoUpload.start(restaurant.id, photo);
    }
  }

  retryPhoto(): void {
    this.photoUpload.retry();
  }

  /**
   * Back to the restaurant's overview after a section is saved (GitHub issue
   * #2183). The navigation reads the restaurant again, so the overview shows
   * the value just saved.
   */
  backToOverview(restaurantId: string): void {
    void this.navController.navigateBack(['restaurant', restaurantId]);
  }

  /** Opens one section of the restaurant (GitHub issue #2183). */
  gotoSection(section: RestaurantSection): void {
    const restaurant = this.restaurant();

    if (restaurant) {
      void this.navController.navigateForward([
        'restaurant',
        restaurant.id,
        'edit',
        section,
      ]);
    }
  }

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

  gotoGuestBites(restaurantId: string, menuId: string | undefined): void {
    if (menuId) {
      void this.navController.navigateForward([
        'restaurant',
        restaurantId,
        'menu',
        menuId,
        'guest-bites',
      ]);
    }
  }

  gotoStaff(): void {
    const restaurant = this.restaurant();

    if (restaurant) {
      void this.navController.navigateForward([
        'restaurant',
        restaurant.id,
        'staff',
      ]);
    }
  }

  gotoFloorPlan(): void {
    const restaurant = this.restaurant();

    if (restaurant) {
      void this.navController.navigateForward([
        'restaurant',
        restaurant.id,
        'floor-plan',
      ]);
    }
  }

  gotoTablePlan(): void {
    const restaurant = this.restaurant();

    if (restaurant) {
      void this.navController.navigateForward([
        'restaurant',
        restaurant.id,
        'tables',
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
      await this.saveSection(restaurant.id, 'social-media-links-saved', () =>
        this.dataAccess.submitSocialMediaLinks(restaurant.id, links),
      );
    }
  }

  async submitDescription(description: string): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      await this.saveSection(restaurant.id, 'about-restaurant-saved', () =>
        this.dataAccess.submitDescription(restaurant.id, description),
      );
    }
  }

  async submitOpeningHours(openingHours: DaySchedule[]): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      await this.saveSection(restaurant.id, 'opening-hours-saved', () =>
        this.dataAccess.submitOpeningHours(restaurant.id, openingHours),
      );
    }
  }

  /**
   * Turning ordering at the table on, or leaving the menu readable without it
   * (GitHub issue #1102).
   *
   * The first writer `Restaurant.tableOrdering` has ever had. Issue #1100 added
   * the field and gated every scan on it, so until this existed a scan in
   * production always refused - the restaurant had no way to say yes.
   */
  async submitTableOrderingSettings(
    tableOrdering: TableOrderingSettings,
  ): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      await this.saveSection(restaurant.id, 'table-ordering-saved', () =>
        this.dataAccess.submitTableOrderingSettings(
          restaurant.id,
          tableOrdering,
        ),
      );
    }
  }

  /**
   * Whether the restaurant has a gender-neutral restroom (GitHub issue #1830).
   * `undefined` is the owner choosing "Not stated", and removes the field.
   */
  async submitGenderNeutralRestroom(
    genderNeutralRestroom: boolean | undefined,
  ): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      await this.saveSection(restaurant.id, 'facilities-saved', () =>
        this.dataAccess.submitGenderNeutralRestroom(
          restaurant.id,
          genderNeutralRestroom,
        ),
      );
    }
  }

  /** The kind of venue the restaurant states (GitHub issue #2131). */
  async submitCategories(categories: RestaurantCategory[]): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      await this.saveSection(restaurant.id, 'categories-saved', () =>
        this.dataAccess.submitCategories(restaurant.id, categories),
      );
    }
  }

  async submitAddress(address: Address): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      await this.saveSection(restaurant.id, 'address-saved', () =>
        this.dataAccess.submitAddress(restaurant.id, address),
      );
    }
  }

  async submitPosition(position: Geopoint): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant) {
      await this.saveSection(restaurant.id, 'location-saved', () =>
        this.dataAccess.submitPosition(restaurant.id, position),
      );
    }
  }

  /**
   * Saves one section (GitHub issue #2225): under the same overlay as the
   * menu editor's save (#1377), which tells the owner the write is under way
   * and covers the page, so Save cannot be pressed twice. A press that still
   * arrives while a save runs is ignored. A refused write ends the overlay
   * and shows the failure toast on the section, with the owner's edit kept.
   */
  private async saveSection(
    restaurantId: string,
    savedKey: string,
    write: () => Promise<unknown>,
  ): Promise<void> {
    if (this.saving) {
      return;
    }

    this.saving = true;
    const loading = await this.loadingController.create({
      message: this.transloco.translate('restaurant-saving'),
      backdropDismiss: false,
    });
    await loading.present();

    try {
      await write();
    } catch {
      await loading.dismiss();
      this.saving = false;
      await this.showFailureToast();

      return;
    }

    await loading.dismiss();
    this.saving = false;
    await this.toast.present({ messageKey: savedKey, outcome: 'success' });
    this.backToOverview(restaurantId);
  }

  private showFailureToast(): Promise<void> {
    return this.toast.present({
      messageKey: 'something-went-wrong-please-try-again',
      outcome: 'failure',
    });
  }
}
