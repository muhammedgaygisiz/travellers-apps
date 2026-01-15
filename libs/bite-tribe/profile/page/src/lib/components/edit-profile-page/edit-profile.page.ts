import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonAlert,
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonTextarea,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { PublicUser, User } from 'model';
import type { OverlayEventDetail } from '@ionic/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

const STAY_PUBLIC = 'stay-public';
const GO_PRIVATE = 'go-private';

@Component({
  selector: 'edit-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'edit-profile.page.html',
  styleUrl: 'edit-profile.page.scss',
  imports: [
    PageComponent,
    IonContent,
    ReactiveFormsModule,
    IonItem,
    IonIcon,
    IonInput,
    IonLabel,
    IonTextarea,
    IonButton,
    IonAlert,
  ],
})
export class EditProfilePage {
  private readonly formBuilder = inject(FormBuilder);

  isAuthenticated = input(false);

  user = input<User>();

  publicUser = input<PublicUser>();

  isPublicProfile = input<boolean>();

  goPublic = output();
  goPrivate = output();
  submitPublicUser = output<PublicUser>();

  userImage = computed(() => {
    const user = this.user();

    const photoUrl =
      user?.photoUrl ||
      user?.providerData.find(
        (provider: { photoUrl?: string }) => provider.photoUrl,
      )?.photoUrl;

    return photoUrl;
  });

  displayName = effect(() => {
    const user = this.user();
    const publicUser = this.publicUser();

    this.profileForm.patchValue({
      displayName: publicUser?.displayName || user?.displayName || 'Anonymous',
    });
  });

  profileEffect = afterRenderEffect(() => {
    const publicUser = this.publicUser();
    if (publicUser) {
      this.profileForm.patchValue(publicUser);
    }
  });

  isOpen = signal(false);
  profileForm = this.formBuilder.group({
    displayName: [''],
    city: [''],
    about: [''],
    email: [''],
  });

  isFormInvalid = toSignal(
    this.profileForm.valueChanges.pipe(map(() => !this.profileForm.valid)),
    { initialValue: !this.profileForm.valid },
  );

  isFormPristine = toSignal(
    this.profileForm.valueChanges.pipe(map(() => this.profileForm.pristine)),
    { initialValue: this.profileForm.pristine },
  );

  confirmationButtons = [
    {
      text: 'No, stay public',
      role: STAY_PUBLIC,
    },
    {
      text: 'Yes, go private',
      role: GO_PRIVATE,
    },
  ];

  openConfirmationDialog(): void {
    this.isOpen.set(true);
  }

  handleGoPrivateConfirmation(event: CustomEvent<OverlayEventDetail>): void {
    const role = event.detail.role;

    if (role === GO_PRIVATE) {
      this.goPrivate.emit();
    }

    this.isOpen.set(false);
  }

  saveProfile(): void {
    const { city, displayName, about } = this.profileForm.value;

    const publicUser = this.publicUser();
    if (publicUser) {
      this.submitPublicUser.emit({
        ...publicUser,
        city: city ?? '',
        displayName: displayName ? displayName : publicUser.displayName,
        about: about || '',
      });
    }
  }
}
