import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Outcome of the location permission request, as far as the step is concerned.
 *
 * `unsupported` covers surfaces with no OS prompt of their own (the web build,
 * where the browser asks on the first read), where the step still has to be
 * acknowledged but nothing can be granted here.
 */
export type LocationPermissionState =
  'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

/**
 * Location onboarding step. It explains what the device position is used for —
 * the nearby feed, the map, distance to a Bite, and tagging new Bites — before
 * the OS prompt appears, then reports the outcome.
 *
 * Denial is a valid, final answer: the step stays completable and the copy
 * acknowledges the choice instead of pushing the user back to the prompt, which
 * the OS would not show a second time anyway (epic #850, issue #1023).
 *
 * The step also collects the home city the profile displays next to the name.
 * It is a different thing from the device position — one is a place the user
 * identifies with, the other is where the phone happens to be — and the copy
 * separates them, but they belong to the same question well enough that a
 * seven-step assistant does not need an eighth step for it (issue #1271).
 *
 * The home city is optional and never gates the step: an empty value is the
 * user declining, which the profile renders as no location line at all rather
 * than as missing data (issue #1270).
 */
@Component({
  selector: 'onboarding-location-step',
  templateUrl: './location-step.component.html',
  styleUrl: './location-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonSpinner,
    TranslocoPipe,
  ],
})
export class LocationStepComponent {
  private readonly destroyRef = inject(DestroyRef);

  permission = input<LocationPermissionState>('idle');
  homeCity = input<string>('');
  /**
   * The visibility chosen one step earlier, so the step can say who actually
   * gets to see the home city instead of leaving the privacy weight implicit.
   */
  isPublicProfile = input<boolean | null>(false);

  enableLocation = output<void>();
  skipLocation = output<void>();
  homeCityChange = output<string>();

  protected readonly homeCityControl = new FormControl('', {
    nonNullable: true,
  });

  private readonly homeCityEffect = effect(() => {
    const homeCity = this.homeCity();
    untracked(() => {
      // The profile resolves asynchronously, so it can land after the user has
      // started typing. Prefilling then would overwrite their input, so only a
      // still-untouched control is patched.
      if (this.homeCityControl.dirty) {
        return;
      }

      this.homeCityControl.setValue(homeCity, { emitEvent: false });
    });
  });

  constructor() {
    this.homeCityControl.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe((city) => this.homeCityChange.emit(city.trim()));
  }

  /**
   * Copy naming who actually gets to see the home city. The visibility chosen
   * one step earlier decides it, so the privacy weight of a publicly displayed
   * field is stated rather than left for the user to infer (issue #1271).
   */
  protected visibilityNoteKey(): string {
    return this.isPublicProfile()
      ? 'onboarding-home-city-visibility-public'
      : 'onboarding-home-city-visibility-private';
  }

  protected isDecided(): boolean {
    const permission = this.permission();

    return (
      permission === 'granted' ||
      permission === 'denied' ||
      permission === 'unsupported'
    );
  }

  protected isRequesting(): boolean {
    return this.permission() === 'requesting';
  }
}
