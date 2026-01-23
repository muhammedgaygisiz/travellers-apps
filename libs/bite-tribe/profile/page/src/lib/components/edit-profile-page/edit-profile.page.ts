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
  IonToggle,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { PublicUser } from 'model';
import type { IonToggleCustomEvent, OverlayEventDetail } from '@ionic/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ToggleChangeEventDetail } from '@ionic/angular';

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
    IonToggle,
  ],
})
export class EditProfilePage {
  private readonly formBuilder = inject(FormBuilder);

  isAuthenticated = input(false);

  publicUser = input<PublicUser>();

  submitPublicUser = output<PublicUser>();

  setDisplayNameEffect = effect(() => {
    const publicUser = this.publicUser();

    this.profileForm.patchValue({
      displayName: publicUser?.displayName || 'Anonymous',
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
    email: ['', Validators.required],
    public: [false],
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
    if (event.detail.role === GO_PRIVATE) {
      this.profileForm.patchValue({ public: false });
    } else {
      this.profileForm.patchValue({ public: true });
    }

    this.isOpen.set(false);
  }

  saveProfile(): void {
    const {
      city,
      displayName,
      about,
      public: isPublic,
      email,
    } = this.profileForm.value;

    const publicUser = this.publicUser();
    if (publicUser) {
      const updatedUser = {
        ...publicUser,
        city: city ?? '',
        displayName: displayName ? displayName : publicUser.displayName,
        about: about || '',
        email: email || '',
        public: isPublic || false,
      };

      this.submitPublicUser.emit(updatedUser);
    }
  }

  handlePubicChange(
    $event: IonToggleCustomEvent<ToggleChangeEventDetail>,
  ): void {
    if (!$event.detail.checked) {
      this.openConfirmationDialog();
    }
  }
}
