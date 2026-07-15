import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonInput, IonSpinner, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PublicUser } from 'model';
import { debounceTime, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImageUploadComponent } from 'image-upload';

export interface OnboardingIdentityDraft {
  displayName: string;
  photoUrl: string;
}

export type DisplayNameAvailabilityState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'error';

@Component({
  selector: 'onboarding-identity-step',
  templateUrl: './identity-step.component.html',
  styleUrl: './identity-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonSpinner,
    IonText,
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

  readonly form = this.formBuilder.nonNullable.group({
    displayName: [''],
    photoUrl: [''],
  });

  private readonly profileEffect = effect(() => {
    const profile = this.profile();
    this.form.patchValue(
      {
        displayName: profile?.displayName || '',
        photoUrl: profile?.photoUrl || '',
      },
      { emitEvent: true },
    );
  });

  constructor() {
    this.form.valueChanges
      .pipe(
        startWith(this.form.getRawValue()),
        debounceTime(250),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        const draft = {
          displayName: (value.displayName ?? '').trim(),
          photoUrl: value.photoUrl ?? '',
        };

        this.identityChange.emit(draft);

        if (draft.displayName) {
          this.checkDisplayName.emit(draft.displayName);
        }
      });
  }
}
