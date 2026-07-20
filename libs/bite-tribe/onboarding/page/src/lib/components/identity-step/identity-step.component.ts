import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
} from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PublicUser } from 'model';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImageUploadComponent } from 'image-upload';

export interface OnboardingIdentityDraft {
  displayName: string;
  photoUrl: string;
}

export type DisplayNameAvailabilityState =
  'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

@Component({
  selector: 'onboarding-identity-step',
  templateUrl: './identity-step.component.html',
  styleUrl: './identity-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonModal,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
    ImageUploadComponent,
    TranslocoPipe,
  ],
})
export class IdentityStepComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  profile = input<PublicUser | undefined>();
  availability = input<DisplayNameAvailabilityState>('idle');

  identityChange = output<OnboardingIdentityDraft>();
  checkDisplayName = output<string>();

  private readonly imageModal = viewChild<IonModal>('imageModal');

  /** Latest photo URL that failed to load, so the avatar falls back to the icon. */
  private readonly failedPhotoUrl = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', this.displayNameAvailabilityValidator()],
    photoUrl: [''],
  });

  private readonly profileEffect = effect(() => {
    const profile = this.profile();
    untracked(() => {
      // The profile resolves asynchronously, so it can land after the user has
      // already started typing. Prefilling then would silently overwrite their
      // input and leave the availability check racing a value they never
      // entered, so only prefill while the form is still untouched.
      if (this.form.dirty) {
        return;
      }

      this.form.patchValue(
        {
          displayName: profile?.displayName || '',
          photoUrl: profile?.photoUrl || '',
        },
        { emitEvent: false },
      );
    });
  });

  /**
   * Re-run validation whenever the service-owned availability result changes so
   * the display-name control reflects it and Ionic's native invalid styling
   * drives the input frame. The check itself lives in the service; the validator
   * only mirrors its outcome. Marking the control touched lets Ionic show the
   * state immediately instead of waiting for a blur.
   */
  private readonly availabilityEffect = effect(() => {
    this.availability();
    const control = this.form.controls.displayName;
    control.updateValueAndValidity({ emitEvent: false });
    if (control.invalid) {
      control.markAsTouched();
    }
  });

  /**
   * Maps the availability signal to a control error. It is a validator rather
   * than an imperative `setErrors` so a value change re-derives the error from
   * the current availability instead of silently clearing it.
   */
  private displayNameAvailabilityValidator(): ValidatorFn {
    return () => {
      const state = this.availability();
      return state === 'taken' || state === 'invalid' || state === 'error'
        ? { [state]: true }
        : null;
    };
  }

  /** Shows the chosen photo unless it is missing or last failed to load. */
  shouldShowProfileImage(photoUrl: string | null | undefined): boolean {
    return !!photoUrl && photoUrl !== this.failedPhotoUrl();
  }

  handleProfileImageLoad(): void {
    this.failedPhotoUrl.set(null);
  }

  handleProfileImageError(photoUrl: string | null | undefined): void {
    this.failedPhotoUrl.set(photoUrl || null);
  }

  /** Dismisses without keeping edits made in the modal. */
  cancelImageSelection(): void {
    this.imageModal()?.dismiss(null, 'cancel');
  }

  /** Confirms the chosen photo; the form control already holds the value. */
  confirmImageSelection(): void {
    this.imageModal()?.dismiss();
  }

  constructor() {
    this.form.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const draft = {
          displayName: (value.displayName ?? '').trim(),
          photoUrl: value.photoUrl ?? '',
        };

        this.identityChange.emit(draft);
      });

    this.form.controls.displayName.valueChanges
      .pipe(
        map((displayName) => displayName.trim()),
        debounceTime(250),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((displayName) => {
        if (displayName) {
          this.checkDisplayName.emit(displayName);
        }
      });
  }
}
