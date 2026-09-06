import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { BiteTribeRole } from 'utils';
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

  readonly users = computed<AdminUser[]>(
    () => this.dataAccess.users.value() ?? [],
  );

  readonly loading = computed(() => this.dataAccess.users.isLoading());

  readonly saving = computed(() => this.savingUid() !== undefined);

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

  logout(): void {
    this.storeService.logout();
  }
}
