import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { BiteTribeRole, SubscriptionTier } from 'utils';
import {
  AdminUser,
  UserManagementDataAccessService,
} from 'bite-tribe-admin/user-management-data-access';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly dataAccess = inject(UserManagementDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toastService = inject(ToastService);

  private readonly selectedUid = signal<string | undefined>(undefined);
  private readonly savingUid = signal<string | undefined>(undefined);
  private readonly savingTierUid = signal<string | undefined>(undefined);

  readonly users = computed<AdminUser[]>(
    () => this.dataAccess.users.value() ?? [],
  );

  readonly loading = computed(() => this.dataAccess.users.isLoading());

  readonly saving = computed(() => this.savingUid() !== undefined);

  readonly savingTier = computed(() => this.savingTierUid() !== undefined);

  /**
   * Resolved from the list rather than held as its own copy, so a save that
   * reloads the list leaves the form showing what was actually stored rather
   * than what was submitted.
   */
  readonly selected = computed<AdminUser | undefined>(() => {
    const uid = this.selectedUid();

    return uid ? this.users().find((user) => user.uid === uid) : undefined;
  });

  select(user: AdminUser): void {
    this.selectedUid.set(user.uid);
  }

  async save(uid: string, roles: BiteTribeRole[]): Promise<void> {
    this.savingUid.set(uid);

    try {
      await this.dataAccess.setRoles(uid, roles);
      this.dataAccess.reload();
      await this.toastService.present({
        messageKey: 'admin-users-saved',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to save roles:', error);
      await this.toastService.present({
        messageKey: 'admin-users-save-failed',
        outcome: 'failure',
      });
    } finally {
      this.savingUid.set(undefined);
    }
  }

  /**
   * Writes an account's subscription tier.
   *
   * Its own action rather than part of `save`, because it is its own callable
   * and its own decision: an operator changing what a restaurant may do is not
   * granting anyone Pro (issue #1485).
   */
  async saveSubscriptionTier(
    uid: string,
    tier: SubscriptionTier,
    reason: string,
  ): Promise<void> {
    this.savingTierUid.set(uid);

    try {
      await this.dataAccess.setSubscriptionTier(uid, tier, reason);
      this.dataAccess.reload();
      await this.toastService.present({
        messageKey: 'admin-users-tier-saved',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to save the subscription tier:', error);
      await this.toastService.present({
        messageKey: 'admin-users-tier-save-failed',
        outcome: 'failure',
      });
    } finally {
      this.savingTierUid.set(undefined);
    }
  }

  logout(): void {
    this.storeService.logout();
  }
}
