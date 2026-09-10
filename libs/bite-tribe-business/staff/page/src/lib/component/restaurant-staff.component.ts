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
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { RestaurantStaffMember } from 'bite-tribe-business/staff-data-access';

/**
 * Accepts anything with an `@` and a dot after it, and nothing else.
 *
 * The callable is the authority on whether an account exists; this only stops
 * the obvious typo from costing a round trip and a red toast. A stricter
 * pattern here would refuse valid addresses the backend would have accepted,
 * which is the worse failure on a form whose whole job is "add this person".
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The people who work at one restaurant, and the two things its owner can do
 * about that (issue #1537).
 *
 * The account is added **by email**, because that is the identifier the
 * restaurant has: the person is standing in front of them and a Firebase uid
 * is not something either of them knows. It has to be an account that already
 * exists — an email invitation that creates one is a separate problem with its
 * own abuse surface, and is out of scope.
 *
 * Removal confirms first, and says out loud that access does not end
 * instantly. A removed account keeps its ID token for up to an hour and is
 * then returned to the login page; an owner removing someone in a hurry needs
 * to know that, for the same reason the block surface says it (issue #1474).
 */
@Component({
  selector: 'bt-business-restaurant-staff',
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
    IonInput,
    IonButton,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './restaurant-staff.component.html',
  styleUrl: './restaurant-staff.component.scss',
})
export class RestaurantStaffComponent {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  readonly staff = input<RestaurantStaffMember[]>([]);
  readonly restaurantName = input('');
  readonly loading = input(false);
  readonly saving = input(false);
  readonly isAuthenticated = input(false);

  readonly addStaff = output<string>();
  readonly removeStaff = output<RestaurantStaffMember>();
  readonly logoutClick = output<void>();

  readonly email = signal('');

  readonly canAdd = computed(
    () => EMAIL_PATTERN.test(this.email().trim()) && !this.saving(),
  );

  /** Email first, uid only when the account has none — never a blank line. */
  label(member: RestaurantStaffMember): string {
    return member.email || member.displayName || member.uid;
  }

  onEmailChange(email: string): void {
    this.email.set(email);
  }

  onAdd(): void {
    if (!this.canAdd()) {
      return;
    }

    this.addStaff.emit(this.email().trim());
    this.email.set('');
  }

  async onRemove(member: RestaurantStaffMember): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('staff-remove-confirm-title'),
      subHeader: this.label(member),
      message: this.transloco.translate('staff-remove-confirm-message'),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('staff-remove'),
          role: 'destructive',
          handler: (): void => this.removeStaff.emit(member),
        },
      ],
    });

    await alert.present();
  }
}
