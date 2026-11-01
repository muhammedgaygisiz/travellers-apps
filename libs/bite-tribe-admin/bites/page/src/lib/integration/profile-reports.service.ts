import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { ReportedUser } from 'model';
import { UserReportsDataAccessService } from 'bite-tribe-admin/bites-data-access';

/** The action under way on the selected profile, if any. */
export type ProfileReportAction = 'block' | 'dismiss';

/**
 * Runs the operator's queue of reported profiles and holds what it shows
 * (GitHub issue #1829).
 *
 * The same shape as `BiteReportsService`: the selection is resolved out of the
 * list, so a profile that left the queue cannot linger in the detail column.
 */
@Injectable({ providedIn: 'root' })
export class ProfileReportsService {
  private readonly dataAccess = inject(UserReportsDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toastService = inject(ToastService);

  private readonly found = signal<ReportedUser[]>([]);
  private readonly selectedId = signal<string | undefined>(undefined);

  readonly loading = signal(false);
  readonly loaded = signal(false);
  /** Surfaced rather than swallowed: a failed load is not an empty queue. */
  readonly failed = signal(false);
  readonly truncated = signal(false);
  readonly action = signal<ProfileReportAction | undefined>(undefined);

  readonly reports = computed<ReportedUser[]>(() => this.found());

  readonly selected = computed<ReportedUser | undefined>(() => {
    const id = this.selectedId();

    return id ? this.found().find((user) => user.uid === id) : undefined;
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);

    try {
      const { users, truncated } = await this.dataAccess.list();

      this.found.set(users);
      this.truncated.set(truncated);
    } catch (error) {
      console.error('Failed to load the reported profiles:', error);
      this.found.set([]);
      this.truncated.set(false);
      this.failed.set(true);
    } finally {
      this.loaded.set(true);
      this.loading.set(false);
    }
  }

  select(user: ReportedUser): void {
    this.selectedId.set(user.uid);
  }

  /**
   * Blocks the account. The profile stays in the queue, now marked as
   * blocked, until the operator closes its reports.
   */
  async blockAccount(uid: string): Promise<void> {
    await this.run(
      'block',
      () => this.dataAccess.blockAccount(uid),
      'admin-profile-reports-blocked',
      'admin-profile-reports-block-failed',
      () =>
        this.found.update((users) =>
          users.map((user) =>
            user.uid === uid ? { ...user, blocked: true } : user,
          ),
        ),
    );
  }

  /** Closes the reports on the profile, which then leaves the queue. */
  async dismiss(uid: string, reason: string): Promise<void> {
    await this.run(
      'dismiss',
      () => this.dataAccess.dismiss(uid, reason),
      'admin-profile-reports-dismissed',
      'admin-profile-reports-dismiss-failed',
      () => this.found.update((users) => users.filter((u) => u.uid !== uid)),
    );
  }

  logout(): void {
    this.storeService.logout();
  }

  private async run(
    action: ProfileReportAction,
    call: () => Promise<unknown>,
    successKey: string,
    failureKey: string,
    onSuccess: () => void,
  ): Promise<void> {
    this.action.set(action);

    try {
      await call();
      onSuccess();
      await this.toastService.present({
        messageKey: successKey,
        outcome: 'success',
      });
    } catch (error) {
      console.error(`Failed to ${action} on a reported profile:`, error);
      await this.toastService.present({
        messageKey: failureKey,
        outcome: 'failure',
      });
    } finally {
      this.action.set(undefined);
    }
  }
}
