import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { BITE_TRIBE_ROLES, BiteTribeRole } from 'utils';
import { AdminUser } from 'bite-tribe-admin/user-management-data-access';

/**
 * Two columns: the accounts on the left, the selected account's form on the
 * right.
 *
 * The columns carry explicit flex values rather than the `ion-flex-2` class the
 * business dashboard uses. Ionic ships `.ion-flex-1` but **no** `.ion-flex-2`,
 * so that class does nothing and those columns are equal by accident; copying
 * it here would silently give a 1:1 split rather than the 1:2 asked for.
 *
 * Only the roles are editable. The identity fields are read-only because
 * nothing on the backend writes them: `setUserRoles` is the one admin write
 * that exists, and a form offering to change an email it cannot save would be
 * a lie (issue #1469).
 */
@Component({
  selector: 'lib-user-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonCheckbox,
    IonButton,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent {
  readonly users = input<AdminUser[]>([]);
  readonly loading = input(false);
  readonly saving = input(false);
  readonly selected = input<AdminUser | undefined>(undefined);

  readonly selectUser = output<AdminUser>();
  readonly save = output<{ uid: string; roles: BiteTribeRole[] }>();
  readonly logoutClick = output<void>();

  readonly allRoles = BITE_TRIBE_ROLES;

  /**
   * The roles as edited, before saving.
   *
   * Seeded from the selected account and cleared whenever the selection
   * changes, so switching accounts mid-edit cannot carry one account's pending
   * roles onto another.
   */
  private readonly draft = signal<BiteTribeRole[] | undefined>(undefined);

  private readonly selectedUid = computed(() => this.selected()?.uid);

  readonly draftRoles = computed<BiteTribeRole[]>(() => {
    // Reading the uid registers the dependency that resets the draft.
    const uid = this.selectedUid();
    const pending = this.draft();

    return uid && pending ? pending : (this.selected()?.roles ?? []);
  });

  readonly dirty = computed(() => {
    const original = [...(this.selected()?.roles ?? [])].sort();
    const current = [...this.draftRoles()].sort();

    return JSON.stringify(original) !== JSON.stringify(current);
  });

  onSelect(user: AdminUser): void {
    this.draft.set(undefined);
    this.selectUser.emit(user);
  }

  toggleRole(role: BiteTribeRole, checked: boolean): void {
    const current = this.draftRoles();

    this.draft.set(
      checked
        ? [...new Set([...current, role])]
        : current.filter((held) => held !== role),
    );
  }

  holds(role: BiteTribeRole): boolean {
    return this.draftRoles().includes(role);
  }

  onSave(): void {
    const user = this.selected();

    if (!user) {
      return;
    }

    this.save.emit({ uid: user.uid, roles: this.draftRoles() });
    this.draft.set(undefined);
  }
}
