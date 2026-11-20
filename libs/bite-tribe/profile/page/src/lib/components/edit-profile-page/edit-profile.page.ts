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
import { photoRefusalReasonKey } from 'bite-tribe-common/bite';
import { isBase64String } from 'utils';

const STAY_PUBLIC = 'stay-public';
const GO_PRIVATE = 'go-private';
const KEEP_PRIVATE = 'keep-private';
const GO_PUBLIC = 'go-public';

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
  /** A save is being written; Save Changes waits for it (issue #1953). */
  saving = input(false);
  /**
   * How many requests to follow the profile are pending (GitHub issue #2168).
   * Making a private profile public accepts every one of them, so the switch
   * asks first when there is at least one.
   */
  pendingFollowRequestCount = input(0);
  showEmailVerificationPrompt = input(false);
  emailVerificationResendRunning = input(false);

  submitPublicUser = output<PublicUser>();
  resendEmailVerification = output<void>();

  /**
   * The form is filled from the profile only until the user changes it. The
   * store hands over a new copy of the profile whenever any of it is written -
   * the email verification sync does so while this page is open - and
   * patching that in replaced what was being edited: a photo picked here was
   * gone again by the time Save Changes was pressed (GitHub issue #1953).
   */
  setDisplayNameEffect = effect(() => {
    const publicUser = this.publicUser();

    if (this.profileForm.pristine) {
      this.profileForm.patchValue({
        displayName: publicUser?.displayName || 'Anonymous',
      });
    }
  });

  profileEffect = afterRenderEffect(() => {
    const publicUser = this.publicUser();

    if (publicUser && this.profileForm.pristine) {
      this.profileForm.patchValue(publicUser);
    }
  });

  isOpen = signal(false);
  /** The switch to public is waiting on the owner's go-ahead (issue #2168). */
  isGoPublicOpen = signal(false);
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

  private readonly photoValue = toSignal(
    this.profileForm.controls.photoUrl.valueChanges,
    { initialValue: this.profileForm.controls.photoUrl.value },
  );

  /**
   * The image check refused the last photo, and no other has been picked
   * since (GitHub issue #2140). Picking one replaces the notice; saving it
   * starts a new upload.
   */
  readonly photoRefused = computed(
    (): boolean =>
      this.publicUser()?.photoStatus === 'refused' &&
      !isBase64String(this.photoValue() ?? ''),
  );

  /**
   * Whether the profile still shows a photo while one is refused. A refused
   * upload leaves the previous photo in place; a photo refused by the check
   * of stored photos (GitHub issue #2143) was the one shown, so none is left.
   */
  private readonly refusedPhotoKept = computed(
    (): boolean => !!this.publicUser()?.photoUrl,
  );

  /** What the refusal notice says, depending on whether a photo is kept. */
  readonly refusalNoticeKeys = computed(() =>
    this.refusedPhotoKept()
      ? {
          title: 'profile-photo-refused',
          note: 'profile-photo-refused-not-shown',
        }
      : {
          title: 'profile-photo-refused-removed',
          note: 'profile-photo-refused-removed-not-shown',
        },
  );

  /** Why the image check refused the photo, as a line of copy. */
  readonly refusalReasonKey = computed((): string =>
    photoRefusalReasonKey(this.publicUser()?.photoRefusalCategory),
  );

  /** Opens the photo picker, as tapping the photo does. */
  openPhotoPicker(): void {
    void this.profileImageSelectionModal()?.present();
  }

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

  /**
   * The roles of the go-public alert's buttons. Their text is translated in
   * the template through the pipe, so it follows the translations when they
   * load after the page was created.
   */
  readonly keepPrivateRole = KEEP_PRIVATE;
  readonly goPublicRole = GO_PUBLIC;

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

  /**
   * Cancelling, or dismissing the alert any other way, puts the switch back to
   * private, so the requests stay pending (GitHub issue #2168).
   */
  handleGoPublicConfirmation(event: CustomEvent<OverlayEventDetail>): void {
    if (event.detail.role !== GO_PUBLIC) {
      this.profileForm.patchValue({ public: false });
    }

    this.isGoPublicOpen.set(false);
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

      return;
    }

    // Only a profile that is private now has requests the switch would accept.
    if (
      this.publicUser()?.public !== true &&
      this.pendingFollowRequestCount() > 0
    ) {
      this.isGoPublicOpen.set(true);
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
