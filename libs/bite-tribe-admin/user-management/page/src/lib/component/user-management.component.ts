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
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import {
  BITE_TRIBE_ROLES,
  BiteTribeRole,
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
} from 'utils';
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
 * The roles and the subscription tier are editable; the identity fields are
 * read-only because nothing on the backend writes them, and a form offering to
 * change an email it cannot save would be a lie (issue #1469).
 *
 * Roles and tier save separately, through separate callables, rather than
 * through one button. The epic keeps blocking separate from content removal for
 * the same reason: an action with more consequences than its label admits is
 * harder to reason about and harder to undo (issue #1485).
 *
 * Finding an account happens here rather than on a search page of its own,
 * because finding it and acting on it are the same errand: an operator who was
 * given an email opens this page, types it, and is looking at the form. A
 * separate surface would put a navigation between the two halves of one task
 * (issue #1476).
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
    IonRadioGroup,
    IonRadio,
    IonInput,
    IonSearchbar,
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
  readonly savingTier = input(false);
  readonly selected = input<AdminUser | undefined>(undefined);

  readonly selectUser = output<AdminUser>();
  readonly save = output<{ uid: string; roles: BiteTribeRole[] }>();
  readonly saveTier = output<{
    uid: string;
    tier: SubscriptionTier;
    reason: string;
  }>();
  readonly logoutClick = output<void>();

  readonly allRoles = BITE_TRIBE_ROLES;
  readonly allTiers = SUBSCRIPTION_TIERS;

  /**
   * What the operator typed to narrow the account list.
   *
   * Held here rather than emitted, because the list it filters is already
   * loaded in full: the data-access service follows the callable's page token
   * until there is none, so every account is in memory and matching them is
   * display logic rather than a query (issue #1476).
   *
   * **An operator sees private profiles.** This filters the admin-only account
   * list, which reads Firebase Auth joined with `/users`; it does not call
   * `searchUsers`, whose `public === true` filter is a consumer-facing privacy
   * control. That is the whole answer to how the two relate: the consumer
   * callable is untouched, so nothing this adds changes what one BiteTribe user
   * can find out about another.
   */
  readonly filter = signal('');

  /**
   * The accounts that match, or all of them when nothing is typed.
   *
   * Matched on email, display name and uid together rather than through a field
   * picker. An operator is handed one string by whoever reported the problem and
   * does not always know which of the three it is, and a picker set to the wrong
   * field answers "no such account" for an account that is right there.
   *
   * The uid is included because a reported id should still resolve, not because
   * an operator is expected to have one: nothing here requires knowing an id.
   */
  readonly visibleUsers = computed<AdminUser[]>(() => {
    const term = this.filter().trim().toLocaleLowerCase();

    if (!term) {
      return this.users();
    }

    return this.users().filter((user) =>
      [user.email, user.displayName, user.uid].some((field) =>
        field.toLocaleLowerCase().includes(term),
      ),
    );
  });

  /**
   * Distinguishes "this project has no accounts" from "none of them match".
   *
   * The two read identically as an empty list and mean opposite things: one is a
   * broken load, the other is a term to retype.
   */
  readonly filtered = computed(() => this.filter().trim().length > 0);

  /**
   * The roles as edited, before saving.
   *
   * Seeded from the selected account and cleared whenever the selection
   * changes, so switching accounts mid-edit cannot carry one account's pending
   * roles onto another.
   */
  private readonly draft = signal<BiteTribeRole[] | undefined>(undefined);

  /**
   * The tier as edited, and the reason for changing it.
   *
   * Both are cleared when the selection changes, so a reason typed for one
   * account cannot be submitted against another.
   */
  private readonly tierDraft = signal<SubscriptionTier | undefined>(undefined);

  readonly tierReason = signal('');

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

  readonly currentTier = computed<SubscriptionTier | null>(
    () => this.selected()?.subscriptionTier ?? null,
  );

  readonly draftTier = computed<SubscriptionTier | null>(() => {
    // Reading the uid registers the dependency that resets the draft.
    const uid = this.selectedUid();
    const pending = this.tierDraft();

    return uid && pending !== undefined ? pending : this.currentTier();
  });

  readonly tierDirty = computed(() => this.draftTier() !== this.currentTier());

  /**
   * The tier save is gated on a reason as well as on a change, because the
   * callable requires one: Cloud Logging is the only record the action leaves,
   * and a rejected call is a worse way to learn that than a disabled button.
   */
  readonly canSaveTier = computed(
    () =>
      this.tierDirty() &&
      this.draftTier() !== null &&
      this.tierReason().trim().length > 0,
  );

  onFilterChange(term: string): void {
    this.filter.set(term);
  }

  onSelect(user: AdminUser): void {
    this.draft.set(undefined);
    this.tierDraft.set(undefined);
    this.tierReason.set('');
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

  onTierChange(tier: SubscriptionTier): void {
    this.tierDraft.set(tier);
  }

  onTierReasonChange(reason: string): void {
    this.tierReason.set(reason);
  }

  onSaveTier(): void {
    const user = this.selected();
    const tier = this.draftTier();

    if (!user || tier === null || !this.canSaveTier()) {
      return;
    }

    this.saveTier.emit({
      uid: user.uid,
      tier,
      reason: this.tierReason().trim(),
    });
    this.tierDraft.set(undefined);
    this.tierReason.set('');
  }

  /**
   * The label for a tier, including the absent one.
   *
   * `null` is not Free. An account with no `/users` document, or one whose
   * document predates the tier being written, has no tier at all, and the two
   * read differently to an operator deciding whether to change anything.
   */
  tierLabelKey(tier: SubscriptionTier | null): string {
    if (tier === null) {
      return 'admin-users-tier-none';
    }

    return tier === 1 ? 'admin-users-tier-pro' : 'admin-users-tier-free';
  }
}
