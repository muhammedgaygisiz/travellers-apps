import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  RestaurantStaffDataAccessService,
  RestaurantStaffMember,
} from 'bite-tribe-business/staff-data-access';
import { ToastService } from 'toast';

/**
 * The workflow half of the staff surface: which restaurant, and what each
 * outcome of the two callables means to the person who clicked.
 *
 * Every failure is reported as a toast rather than as an error screen. All of
 * them are ordinary and recoverable — a mistyped address, an account that
 * already works somewhere else, an account that turns out to be an operator —
 * and the list behind the form is still correct in every one of those cases.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantStaffService {
  private readonly dataAccess = inject(RestaurantStaffDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toast = inject(ToastService);

  private readonly pending = signal(false);

  readonly staff = this.dataAccess.staffValue;
  readonly loading = computed(() => this.dataAccess.staff.isLoading());
  readonly saving = this.pending.asReadonly();
  readonly restaurantName = computed(
    () => this.dataAccess.restaurantValue()?.name ?? '',
  );

  readonly isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  /**
   * The toast distinguishes the grant from the idempotent repeat.
   *
   * "Saved" would be true of both and useful for neither: an owner who added
   * the same person twice should be told that nothing was written rather than
   * shown the success of a write that did not happen. The same rule the
   * ownership surface follows for `already-assigned`.
   */
  async addStaff(email: string): Promise<void> {
    const restaurantId = this.dataAccess.restaurantId();

    if (!restaurantId) {
      return;
    }

    this.pending.set(true);

    try {
      const result = await this.dataAccess.addStaff(restaurantId, email);

      await this.toast.present({
        messageKey:
          result.status === 'added' ? 'staff-added' : 'staff-already-added',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to add the staff account:', error);
      await this.toast.present({
        messageKey: 'staff-add-failed',
        outcome: 'failure',
      });
    } finally {
      this.pending.set(false);
    }
  }

  async removeStaff(member: RestaurantStaffMember): Promise<void> {
    const restaurantId = this.dataAccess.restaurantId();

    if (!restaurantId) {
      return;
    }

    this.pending.set(true);

    try {
      await this.dataAccess.removeStaff(restaurantId, member.uid);
      await this.toast.present({
        messageKey: 'staff-removed',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to remove the staff account:', error);
      await this.toast.present({
        messageKey: 'staff-remove-failed',
        outcome: 'failure',
      });
    } finally {
      this.pending.set(false);
    }
  }

  logout(): void {
    this.storeService.logout();
  }
}
