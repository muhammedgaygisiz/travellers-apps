import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Restaurant, RestaurantClaimStatus } from 'model';
import { PageComponent } from 'common/ui/page';
import { AdminUser } from 'bite-tribe-admin/user-management-data-access';
import { RestaurantStaffMember } from 'bite-tribe-admin/restaurants-data-access';

/** The role an account has to hold before a restaurant can be assigned to it. */
const OWNER_ROLE = 'business';

/**
 * Accepts anything with an `@` and a dot after it, and nothing else.
 *
 * The callable is the authority on whether an account exists; this only stops
 * the obvious typo from costing a round trip. The same pattern the business
 * app's staff form uses, for the same reason.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Two columns: the restaurants on the left, the selected one's ownership on the
 * right.
 *
 * The same shape as user management, and for the same reason: finding the thing
 * and acting on it are one errand, so a filter and the form it feeds belong on
 * one surface rather than either side of a navigation (issue #1476).
 *
 * Both lists are filtered in the browser rather than queried. Every restaurant
 * and every account is already loaded — the account list follows the callable's
 * page token to the end, and the restaurant collection is read whole — so
 * matching them is display logic, and a filter that covered a prefix would
 * answer "no such restaurant" for one that exists.
 *
 * **Assign and revoke are not one toggle.** A restaurant that already has an
 * owner offers no account picker at all: reassignment is revoke and then
 * assign, so the operator log carries a reason for the removal and a reason for
 * the grant rather than one write that quietly replaced an accountable party.
 * The callable refuses the reassignment too and stays the authority; this is so
 * the refusal reads as the shape of the form rather than as a failed save.
 *
 * Only accounts holding `business` are offered, because only those can act on
 * the restaurant afterwards — every business-app route is gated on the role, so
 * an assignment to an account without it names an owner who cannot open what
 * they own.
 */
@Component({
  selector: 'lib-restaurant-ownership',
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
    IonRadioGroup,
    IonRadio,
    IonInput,
    IonSearchbar,
    IonButton,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './restaurant-ownership.html',
  styleUrl: './restaurant-ownership.scss',
})
export class RestaurantOwnership {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  readonly restaurants = input<Restaurant[]>([]);

  /**
   * Every account, not only the assignable ones.
   *
   * The picker offers the `business` half, but the owner of an already-assigned
   * restaurant has to be nameable even after their role was revoked — and that
   * is exactly the restaurant an operator is looking at when something is
   * wrong.
   */
  readonly accounts = input<AdminUser[]>([]);
  readonly loading = input(false);
  readonly saving = input(false);
  readonly selected = input<Restaurant | undefined>(undefined);

  /**
   * The staff on the selected restaurant (issue #1537).
   *
   * The operator surface exists as the way back: a restaurant that removed its
   * last account with access cannot fix that from the business app, because
   * the route that would let it is gated on holding the restaurant. It is not
   * gated on the restaurant being assigned at all - an unowned restaurant can
   * be given staff, which is the case an operator is most likely to meet.
   */
  readonly staff = input<RestaurantStaffMember[]>([]);
  readonly staffLoading = input(false);
  readonly staffSaving = input(false);

  readonly selectRestaurant = output<Restaurant>();
  readonly assign = output<{
    restaurantId: string;
    ownerUserId: string;
    reason: string;
  }>();
  readonly revoke = output<{ restaurantId: string; reason: string }>();
  readonly addStaff = output<{ restaurantId: string; email: string }>();
  readonly removeStaff = output<{
    restaurantId: string;
    member: RestaurantStaffMember;
  }>();
  readonly logoutClick = output<void>();

  readonly filter = signal('');
  readonly accountFilter = signal('');
  readonly reason = signal('');
  readonly staffEmail = signal('');

  private readonly ownerDraft = signal<string | undefined>(undefined);

  private readonly selectedId = computed(() => this.selected()?.id);

  /**
   * The restaurants that match, or all of them when nothing is typed.
   *
   * Matched on name and id together, for the reason the account filter matches
   * on three fields: an operator is handed one string and does not always know
   * which of them it is.
   */
  readonly visibleRestaurants = computed<Restaurant[]>(() => {
    const term = this.filter().trim().toLocaleLowerCase();

    if (!term) {
      return this.restaurants();
    }

    return this.restaurants().filter((restaurant) =>
      [restaurant.name, restaurant.id].some((field) =>
        (field ?? '').toLocaleLowerCase().includes(term),
      ),
    );
  });

  /**
   * Distinguishes "there are no restaurants" from "none of them match": the two
   * read identically as an empty list and mean opposite things.
   */
  readonly filtered = computed(() => this.filter().trim().length > 0);

  /** The accounts an assignment may point at, narrowed by what was typed. */
  readonly assignableAccounts = computed<AdminUser[]>(() => {
    const term = this.accountFilter().trim().toLocaleLowerCase();
    const business = this.accounts().filter((account) =>
      account.roles.includes(OWNER_ROLE),
    );

    if (!term) {
      return business;
    }

    return business.filter((account) =>
      [account.email, account.displayName, account.uid].some((field) =>
        field.toLocaleLowerCase().includes(term),
      ),
    );
  });

  readonly accountFiltered = computed(
    () => this.accountFilter().trim().length > 0,
  );

  readonly ownerUserId = computed(() => this.selected()?.ownerUserId ?? '');

  readonly assigned = computed(() => !!this.ownerUserId());

  readonly draftOwnerUserId = computed<string | undefined>(() => {
    // Reading the id registers the dependency that resets the draft.
    const id = this.selectedId();
    const pending = this.ownerDraft();

    return id ? pending : undefined;
  });

  /**
   * Both actions are gated on a reason as well as on a target, because both
   * callables require one: Cloud Logging is the only record an ownership change
   * leaves, and a rejected call is a worse way to learn that than a disabled
   * button.
   */
  readonly canAssign = computed(
    () =>
      !this.assigned() &&
      !!this.draftOwnerUserId() &&
      this.reason().trim().length > 0,
  );

  readonly canRevoke = computed(
    () => this.assigned() && this.reason().trim().length > 0,
  );

  /** A missing `claimStatus` means `unclaimed`, by the rule on the model. */
  claimStatusOf(restaurant: Restaurant): RestaurantClaimStatus {
    return restaurant.claimStatus ?? 'unclaimed';
  }

  claimStatusKey(restaurant: Restaurant): string {
    return `admin-restaurant-ownership-status-${this.claimStatusOf(restaurant)}`;
  }

  claimStatusColor(restaurant: Restaurant): string {
    return this.claimStatusOf(restaurant) === 'claimed' ? 'success' : 'medium';
  }

  /**
   * How an account reads to an operator.
   *
   * Falls back to the uid rather than to an empty label: an owner whose account
   * is no longer in the list is still an owner, and a blank line would read as
   * "unowned" on the one screen where that distinction is the whole point.
   */
  accountLabel(uid: string): string {
    const account = this.accounts().find((candidate) => candidate.uid === uid);

    return account?.email || account?.displayName || uid;
  }

  onFilterChange(term: string): void {
    this.filter.set(term);
  }

  onAccountFilterChange(term: string): void {
    this.accountFilter.set(term);
  }

  onReasonChange(reason: string): void {
    this.reason.set(reason);
  }

  readonly canAddStaff = computed(
    () => EMAIL_PATTERN.test(this.staffEmail().trim()) && !this.staffSaving(),
  );

  /** Email first, uid only when there is nothing better — never a blank line. */
  staffLabel(member: RestaurantStaffMember): string {
    return member.email || member.displayName || member.uid;
  }

  onStaffEmailChange(email: string): void {
    this.staffEmail.set(email);
  }

  onAddStaff(): void {
    const restaurant = this.selected();

    if (!restaurant || !this.canAddStaff()) {
      return;
    }

    this.addStaff.emit({
      restaurantId: restaurant.id,
      email: this.staffEmail().trim(),
    });
    this.staffEmail.set('');
  }

  async onRemoveStaff(member: RestaurantStaffMember): Promise<void> {
    const restaurant = this.selected();

    if (!restaurant) {
      return;
    }

    const alert = await this.alertController.create({
      header: this.transloco.translate(
        'admin-restaurant-staff-remove-confirm-title',
      ),
      subHeader: `${restaurant.name} — ${this.staffLabel(member)}`,
      message: this.transloco.translate(
        'admin-restaurant-staff-remove-confirm-message',
      ),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('admin-restaurant-staff-remove'),
          role: 'destructive',
          handler: (): void =>
            this.removeStaff.emit({ restaurantId: restaurant.id, member }),
        },
      ],
    });

    await alert.present();
  }

  onSelect(restaurant: Restaurant): void {
    this.ownerDraft.set(undefined);
    this.accountFilter.set('');
    this.reason.set('');
    this.staffEmail.set('');
    this.selectRestaurant.emit(restaurant);
  }

  onOwnerChange(uid: string): void {
    this.ownerDraft.set(uid);
  }

  onAssign(): void {
    const restaurant = this.selected();
    const ownerUserId = this.draftOwnerUserId();

    if (!restaurant || !ownerUserId || !this.canAssign()) {
      return;
    }

    this.assign.emit({
      restaurantId: restaurant.id,
      ownerUserId,
      reason: this.reason().trim(),
    });
    this.ownerDraft.set(undefined);
    this.reason.set('');
  }

  /**
   * Revoking confirms first.
   *
   * It is the one action here that takes something away, and it sits under the
   * same reason field the assignment uses. The alert repeats the restaurant and
   * the account rather than trusting that the form behind it is still the one
   * being read — the same shape blocking an account uses (issue #1474).
   */
  async onRevoke(): Promise<void> {
    const restaurant = this.selected();

    if (!restaurant || !this.canRevoke()) {
      return;
    }

    const reason = this.reason().trim();
    const alert = await this.alertController.create({
      header: this.transloco.translate(
        'admin-restaurant-ownership-revoke-confirm-title',
      ),
      subHeader: `${restaurant.name} — ${this.accountLabel(this.ownerUserId())}`,
      message: this.transloco.translate(
        'admin-restaurant-ownership-revoke-confirm-message',
      ),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('admin-restaurant-ownership-revoke'),
          role: 'destructive',
          handler: (): void => {
            this.revoke.emit({ restaurantId: restaurant.id, reason });
            this.reason.set('');
          },
        },
      ],
    });

    await alert.present();
  }
}
