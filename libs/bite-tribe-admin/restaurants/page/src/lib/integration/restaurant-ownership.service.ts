import { computed, inject, Injectable, signal } from '@angular/core';
import { Restaurant } from 'model';
import { ToastService } from 'toast';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { RestaurantsDataAccessService } from 'bite-tribe-admin/restaurants-data-access';
import {
  AdminUser,
  UserManagementDataAccessService,
} from 'bite-tribe-admin/user-management-data-access';

/**
 * The operator's side of restaurant ownership: which restaurant, which account,
 * and the reason that goes into the log with both.
 *
 * The accounts come from the user-management data-access rather than from a
 * search of its own. It is the only reader of `listUsersWithRoles`, which is
 * the only thing that knows which accounts hold `business` — roles are custom
 * claims, so no Firestore query can answer it — and issue #1476 already made it
 * load every page rather than the first. A second account list here would be a
 * third way to find an account and the one most likely to disagree.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantOwnershipService {
  private readonly dataAccess = inject(RestaurantsDataAccessService);
  private readonly accountsDataAccess = inject(UserManagementDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toastService = inject(ToastService);

  private readonly selectedId = signal<string | undefined>(undefined);
  private readonly savingId = signal<string | undefined>(undefined);

  readonly restaurants = this.dataAccess.restaurantsValue;

  readonly accounts = computed<AdminUser[]>(
    () => this.accountsDataAccess.users.value() ?? [],
  );

  readonly loading = computed(
    () =>
      this.dataAccess.restaurants.isLoading() ||
      this.accountsDataAccess.users.isLoading(),
  );

  readonly saving = computed(() => this.savingId() !== undefined);

  /**
   * Resolved from the list rather than held as its own copy, so a save that
   * reloads the list leaves the form showing what was actually stored rather
   * than what was submitted.
   */
  readonly selected = computed<Restaurant | undefined>(() => {
    const id = this.selectedId();

    return id
      ? this.restaurants().find((restaurant) => restaurant.id === id)
      : undefined;
  });

  select(restaurant: Restaurant): void {
    this.selectedId.set(restaurant.id);
  }

  /**
   * The toast distinguishes the assignment from the idempotent repeat.
   *
   * "Saved" would be true of both and useful for neither: an operator who
   * clicked twice, or who was beaten to it, should be told that nothing was
   * written rather than shown the success of a write that did not happen.
   */
  async assign(
    restaurantId: string,
    ownerUserId: string,
    reason: string,
  ): Promise<void> {
    this.savingId.set(restaurantId);

    try {
      const result = await this.dataAccess.assignRestaurantOwner(
        restaurantId,
        ownerUserId,
        reason,
      );

      await this.toastService.present({
        messageKey:
          result.status === 'assigned'
            ? 'admin-restaurant-ownership-assigned'
            : 'admin-restaurant-ownership-already-assigned',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to assign the restaurant owner:', error);
      await this.toastService.present({
        messageKey: 'admin-restaurant-ownership-assign-failed',
        outcome: 'failure',
      });
    } finally {
      this.savingId.set(undefined);
    }
  }

  async revoke(restaurantId: string, reason: string): Promise<void> {
    this.savingId.set(restaurantId);

    try {
      await this.dataAccess.revokeRestaurantOwner(restaurantId, reason);
      await this.toastService.present({
        messageKey: 'admin-restaurant-ownership-revoked',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to revoke the restaurant owner:', error);
      await this.toastService.present({
        messageKey: 'admin-restaurant-ownership-revoke-failed',
        outcome: 'failure',
      });
    } finally {
      this.savingId.set(undefined);
    }
  }

  logout(): void {
    this.storeService.logout();
  }
}
