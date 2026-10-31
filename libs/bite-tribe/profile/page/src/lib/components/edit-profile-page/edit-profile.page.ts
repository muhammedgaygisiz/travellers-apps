import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSpinner,
  IonTextarea,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { PublicUser } from 'model';
import { normalizePronouns, PRONOUNS_MAX_LENGTH } from 'model';
import type { IonToggleCustomEvent, OverlayEventDetail } from '@ionic/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ToggleChangeEventDetail } from '@ionic/angular';
import { ImageUploadComponent } from 'image-upload';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

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
    IonText,
    IonButton,
    IonAlert,
    IonToggle,
    IonModal,
    IonSpinner,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    ImageUploadComponent,
    TranslocoPipe,
  ],
})
export class EditProfilePage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);

  profileImageSelectionModal = viewChild<IonModal>(
    'profileImageSelectionModal',
  );

  isAuthenticated = input(false);

  publicUser = input<PublicUser>();
  showEmailVerificationPrompt = input(false);
  emailVerificationResendRunning = input(false);

  submitPublicUser = output<PublicUser>();
  resendEmailVerification = output<void>();

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
  failedProfileImageUrl = signal<string | null>(null);
  readonly pronounsMaxLength = PRONOUNS_MAX_LENGTH;
  profileForm = this.formBuilder.group({
    displayName: [''],
    fullName: [''],
    // Refused rather than cut off at the limit: a `maxlength` on the input would
    // drop the end of what was typed without saying so (issue #1826).
    pronouns: ['', Validators.maxLength(PRONOUNS_MAX_LENGTH)],
    city: [''],
    about: [''],
    email: ['', Validators.required],
    public: [false],
    photoUrl: [''],
  });

  /**
   * Shows the length error as soon as the value is too long, not on blur, so
   * the user reads why Save went disabled while still typing.
   */
  private readonly pronounsTouchedOnInvalid =
    this.profileForm.controls.pronouns.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const control = this.profileForm.controls.pronouns;

        if (control.invalid) {
          control.markAsTouched();
        }
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
      text: this.transloco.translate('no-stay-public'),
      role: STAY_PUBLIC,
    },
    {
      text: this.transloco.translate('yes-go-private'),
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
      fullName,
      pronouns,
      about,
      public: isPublic,
      email,
      photoUrl,
    } = this.profileForm.value;

    const publicUser = this.publicUser();
    if (publicUser) {
      const updatedUser = {
        ...publicUser,
        city: city ?? '',
        displayName: displayName ? displayName : publicUser.displayName,
        fullName: fullName || '',
        pronouns: normalizePronouns(pronouns),
        about: about || '',
        email: email || '',
        public: isPublic || false,
        photoUrl: photoUrl || '',
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

  cancel(): void {
    this.profileImageSelectionModal()?.dismiss(null, 'cancel');
  }

  dismissImageModal(): void {
    this.profileImageSelectionModal()?.dismiss();
  }

  shouldShowProfileImage(photoUrl: string | null | undefined): boolean {
    return !!photoUrl && photoUrl !== this.failedProfileImageUrl();
  }

  handleProfileImageLoad(): void {
    this.failedProfileImageUrl.set(null);
  }

  handleProfileImageError(photoUrl: string | null | undefined): void {
    this.failedProfileImageUrl.set(photoUrl || null);
  }
}
